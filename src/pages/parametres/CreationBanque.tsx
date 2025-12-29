import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Save,
    Plus,
    Pencil,
    Trash2,
    X,
    CheckCircle,
    XCircle,
    Eye,
    Building,
    Phone,
    Mail,
    User,
    MapPin,
    RefreshCw,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Allow access to Vite env in this file
declare global {
    interface ImportMetaEnv {
        VITE_API_BASE_URL?: string;
    }
    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

const API_BASE_URL = "http://127.0.0.1:8000/api";
const API_BASE = (import.meta.env as any).VITE_API_BASE_URL ?? API_BASE_URL;
const api = (path: string) => `${API_BASE}/${path.replace(/^\//, "")}`;
const API_URL = api("banques");

const getAuthHeaders = (contentType: string | null = "application/json"): HeadersInit => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
        Accept: "application/json",
    };

    if (contentType) {
        headers["Content-Type"] = contentType;
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
};

async function safeJson(res: Response) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function fetchJson(url: string, options: RequestInit = {}, navigate?: any) {
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) } as HeadersInit;
    const resp = await fetch(url, { ...options, headers });
    const data = await safeJson(resp);

    if (resp.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.setItem("isAuthenticated", "false");
        if (navigate) navigate("/login");
        const err: any = new Error("Unauthorized");
        err.status = 401;
        err.data = data;
        throw err;
    }

    if (!resp.ok) {
        const err: any = new Error("Request error");
        err.status = resp.status;
        err.data = data;
        throw err;
    }

    return data;
}

type Banque = {
    id: number;
    nom: string;
    codeBanque: string;
    adresse: string | null;
    telephone: string | null;
    email: string | null;
    responsable: string | null;
    statut: "ACTIF" | "INACTIF";
    estActif: boolean;
    nbComptes: number;
    nbComptesActifs: number;
    totalSoldesNum: number;
    totalSoldesFormate: string;
    createdAt: string;
    updatedAt: string;
};

type FormState = {
    nom: string;
    codeBanque: string;
    adresse: string;
    telephone: string;
    email: string;
    responsable: string;
    statut: "ACTIF" | "INACTIF";
};

type PaginationMeta = {
    total: number;
    page: number;
    limit: number;
    pages: number;
};

const CreationBanque = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [banques, setBanques] = useState<Banque[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>({
        nom: "",
        codeBanque: "",
        adresse: "",
        telephone: "",
        email: "",
        responsable: "",
        statut: "ACTIF",
    });

    // États pour la pagination et filtres
    const [pagination, setPagination] = useState<PaginationMeta>({
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
    });
    const [statutFilter, setStatutFilter] = useState<string>("ALL"); // Modifié: "ALL" au lieu de ""
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // États pour les dialogues
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [banqueToDelete, setBanqueToDelete] = useState<Banque | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedBanque, setSelectedBanque] = useState<Banque | null>(null);
    const [activateDialogOpen, setActivateDialogOpen] = useState(false);
    const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    const [banqueToToggle, setBanqueToToggle] = useState<Banque | null>(null);

    const resetForm = () => {
        setEditingId(null);
        setForm({
            nom: "",
            codeBanque: "",
            adresse: "",
            telephone: "",
            email: "",
            responsable: "",
            statut: "ACTIF",
        });
    };

    const fetchBanques = async (page = pagination.page, search = searchTerm, statut = statutFilter) => {
        setLoading(true);
        try {
            let url = `${API_URL}?page=${page}&limit=${pagination.limit}`;
            // Si statut n'est pas "ALL", ajouter le filtre
            if (statut && statut !== "ALL") url += `&statut=${statut}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const data = await fetchJson(url, {}, navigate);

            if (data.success) {
                setBanques(data.data || []);
                setPagination(data.meta || {
                    total: data.total || 0,
                    page: page,
                    limit: pagination.limit,
                    pages: 0
                });
            } else {
                throw new Error(data.message || "Erreur inconnue");
            }
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de charger les banques.",
                variant: "destructive"
            });
            setBanques([]);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const fetchBanquesActives = async () => {
        try {
            const data = await fetchJson(api("banques/actives"), {}, navigate);
            return data.success ? data.data : [];
        } catch (err) {
            console.error(err);
            return [];
        }
    };

    useEffect(() => {
        fetchBanques();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (value: string) => {
        setForm(prev => ({ ...prev, statut: value as "ACTIF" | "INACTIF" }));
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!form.nom.trim()) {
            errors.push("Le nom de la banque est obligatoire");
        }

        if (!form.codeBanque.trim()) {
            errors.push("Le code banque est obligatoire");
        }

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.push("L'adresse email n'est pas valide");
        }

        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errors = validateForm();
        if (errors.length > 0) {
            toast({
                title: "Erreur de validation",
                description: errors.join(" • "),
                variant: "destructive"
            });
            return;
        }

        const url = editingId ? api(`banques/${editingId}`) : API_URL;
        const method = editingId ? "PUT" : "POST";

        const payload = {
            nom: form.nom,
            codeBanque: form.codeBanque,
            adresse: form.adresse || null,
            telephone: form.telephone || null,
            email: form.email || null,
            responsable: form.responsable || null,
            statut: form.statut,
        };

        try {
            const data = await fetchJson(url, {
                method,
                body: JSON.stringify(payload)
            }, navigate);

            toast({
                title: editingId ? "Banque modifiée" : "Banque créée",
                description: data.message || "Opération réussie"
            });

            resetForm();
            setShowForm(false);
            fetchBanques();

        } catch (err: any) {
            console.error(err);
            const msg = err?.data?.errors
                ? (Array.isArray(err.data.errors)
                    ? err.data.errors.join(" • ")
                    : Object.values(err.data.errors).flat().join(" • "))
                : err?.data?.message || err.message || "Impossible d'enregistrer";
            toast({
                title: "Erreur",
                description: msg,
                variant: "destructive"
            });
        }
    };

    const handleEdit = (banque: Banque) => {
        setForm({
            nom: banque.nom,
            codeBanque: banque.codeBanque,
            adresse: banque.adresse || "",
            telephone: banque.telephone || "",
            email: banque.email || "",
            responsable: banque.responsable || "",
            statut: banque.statut,
        });
        setEditingId(banque.id);
        setShowForm(true);
    };

    const handleShowDetails = async (banque: Banque) => {
        setSelectedBanque(banque);
        setDetailsDialogOpen(true);
    };

    const handleToggleStatus = async (banque: Banque, activate: boolean) => {
        const url = api(`banques/${banque.id}/${activate ? 'activate' : 'deactivate'}`);
        const method = 'PATCH';

        try {
            const data = await fetchJson(url, { method }, navigate);

            toast({
                title: activate ? "Banque activée" : "Banque désactivée",
                description: data.message || "Opération réussie"
            });

            fetchBanques();
            setActivateDialogOpen(false);
            setDeactivateDialogOpen(false);

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err?.data?.message || err.message || "Impossible de modifier le statut",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async () => {
        if (!banqueToDelete) return;

        try {
            const data = await fetchJson(api(`banques/${banqueToDelete.id}`), { method: "DELETE" }, navigate);

            toast({
                title: "Banque supprimée",
                description: "Opération réussie"
            });

            fetchBanques();
            setDeleteDialogOpen(false);
            setBanqueToDelete(null);

        } catch (err: any) {
            console.error(err);
            const errorMsg = err?.data?.message || err?.data?.errors || err.message;

            if (err.status === 400 && errorMsg && errorMsg.includes("comptes associés")) {
                toast({
                    title: "Banque non supprimable",
                    description: "La banque ne peut être supprimée car elle a des comptes associés. Voulez-vous la désactiver ?",
                    variant: "destructive",
                    action: (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setBanqueToToggle(banqueToDelete);
                                setDeactivateDialogOpen(true);
                                setDeleteDialogOpen(false);
                            }}
                        >
                            Désactiver
                        </Button>
                    )
                });
                return;
            }

            toast({
                title: "Erreur",
                description: errorMsg || "Impossible de supprimer",
                variant: "destructive"
            });
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPagination(prev => ({ ...prev, page: newPage }));
            fetchBanques(newPage);
        }
    };

    const handleSearch = () => {
        setIsSearching(true);
        fetchBanques(1, searchTerm, statutFilter);
    };

    const handleClearFilters = () => {
        setSearchTerm("");
        setStatutFilter("ALL"); // Réinitialisé à "ALL"
        fetchBanques(1, "", "ALL");
    };

    const getStatutBadge = (statut: string) => {
        if (statut === "ACTIF") {
            return (
                <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> Actif
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-gray-100 text-gray-700">
                <XCircle className="w-3 h-3 mr-1" /> Inactif
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Gestion des Banques</h1>
                        <p className="text-muted-foreground">
                            Création et gestion des banques partenaires
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchBanques()}
                            title="Actualiser"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                            className="gap-2"
                            onClick={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Nouvelle banque
                        </Button>
                    </div>
                </div>

                {/* Filtres */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filtres et recherche
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">Recherche</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="search"
                                        placeholder="Nom, code ou responsable..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                    >
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="statutFilter">Statut</Label>
                                <Select
                                    value={statutFilter}
                                    onValueChange={(value) => {
                                        setStatutFilter(value);
                                        fetchBanques(1, searchTerm, value);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les statuts" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* CORRIGÉ : Utiliser "ALL" au lieu de "" */}
                                        <SelectItem value="ALL">Tous</SelectItem>
                                        <SelectItem value="ACTIF">Actif</SelectItem>
                                        <SelectItem value="INACTIF">Inactif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>&nbsp;</Label>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleClearFilters}
                                >
                                    Réinitialiser les filtres
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Formulaire */}
                {showForm && (
                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>
                                        {editingId ? "Modifier une banque" : "Créer une banque"}
                                    </CardTitle>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setShowForm(false);
                                            resetForm();
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nom">
                                            Nom *
                                            <span className="text-xs text-muted-foreground ml-1">
                                                (ex: BNI, BOA, Ecobank)
                                            </span>
                                        </Label>
                                        <Input
                                            id="nom"
                                            value={form.nom}
                                            onChange={handleChange}
                                            placeholder="Nom de la banque"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="codeBanque">
                                            Code banque *
                                            <span className="text-xs text-muted-foreground ml-1">
                                                (code unique)
                                            </span>
                                        </Label>
                                        <Input
                                            id="codeBanque"
                                            value={form.codeBanque}
                                            onChange={handleChange}
                                            placeholder="Ex: BNI01"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="adresse">Adresse</Label>
                                    <Textarea
                                        id="adresse"
                                        value={form.adresse}
                                        onChange={handleChange}
                                        placeholder="Adresse complète de la banque"
                                        rows={2}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="telephone">Téléphone</Label>
                                        <Input
                                            id="telephone"
                                            value={form.telephone}
                                            onChange={handleChange}
                                            placeholder="+261 XX XX XXX XX"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="contact@banque.mg"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="responsable">Responsable</Label>
                                    <Input
                                        id="responsable"
                                        value={form.responsable}
                                        onChange={handleChange}
                                        placeholder="Nom du responsable"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Statut</Label>
                                    <Select
                                        value={form.statut}
                                        onValueChange={handleSelectChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Ici c'est bon, les values ne sont pas vides */}
                                            <SelectItem value="ACTIF">Actif</SelectItem>
                                            <SelectItem value="INACTIF">Inactif</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Separator />

                                <div className="flex justify-end gap-2">
                                    <Button type="submit" className="gap-2">
                                        <Save className="w-4 h-4" />
                                        {editingId ? "Modifier" : "Créer"}
                                    </Button>
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
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                )}

                {/* Liste des banques */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Liste des banques</CardTitle>
                            <div className="text-sm text-muted-foreground">
                                {pagination.total} banque{pagination.total > 1 ? 's' : ''}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">Chargement des banques...</p>
                            </div>
                        ) : (
                            <>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Nom</TableHead>
                                                <TableHead>Contact</TableHead>
                                                <TableHead>Comptes</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {banques.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8">
                                                        <p className="text-muted-foreground">
                                                            {searchTerm || statutFilter !== "ALL"
                                                                ? "Aucune banque ne correspond aux critères de recherche"
                                                                : "Aucune banque configurée"}
                                                        </p>
                                                        {!searchTerm && statutFilter === "ALL" && (
                                                            <Button
                                                                variant="outline"
                                                                className="mt-2"
                                                                onClick={() => setShowForm(true)}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Créer la première banque
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                banques.map((banque) => (
                                                    <TableRow key={banque.id} className="hover:bg-muted/50">
                                                        <TableCell className="font-mono font-bold">
                                                            {banque.codeBanque}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="font-medium">{banque.nom}</div>
                                                            {banque.responsable && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    <User className="w-3 h-3 inline mr-1" />
                                                                    {banque.responsable}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1 text-sm">
                                                                {banque.telephone && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Phone className="w-3 h-3" />
                                                                        {banque.telephone}
                                                                    </div>
                                                                )}
                                                                {banque.email && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Mail className="w-3 h-3" />
                                                                        <span className="truncate max-w-[150px]">
                                                                            {banque.email}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {banque.adresse && (
                                                                    <div className="flex items-center gap-1">
                                                                        <MapPin className="w-3 h-3" />
                                                                        <span className="truncate max-w-[150px]">
                                                                            {banque.adresse}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="text-sm">
                                                                    <Building className="w-3 h-3 inline mr-1" />
                                                                    {banque.nbComptes} compte{banque.nbComptes > 1 ? 's' : ''}
                                                                    {banque.nbComptesActifs > 0 && (
                                                                        <Badge variant="outline" className="ml-2 text-xs">
                                                                            {banque.nbComptesActifs} actif{banque.nbComptesActifs > 1 ? 's' : ''}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {banque.totalSoldesNum > 0 && (
                                                                    <div className="text-xs text-green-600 font-medium">
                                                                        {banque.totalSoldesFormate}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatutBadge(banque.statut)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleShowDetails(banque)}
                                                                    title="Voir les détails"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(banque)}
                                                                    title="Modifier"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>

                                                                {banque.statut === "ACTIF" ? (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setBanqueToToggle(banque);
                                                                            setDeactivateDialogOpen(true);
                                                                        }}
                                                                        title="Désactiver"
                                                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setBanqueToToggle(banque);
                                                                            setActivateDialogOpen(true);
                                                                        }}
                                                                        title="Activer"
                                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </Button>
                                                                )}

                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setBanqueToDelete(banque);
                                                                        setDeleteDialogOpen(true);
                                                                    }}
                                                                    title="Supprimer"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                {pagination.pages > 1 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-sm text-muted-foreground">
                                            Page {pagination.page} sur {pagination.pages} • {pagination.total} résultat{pagination.total > 1 ? 's' : ''}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page === 1}
                                            >
                                                <ChevronLeft className="w-4 h-4 mr-1" />
                                                Précédent
                                            </Button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                                    let pageNum;
                                                    if (pagination.pages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (pagination.page <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (pagination.page >= pagination.pages - 2) {
                                                        pageNum = pagination.pages - 4 + i;
                                                    } else {
                                                        pageNum = pagination.page - 2 + i;
                                                    }

                                                    return (
                                                        <Button
                                                            key={pageNum}
                                                            variant={pagination.page === pageNum ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => handlePageChange(pageNum)}
                                                            className="w-8 h-8 p-0"
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page === pagination.pages}
                                            >
                                                Suivant
                                                <ChevronRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Dialogue des détails */}
                <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Détails de la banque</DialogTitle>
                            <DialogDescription>
                                Informations complètes de la banque
                            </DialogDescription>
                        </DialogHeader>
                        {selectedBanque && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Code banque</Label>
                                        <div className="font-mono font-bold text-lg">{selectedBanque.codeBanque}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nom</Label>
                                        <div className="font-medium text-lg">{selectedBanque.nom}</div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Statut</Label>
                                        <div>{getStatutBadge(selectedBanque.statut)}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Responsable</Label>
                                        <div>{selectedBanque.responsable || "Non spécifié"}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Adresse</Label>
                                    <div className="text-sm">{selectedBanque.adresse || "Non spécifiée"}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Téléphone</Label>
                                        <div className="text-sm">{selectedBanque.telephone || "Non spécifié"}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <div className="text-sm">{selectedBanque.email || "Non spécifié"}</div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Comptes associés</Label>
                                        <div className="space-y-1">
                                            <div>Total: {selectedBanque.nbComptes} compte{selectedBanque.nbComptes > 1 ? 's' : ''}</div>
                                            <div>Actifs: {selectedBanque.nbComptesActifs} compte{selectedBanque.nbComptesActifs > 1 ? 's' : ''}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Solde total</Label>
                                        <div className="text-xl font-bold text-green-600">
                                            {selectedBanque.totalSoldesFormate}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div>
                                        <Label>Créé le</Label>
                                        <div>{formatDate(selectedBanque.createdAt)}</div>
                                    </div>
                                    <div>
                                        <Label>Modifié le</Label>
                                        <div>{formatDate(selectedBanque.updatedAt)}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setDetailsDialogOpen(false)}>Fermer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialogue d'activation */}
                <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Activer la banque</DialogTitle>
                            <DialogDescription>
                                Êtes-vous sûr de vouloir activer la banque{" "}
                                <strong>{banqueToToggle?.nom}</strong> ?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setActivateDialogOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={() => banqueToToggle && handleToggleStatus(banqueToToggle, true)}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Activer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialogue de désactivation */}
                <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Désactiver la banque</DialogTitle>
                            <DialogDescription>
                                Êtes-vous sûr de vouloir désactiver la banque{" "}
                                <strong>{banqueToToggle?.nom}</strong> ?
                                <br />
                                <span className="text-amber-600 font-medium">
                                    Cette action rendra la banque non sélectionnable dans les nouvelles opérations.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeactivateDialogOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={() => banqueToToggle && handleToggleStatus(banqueToToggle, false)}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                Désactiver
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialogue de suppression */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la banque</AlertDialogTitle>
                            <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer la banque{" "}
                                <strong>{banqueToDelete?.nom} ({banqueToDelete?.codeBanque})</strong> ?
                                <br />
                                <span className="text-red-600 font-medium">
                                    Cette action est irréversible. Si la banque a des comptes associés, elle ne pourra pas être supprimée.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setBanqueToDelete(null)}>
                                Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </MainLayout>
    );
};

export default CreationBanque;