import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://127.0.0.1:8000/api";

interface Role {
    id: number;
    code: string;
    libelle: string;
    statut: string;
    permissions: string[];
}

const permissionsList = [
    { id: "create", label: "Créer" },
    { id: "read", label: "Lire" },
    { id: "update", label: "Modifier" },
    { id: "delete", label: "Supprimer" }
];

const GestionRoles = () => {
    const { toast } = useToast();
    const [roles, setRoles] = useState<Role[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

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

    const fetchRoles = async () => {
        if (!token) {
            toast({ title: "Erreur", description: "Token manquant, reconnectez-vous.", variant: "destructive" });
            return;
        }

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
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!code || !libelle) {
            toast({ title: "Erreur", description: "Le code et le libelle sont obligatoires.", variant: "destructive" });
            return;
        }

        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `${API_URL}/roles/${editingId}` : `${API_URL}/roles`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ code, libelle, statut, permissions: selectedPermissions })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData?.error || `Erreur ${res.status}`);
            }

            toast({ title: editingId ? "Rôle mis à jour" : "Rôle créé", description: "Opération réussie" });
            resetForm();
            setShowForm(false);
            fetchRoles();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Erreur", description: error.message || "Impossible de sauvegarder le rôle.", variant: "destructive" });
        }
    };

    const togglePermission = (id: string) => {
        setSelectedPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
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
        if (!confirm("Voulez-vous vraiment supprimer ce rôle ?")) return;

        try {
            const res = await fetch(`${API_URL}/roles/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error(`Erreur ${res.status}`);
            toast({ title: "Rôle supprimé", description: "Le rôle a été retiré." });
            fetchRoles();
        } catch (err) {
            console.error(err);
            toast({ title: "Erreur", description: "Impossible de supprimer ce rôle.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Gestion des Rôles</h1>
                    <p className="text-muted-foreground">Configuration des rôles et permissions</p>
                </div>
                <Button className="gap-2" onClick={() => { resetForm(); setShowForm(true); }}>
                    <Plus className="w-4 h-4" /> Nouveau rôle
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingId ? "Modifier un rôle" : "Créer un rôle"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Code du rôle *</Label>
                                <Input value={code} onChange={(e) => setCode(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Libelle du rôle *</Label>
                                <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Permissions</Label>
                                <div className="border rounded-lg p-4 space-y-2">
                                    {permissionsList.map(permission => (
                                        <div key={permission.id} className="flex items-center gap-2">
                                            <Checkbox
                                                checked={selectedPermissions.includes(permission.id)}
                                                onCheckedChange={() => togglePermission(permission.id)}
                                            />
                                            <span>{permission.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Statut</Label>
                                <Select value={statut || "actif"} onValueChange={setStatut}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="actif">Actif</SelectItem>
                                        <SelectItem value="inactif">Inactif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="submit" className="gap-2">
                                    <Save className="w-4 h-4" /> Enregistrer
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            )}

            <Card>
                <CardHeader><CardTitle>Liste des rôles</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full text-sm border rounded-lg">
                        <thead className="bg-muted">
                        <tr>
                            <th className="p-3 text-left">Code</th>
                            <th className="p-3 text-left">Libelle</th>
                            <th className="p-3 text-left">Permissions</th>
                            <th className="p-3 text-left">Statut</th>
                            <th className="p-3 text-left">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {roles.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-3 text-center text-muted-foreground">Aucun rôle</td>
                            </tr>
                        )}
                        {roles.map(role => (
                            <tr key={role.id} className="border-t">
                                <td className="p-3">{role.code}</td>
                                <td className="p-3">{role.libelle}</td>
                                <td className="p-3">{role.permissions.join(", ")}</td>
                                <td className="p-3">{role.statut}</td>
                                <td className="p-3 flex gap-2">
                                    <Button variant="outline" size="icon" onClick={() => handleEdit(role)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDelete(role.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
};

export default GestionRoles;
