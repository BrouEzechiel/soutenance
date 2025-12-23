import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Plus, Trash2, Pencil, Shield, Loader2, Eye, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const API_URL = "http://127.0.0.1:8000/api";

interface Role {
    id: number;
    code: string;
    libelle: string;
    statut: string;
    permissions: string[];
}

interface Permission {
    id: number;
    code: string;
    roles_count?: number;
}

// Mapping des permissions pour un affichage plus user-friendly
const permissionLabels: Record<string, string> = {
    "read": "Lecture",
    "write": "Écriture",
    "update": "Modification",
    "delete": "Suppression",
    "create": "Création"
};

const GestionRoles = () => {
    const { toast } = useToast();
    const [roles, setRoles] = useState<Role[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    // Form fields
    const [code, setCode] = useState("");
    const [libelle, setLibelle] = useState("");
    const [statut, setStatut] = useState("actif");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    const token = localStorage.getItem("token");

    const resetForm = () => {
        setEditingId(null);
        setCode("");
        setLibelle("");
        setStatut("actif");
        setSelectedPermissions([]);
    };

    const fetchPermissions = async () => {
        if (!token) return;

        setLoadingPermissions(true);
        try {
            // CORRECTION ICI : Utiliser /api/permissions au lieu de /api/roles/permissions
            const res = await fetch(`${API_URL}/permissions`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setAvailablePermissions(data);
            } else if (res.status === 404) {
                // Si l'endpoint n'existe pas encore
                console.warn("Endpoint /api/permissions non trouvé. Utilisation des permissions par défaut.");

                // Tester d'abord les permissions courantes
                const testPermissions = ["read", "write", "update", "delete"];
                const existingPermissions: Permission[] = [];

                // Tester chaque permission via l'API de création de rôle
                for (const perm of testPermissions) {
                    existingPermissions.push({
                        id: existingPermissions.length + 1,
                        code: perm,
                        roles_count: 0
                    });
                }

                setAvailablePermissions(existingPermissions);
            }
        } catch (error) {
            console.error("Erreur lors du chargement des permissions", error);
            // En cas d'erreur, utiliser les permissions par défaut
            const defaultPermissions: Permission[] = [
                { id: 1, code: "read", roles_count: 0 },
                { id: 2, code: "write", roles_count: 0 },
                { id: 3, code: "update", roles_count: 0 },
                { id: 4, code: "delete", roles_count: 0 }
            ];
            setAvailablePermissions(defaultPermissions);
        } finally {
            setLoadingPermissions(false);
        }
    };

    const fetchRoles = async () => {
        if (!token) {
            toast({ title: "Erreur", description: "Token manquant, reconnectez-vous.", variant: "destructive" });
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/roles`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.status === 401) {
                toast({ title: "Erreur", description: "Non autorisé, reconnectez-vous.", variant: "destructive" });
                return;
            }

            const data = await res.json();
            setRoles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Erreur lors du chargement des rôles", error);
            toast({ title: "Erreur", description: "Impossible de charger les rôles.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
        fetchPermissions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!code || !libelle) {
            toast({ title: "Erreur", description: "Le code et le libellé sont obligatoires.", variant: "destructive" });
            return;
        }

        // Normaliser les codes de permissions (en minuscules)
        const normalizedPermissions = selectedPermissions.map(p => p.toLowerCase());

        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `${API_URL}/roles/${editingId}` : `${API_URL}/roles`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: code.trim(),
                    libelle: libelle.trim(),
                    statut,
                    permissions: normalizedPermissions
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData?.error || `Erreur ${res.status}`);
            }

            const result = await res.json();

            toast({
                title: editingId ? "Rôle mis à jour" : "Rôle créé",
                description: result.message || "Opération réussie",
                variant: "default"
            });

            resetForm();
            setShowForm(false);
            fetchRoles();
            fetchPermissions(); // Recharger les permissions pour voir les nouvelles
        } catch (error: any) {
            console.error("Détails de l'erreur:", error);

            let errorMessage = error.message || "Impossible de sauvegarder le rôle.";

            // Messages d'erreur plus user-friendly
            if (errorMessage.includes("Code déjà utilisé")) {
                errorMessage = "Ce code de rôle est déjà utilisé. Veuillez en choisir un autre.";
            } else if (errorMessage.includes("Permissions invalides")) {
                errorMessage = "Certaines permissions spécifiées sont invalides.";
            } else if (errorMessage.includes("401")) {
                errorMessage = "Session expirée. Veuillez vous reconnecter.";
            }

            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const togglePermission = (permissionCode: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionCode)
                ? prev.filter(p => p !== permissionCode)
                : [...prev, permissionCode]
        );
    };

    const handleEdit = (role: Role) => {
        setEditingId(role.id);
        setCode(role.code);
        setLibelle(role.libelle);
        setStatut(role.statut);
        setSelectedPermissions(role.permissions);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!token) return;
        if (!confirm("Voulez-vous vraiment supprimer ce rôle ? Cette action est irréversible.")) return;

        try {
            const res = await fetch(`${API_URL}/roles/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const result = await res.json();

            if (!res.ok) {
                let errorMessage = result?.error || `Erreur ${res.status}`;
                if (errorMessage.includes("assigné à des utilisateurs")) {
                    errorMessage = "Ce rôle ne peut pas être supprimé car il est assigné à des utilisateurs.";
                }
                throw new Error(errorMessage);
            }

            toast({
                title: "Rôle supprimé",
                description: result.message || "Le rôle a été supprimé avec succès.",
                variant: "default"
            });
            fetchRoles();
            fetchPermissions();
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de supprimer ce rôle.",
                variant: "destructive"
            });
        }
    };

    const handleRefresh = () => {
        fetchRoles();
        fetchPermissions();
        toast({
            title: "Rafraîchissement",
            description: "Listes mises à jour",
        });
    };

    const handleSelectAllPermissions = () => {
        if (selectedPermissions.length === displayPermissions.length) {
            // Si tout est déjà sélectionné, tout désélectionner
            setSelectedPermissions([]);
        } else {
            // Sinon, tout sélectionner
            setSelectedPermissions(displayPermissions.map(p => p.code));
        }
    };

    // Permissions à afficher
    const displayPermissions = availablePermissions.length > 0
        ? availablePermissions
        : [
            { id: 1, code: "read", roles_count: 0 },
            { id: 2, code: "write", roles_count: 0 },
            { id: 3, code: "update", roles_count: 0 },
            { id: 4, code: "delete", roles_count: 0 }
        ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'actif':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-300">Actif</Badge>;
            case 'inactif':
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-300">Inactif</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPermissionLabel = (code: string) => {
        return permissionLabels[code] || code.charAt(0).toUpperCase() + code.slice(1);
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 md:w-7 md:h-7" />
                        Gestion des Rôles
                    </h1>
                    <p className="text-muted-foreground mt-1">Configuration des rôles et permissions système</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        className="gap-2"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </Button>
                    <Button
                        className="gap-2"
                        onClick={() => { resetForm(); setShowForm(true); }}
                    >
                        <Plus className="w-4 h-4" /> Nouveau rôle
                    </Button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit}>
                    <Card className="border-2 border-primary/20">
                        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                {editingId ? "Modifier un rôle" : "Créer un rôle"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Code du rôle *</Label>
                                    <Input
                                        id="code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="Ex: ROLE_ADMIN, ROLE_USER"
                                        required
                                        className="focus:ring-2 focus:ring-primary"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Doit être unique, en majuscules avec des underscores
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="libelle">Libellé du rôle *</Label>
                                    <Input
                                        id="libelle"
                                        value={libelle}
                                        onChange={(e) => setLibelle(e.target.value)}
                                        placeholder="Ex: Administrateur, Utilisateur standard"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Permissions</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSelectAllPermissions}
                                        className="text-xs h-7"
                                    >
                                        {selectedPermissions.length === displayPermissions.length
                                            ? "Tout désélectionner"
                                            : "Tout sélectionner"}
                                    </Button>
                                </div>
                                {loadingPermissions ? (
                                    <div className="flex items-center justify-center p-8 border rounded-lg">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        <span className="ml-2">Chargement des permissions...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="border rounded-lg p-4 space-y-2 bg-card">
                                            {displayPermissions.map(permission => (
                                                <div key={permission.id} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            id={`perm-${permission.code}`}
                                                            checked={selectedPermissions.includes(permission.code)}
                                                            onCheckedChange={() => togglePermission(permission.code)}
                                                        />
                                                        <Label
                                                            htmlFor={`perm-${permission.code}`}
                                                            className="font-medium cursor-pointer select-none flex items-center gap-2"
                                                        >
                                                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                                                {permission.code}
                                                            </span>
                                                            <span>{getPermissionLabel(permission.code)}</span>
                                                        </Label>
                                                    </div>
                                                    {permission.roles_count !== undefined && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {permission.roles_count} rôle(s)
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm text-muted-foreground">
                                                {selectedPermissions.length} permission(s) sélectionnée(s)
                                            </p>
                                            <p className="text-xs text-muted-foreground text-right max-w-md">
                                                ✅ Les permissions seront créées automatiquement si elles n'existent pas encore
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Statut</Label>
                                <Select value={statut} onValueChange={setStatut}>
                                    <SelectTrigger className="w-full md:w-1/3">
                                        <SelectValue placeholder="Sélectionner un statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="actif">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                Actif
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="inactif">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                Inactif
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    className="gap-2 bg-primary hover:bg-primary/90"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            En cours...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {editingId ? "Mettre à jour" : "Créer le rôle"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            )}

            <Card>
                <CardHeader className="border-b">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            Liste des rôles
                            <Badge variant="outline" className="ml-2">
                                {roles.length} rôle(s)
                            </Badge>
                        </CardTitle>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {loading && (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Chargement...
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">Chargement des rôles...</p>
                        </div>
                    ) : roles.length === 0 ? (
                        <div className="text-center py-12">
                            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Aucun rôle trouvé</h3>
                            <p className="text-muted-foreground mb-4">
                                Commencez par créer votre premier rôle en cliquant sur "Nouveau rôle"
                            </p>
                            <Button onClick={() => setShowForm(true)} className="gap-2">
                                <Plus className="w-4 h-4" /> Créer un rôle
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                <tr>
                                    <th className="p-4 text-left font-semibold">Code</th>
                                    <th className="p-4 text-left font-semibold">Libellé</th>
                                    <th className="p-4 text-left font-semibold">Permissions</th>
                                    <th className="p-4 text-left font-semibold">Statut</th>
                                    <th className="p-4 text-left font-semibold">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {roles.map(role => (
                                    <tr key={role.id} className="border-t hover:bg-muted/30 transition-colors">
                                        <td className="p-4">
                                            <div className="font-mono font-semibold text-primary bg-primary/10 px-3 py-1 rounded inline-block">
                                                {role.code}
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium">{role.libelle}</td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1 max-w-[300px]">
                                                {role.permissions.length > 0 ? (
                                                    role.permissions.map(perm => (
                                                        <Badge
                                                            key={perm}
                                                            variant="secondary"
                                                            className="text-xs"
                                                            title={getPermissionLabel(perm)}
                                                        >
                                                            {perm}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">
                                                        Aucune permission
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(role.statut)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(role)}
                                                    className="gap-1"
                                                >
                                                    <Pencil className="w-3 h-3" /> Modifier
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(role.id)}
                                                    className="gap-1"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Supprimer
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default GestionRoles;