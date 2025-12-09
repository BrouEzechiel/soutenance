import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    CheckCircle,
    XCircle,
    RefreshCw,
    Search,
    Lock,
    Unlock,
    Eye,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";

const API_URL = "http://127.0.0.1:8000/api/plan-comptables";

interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    typeCompte: string;
    statut: string;
    compteVerrouille: boolean;
    classeOhada: string | null;
    description: string | null;
    devise: {
        id: number;
        code: string;
        intitule: string;
        symbole: string | null;
        statut: string;
    } | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
    estUtilisable?: boolean;
    estCompteTiers?: boolean;
    estCompteTresorerie?: boolean;
    niveauDetail?: number;
    codeFormate?: string;
}

interface Devise {
    id: number;
    code: string;
    intitule: string;
    symbole: string | null;
    statut: string;
}

interface FormState {
    codeCompte: string;
    intitule: string;
    typeCompte: string;
    statut: string;
    description: string;
    devise: string; // ID de la devise ou "0" pour aucune
    classeOhada: string; // NE PAS utiliser de string vide
}

interface ApiResponse {
    success: boolean;
    data: PlanComptable[] | PlanComptable | any;
    meta?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
    message?: string;
    errors?: Array<{
        field: string;
        message: string;
    }> | string;
}

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

const GestionPlanComptable = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [comptes, setComptes] = useState<PlanComptable[]>([]);
    const [devises, setDevises] = useState<Devise[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterClasse, setFilterClasse] = useState<string>("all");
    const [filterStatut, setFilterStatut] = useState<string>("all");
    const [pagination, setPagination] = useState<PaginationMeta>({
        total: 0,
        page: 1,
        limit: 20,
        pages: 0
    });

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>({
        codeCompte: "",
        intitule: "",
        typeCompte: "autres",
        statut: "ACTIF",
        description: "",
        devise: "0", // Utiliser "0" au lieu de "" pour aucune devise
        classeOhada: "auto" // Utiliser "auto" au lieu de ""
    });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [compteToDelete, setCompteToDelete] = useState<PlanComptable | null>(null);
    const [lockDialogOpen, setLockDialogOpen] = useState(false);
    const [compteToLock, setCompteToLock] = useState<PlanComptable | null>(null);
    const [statutDialogOpen, setStatutDialogOpen] = useState(false);
    const [compteForStatut, setCompteForStatut] = useState<PlanComptable | null>(null);

    const token = localStorage.getItem("token") ?? "";

    const typesComptes = [
        { value: "client", label: "Client" },
        { value: "fournisseur", label: "Fournisseur" },
        { value: "banque", label: "Banque" },
        { value: "caisse", label: "Caisse" },
        { value: "charge", label: "Charge" },
        { value: "produit", label: "Produit" },
        { value: "tva", label: "TVA" },
        { value: "immobilisation", label: "Immobilisation" },
        { value: "amortissement", label: "Amortissement" },
        { value: "provision", label: "Provision" },
        { value: "capitaux", label: "Capitaux" },
        { value: "dettes", label: "Dettes" },
        { value: "tresorerie", label: "Trésorerie" },
        { value: "achat", label: "Achat" },
        { value: "vente", label: "Vente" },
        { value: "salaires", label: "Salaires" },
        { value: "impots", label: "Impôts" },
        { value: "autres", label: "Autres" }
    ];

    const classesOhada = [
        { value: "auto", label: "Automatique (basé sur le code)" }, // Valeur non vide
        { value: "classe_1", label: "Classe 1 - Capitaux" },
        { value: "classe_2", label: "Classe 2 - Immobilisations" },
        { value: "classe_3", label: "Classe 3 - Stocks" },
        { value: "classe_4", label: "Classe 4 - Tiers" },
        { value: "classe_5", label: "Classe 5 - Financiers" },
        { value: "classe_6", label: "Classe 6 - Charges" },
        { value: "classe_7", label: "Classe 7 - Produits" },
        { value: "classe_8", label: "Classe 8 - Résultat" },
        { value: "classe_9", label: "Classe 9 - Spéciaux" }
    ];

    const statuts = [
        { value: "ACTIF", label: "Actif" },
        { value: "INACTIF", label: "Inactif" }
    ];

    const resetForm = () => {
        setEditingId(null);
        setForm({
            codeCompte: "",
            intitule: "",
            typeCompte: "autres",
            statut: "ACTIF",
            description: "",
            devise: "0",
            classeOhada: "auto"
        });
    };

    const authHeaders = (): HeadersInit => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    });

    const handleSessionExpired = () => {
        toast({
            title: "Session expirée",
            description: "Veuillez vous reconnecter.",
            variant: "destructive"
        });
        setTimeout(() => navigate("/login"), 2000);
    };

    const fetchComptes = async (page = 1) => {
        if (!token) return handleSessionExpired();

        try {
            setLoading(true);

            // Construire les paramètres de requête
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString()
            });

            if (searchTerm) params.append('search', searchTerm);
            if (filterType !== "all") params.append('type', filterType);
            if (filterClasse !== "all") params.append('classe', filterClasse);
            if (filterStatut !== "all") params.append('statut', filterStatut);

            const url = `${API_URL}?${params.toString()}`;

            const res = await fetch(url, {
                headers: authHeaders()
            });

            if (res.status === 401) return handleSessionExpired();

            if (!res.ok) {
                throw new Error(`Erreur ${res.status}`);
            }

            const response: ApiResponse = await res.json();

            if (response.success && response.data) {
                setComptes(Array.isArray(response.data) ? response.data : []);
                if (response.meta) {
                    setPagination(response.meta);
                }
            } else {
                setComptes([]);
                if (response.message) {
                    toast({
                        title: "Erreur",
                        description: response.message,
                        variant: "destructive"
                    });
                }
            }

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de charger le plan comptable.",
                variant: "destructive"
            });
            setComptes([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTypesComptes = async () => {
        try {
            const res = await fetch(`${API_URL}/types`, {
                headers: authHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    // Note: Vous pouvez utiliser ces types depuis l'API si nécessaire
                }
            }
        } catch (err) {
            console.error("Erreur chargement des types:", err);
        }
    };

    const fetchDevises = async () => {
        if (!token) return;

        try {
            // Essayer différents endpoints pour les devises
            const endpoints = [
                "http://127.0.0.1:8000/api/devises/actives",
                "http://127.0.0.1:8000/api/devises",
                "http://127.0.0.1:8000/api/devises?statut=ACTIF"
            ];

            let success = false;
            for (const endpoint of endpoints) {
                try {
                    const res = await fetch(endpoint, {
                        headers: authHeaders()
                    });

                    if (res.ok) {
                        const data = await res.json();
                        // Vérifier la structure de la réponse
                        if (Array.isArray(data)) {
                            setDevises(data);
                        } else if (data.success && Array.isArray(data.data)) {
                            setDevises(data.data);
                        } else if (data.data && Array.isArray(data.data)) {
                            setDevises(data.data);
                        }
                        success = true;
                        break;
                    }
                } catch (err) {
                    console.warn(`Endpoint ${endpoint} a échoué:`, err);
                    continue;
                }
            }

            if (!success) {
                console.warn("Aucun endpoint de devises n'a fonctionné");
                // Continuer sans devises plutôt que d'afficher une erreur
            }

        } catch (err) {
            console.error("Erreur chargement devises:", err);
            // Ne pas afficher d'erreur toast pour éviter de perturber l'utilisateur
        }
    };

    useEffect(() => {
        fetchComptes(1);
        fetchTypesComptes();
        fetchDevises();
    }, []);

    // Rafraîchir les comptes quand les filtres changent
    useEffect(() => {
        fetchComptes(1);
    }, [searchTerm, filterType, filterClasse, filterStatut]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm({ ...form, [id]: value });
    };

    const handleSelectChange = (field: keyof FormState, value: string) => {
        setForm({ ...form, [field]: value });
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!form.codeCompte.trim()) {
            errors.push("Le code compte est obligatoire");
        } else if (!/^[1-9][0-9]*(\.[0-9]+)*$/.test(form.codeCompte)) {
            errors.push("Format de code invalide. Ex: 411, 52.10, 401.100");
        }

        if (!form.intitule.trim()) {
            errors.push("L'intitulé est obligatoire");
        }

        if (!form.typeCompte) {
            errors.push("Le type de compte est obligatoire");
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

        if (!token) return handleSessionExpired();

        const url = editingId ? `${API_URL}/${editingId}` : API_URL;
        const method = editingId ? "PUT" : "POST";

        // Préparer le payload
        const payload: any = {
            codeCompte: form.codeCompte,
            intitule: form.intitule,
            typeCompte: form.typeCompte,
            statut: form.statut,
            description: form.description || null,
            compteVerrouille: false // Par défaut
        };

        // Gestion de la devise
        if (form.devise !== "0") {
            payload.devise = form.devise;
        }

        // Gestion de la classe OHADA
        if (form.classeOhada !== "auto") {
            payload.classeOhada = form.classeOhada;
        } else {
            // Si "auto", ne pas envoyer de classeOhada (sera calculée automatiquement côté serveur)
            payload.classeOhada = null;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.status === 401) return handleSessionExpired();

            const data: ApiResponse = await res.json();

            if (!res.ok || !data.success) {
                let errorMsg = `Erreur ${res.status}`;

                if (data.errors) {
                    if (Array.isArray(data.errors)) {
                        errorMsg = data.errors.map(err => err.message).join(" • ");
                    } else if (typeof data.errors === 'string') {
                        errorMsg = data.errors;
                    }
                } else if (data.message) {
                    errorMsg = data.message;
                }

                throw new Error(errorMsg);
            }

            toast({
                title: editingId ? "Compte modifié" : "Compte créé",
                description: data.message || "Opération réussie",
                variant: "default"
            });

            resetForm();
            setShowForm(false);
            await fetchComptes(pagination.page);

        } catch (err: any) {
            console.error("Erreur lors de l'enregistrement:", err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible d'enregistrer le compte",
                variant: "destructive"
            });
        }
    };

    const handleEdit = (compte: PlanComptable) => {
        if (compte.compteVerrouille) {
            toast({
                title: "Compte verrouillé",
                description: "Ce compte est verrouillé et ne peut être modifié.",
                variant: "destructive"
            });
            return;
        }

        setForm({
            codeCompte: compte.codeCompte,
            intitule: compte.intitule,
            typeCompte: compte.typeCompte,
            statut: compte.statut,
            description: compte.description || "",
            devise: compte.devise?.id?.toString() || "0",
            classeOhada: compte.classeOhada || "auto"
        });
        setEditingId(compte.id);
        setShowForm(true);
    };

    const handleToggleStatut = async (compte: PlanComptable) => {
        if (!token) return handleSessionExpired();

        try {
            const endpoint = compte.statut === "ACTIF"
                ? `${API_URL}/${compte.id}/deactivate`
                : `${API_URL}/${compte.id}/activate`;

            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: authHeaders()
            });

            if (res.status === 401) return handleSessionExpired();

            const data: ApiResponse = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || `Erreur ${res.status}`);
            }

            toast({
                title: compte.statut === "ACTIF" ? "Compte désactivé" : "Compte activé",
                description: data.message || "Opération réussie"
            });

            await fetchComptes(pagination.page);

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de modifier le statut",
                variant: "destructive"
            });
        }
    };

    const handleVerrouiller = async (compte: PlanComptable) => {
        if (!token) return handleSessionExpired();

        try {
            const endpoint = compte.compteVerrouille
                ? `${API_URL}/${compte.id}/deverrouiller`
                : `${API_URL}/${compte.id}/verrouiller`;

            const res = await fetch(endpoint, {
                method: "PATCH",
                headers: authHeaders()
            });

            if (res.status === 401) return handleSessionExpired();

            const data: ApiResponse = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || `Erreur ${res.status}`);
            }

            toast({
                title: compte.compteVerrouille ? "Compte déverrouillé" : "Compte verrouillé",
                description: data.message || "Opération réussie"
            });

            await fetchComptes(pagination.page);
            setLockDialogOpen(false);

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de modifier le verrouillage",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async () => {
        if (!compteToDelete || !token) return;

        try {
            const res = await fetch(`${API_URL}/${compteToDelete.id}`, {
                method: "DELETE",
                headers: authHeaders()
            });

            if (res.status === 401) return handleSessionExpired();

            const data: ApiResponse = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || `Erreur ${res.status}`);
            }

            toast({
                title: "Compte supprimé",
                description: data.message || "Opération réussie"
            });

            await fetchComptes(pagination.page);
            setDeleteDialogOpen(false);
            setCompteToDelete(null);

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de supprimer le compte",
                variant: "destructive"
            });
        }
    };

    const handleViewStatut = (compte: PlanComptable) => {
        setCompteForStatut(compte);
        setStatutDialogOpen(true);
    };

    const getStatutBadge = (compte: PlanComptable) => {
        if (compte.compteVerrouille) {
            return (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <Lock className="w-3 h-3 mr-1" /> Verrouillé
                </Badge>
            );
        }

        if (compte.statut === "ACTIF") {
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

    const getTypeBadge = (type: string) => {
        const typeConfig = typesComptes.find(t => t.value === type);
        const colors: Record<string, string> = {
            client: "bg-blue-100 text-blue-800",
            fournisseur: "bg-orange-100 text-orange-800",
            banque: "bg-green-100 text-green-800",
            caisse: "bg-emerald-100 text-emerald-800",
            charge: "bg-red-100 text-red-800",
            produit: "bg-teal-100 text-teal-800",
            tva: "bg-purple-100 text-purple-800",
            immobilisation: "bg-indigo-100 text-indigo-800",
            autres: "bg-gray-100 text-gray-800"
        };

        return (
            <Badge variant="outline" className={colors[type] || colors.autres}>
                {typeConfig?.label || type}
            </Badge>
        );
    };

    const getClasseBadge = (classe: string | null) => {
        if (!classe) return null;

        const classeConfig = classesOhada.find(c => c.value === classe);
        if (!classeConfig) return null;

        const colors: Record<string, string> = {
            classe_1: "bg-blue-50 text-blue-700",
            classe_2: "bg-green-50 text-green-700",
            classe_3: "bg-yellow-50 text-yellow-700",
            classe_4: "bg-red-50 text-red-700",
            classe_5: "bg-purple-50 text-purple-700",
            classe_6: "bg-pink-50 text-pink-700",
            classe_7: "bg-teal-50 text-teal-700",
            classe_8: "bg-indigo-50 text-indigo-700",
            classe_9: "bg-gray-50 text-gray-700"
        };

        return (
            <Badge variant="outline" className={colors[classe] || colors.classe_9}>
                {classeConfig.label.split(" - ")[0]}
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return "-";
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchComptes(newPage);
        }
    };

    const stats = {
        total: pagination.total,
        actifs: comptes.filter(c => c.statut === "ACTIF").length,
        verrouilles: comptes.filter(c => c.compteVerrouille).length,
        classes: Object.entries(
            comptes.reduce((acc, compte) => {
                if (compte.classeOhada) {
                    acc[compte.classeOhada] = (acc[compte.classeOhada] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>)
        ).map(([classe, count]) => ({ classe, count }))
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Plan Comptable</h1>
                        <p className="text-muted-foreground">
                            Gestion des comptes comptables OHADA
                        </p>
                    </div>
                    <Button
                        className="gap-2"
                        onClick={() => {
                            resetForm();
                            setShowForm(true);
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        Nouveau compte
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold">{stats.total}</div>
                                <div className="text-sm text-muted-foreground">Comptes totaux</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600">{stats.actifs}</div>
                                <div className="text-sm text-muted-foreground">Comptes actifs</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-red-600">{stats.verrouilles}</div>
                                <div className="text-sm text-muted-foreground">Comptes verrouillés</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold">{stats.classes.length}</div>
                                <div className="text-sm text-muted-foreground">Classes OHADA</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">Recherche</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        id="search"
                                        placeholder="Code ou intitulé..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="filterType">Type de compte</Label>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les types</SelectItem>
                                        {typesComptes.map(type => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="filterClasse">Classe OHADA</Label>
                                <Select value={filterClasse} onValueChange={setFilterClasse}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Toutes les classes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes les classes</SelectItem>
                                        {classesOhada.map(classe => (
                                            <SelectItem key={classe.value} value={classe.value}>
                                                {classe.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="filterStatut">Statut</Label>
                                <Select value={filterStatut} onValueChange={setFilterStatut}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les statuts" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les statuts</SelectItem>
                                        {statuts.map(statut => (
                                            <SelectItem key={statut.value} value={statut.value}>
                                                {statut.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {showForm && (
                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {editingId ? "Modifier un compte" : "Créer un nouveau compte"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="codeCompte">
                                            Code compte OHADA *
                                            <span className="text-xs text-muted-foreground ml-1">
                                                (ex: 411, 52.10, 401.100)
                                            </span>
                                        </Label>
                                        <Input
                                            id="codeCompte"
                                            value={form.codeCompte}
                                            onChange={handleChange}
                                            placeholder="411100"
                                            required
                                            disabled={editingId !== null}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="intitule">Intitulé *</Label>
                                        <Input
                                            id="intitule"
                                            value={form.intitule}
                                            onChange={handleChange}
                                            placeholder="Clients - Ventes de marchandises"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type de compte *</Label>
                                        <Select
                                            value={form.typeCompte}
                                            onValueChange={(value) => handleSelectChange('typeCompte', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {typesComptes.map(type => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Devise</Label>
                                        <Select
                                            value={form.devise}
                                            onValueChange={(value) => handleSelectChange('devise', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une devise" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Aucune devise</SelectItem>
                                                {devises.map(devise => (
                                                    <SelectItem key={devise.id} value={devise.id.toString()}>
                                                        {devise.code} - {devise.intitule}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Classe OHADA</Label>
                                        <Select
                                            value={form.classeOhada}
                                            onValueChange={(value) => handleSelectChange('classeOhada', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une classe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classesOhada.map(classe => (
                                                    <SelectItem key={classe.value} value={classe.value}>
                                                        {classe.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        placeholder="Description du compte..."
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Statut</Label>
                                    <Select
                                        value={form.statut}
                                        onValueChange={(value) => handleSelectChange('statut', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuts.map(statut => (
                                                <SelectItem key={statut.value} value={statut.value}>
                                                    {statut.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {editingId && (
                                    <div className="text-sm text-muted-foreground">
                                        <p>⚠️ Note : Le code compte ne peut pas être modifié après création si le compte est utilisé.</p>
                                    </div>
                                )}

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
                                        <X className="w-4 h-4 mr-2" />
                                        Annuler
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Liste des comptes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">Chargement du plan comptable...</p>
                            </div>
                        ) : (
                            <>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Intitulé</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Classe</TableHead>
                                                <TableHead>Devise</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {comptes.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8">
                                                        <p className="text-muted-foreground">
                                                            Aucun compte ne correspond aux critères
                                                        </p>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                comptes.map((compte) => (
                                                    <TableRow key={compte.id} className="hover:bg-muted/50">
                                                        <TableCell className="font-mono font-bold">
                                                            {compte.codeFormate || compte.codeCompte}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{compte.intitule}</div>
                                                            {compte.description && (
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    {compte.description}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getTypeBadge(compte.typeCompte)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getClasseBadge(compte.classeOhada)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {compte.devise ? (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="font-medium">{compte.devise.code}</span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        ({compte.devise.symbole || "-"})
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatutBadge(compte)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleViewStatut(compte)}
                                                                    title="Voir le statut"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(compte)}
                                                                    title="Modifier"
                                                                    disabled={compte.compteVerrouille}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setCompteToLock(compte);
                                                                        setLockDialogOpen(true);
                                                                    }}
                                                                    title={compte.compteVerrouille ? "Déverrouiller" : "Verrouiller"}
                                                                >
                                                                    {compte.compteVerrouille ? (
                                                                        <Unlock className="w-4 h-4" />
                                                                    ) : (
                                                                        <Lock className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleToggleStatut(compte)}
                                                                    title={compte.statut === "ACTIF" ? "Désactiver" : "Activer"}
                                                                    className={compte.statut === "ACTIF" ?
                                                                        "text-amber-600 hover:text-amber-700 hover:bg-amber-50" :
                                                                        "text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    }
                                                                    disabled={compte.compteVerrouille}
                                                                >
                                                                    {compte.statut === "ACTIF" ? (
                                                                        <XCircle className="w-4 h-4" />
                                                                    ) : (
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setCompteToDelete(compte);
                                                                        setDeleteDialogOpen(true);
                                                                    }}
                                                                    title="Supprimer"
                                                                    disabled={compte.compteVerrouille}
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

                                {pagination.pages > 1 && (
                                    <div className="flex items-center justify-between space-x-2 py-4">
                                        <div className="flex-1 text-sm text-muted-foreground">
                                            Affichage de {(pagination.page - 1) * pagination.limit + 1} à {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} comptes
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page <= 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <div className="text-sm">
                                                Page {pagination.page} sur {pagination.pages}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page >= pagination.pages}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {compteToLock?.compteVerrouille ? "Déverrouiller le compte" : "Verrouiller le compte"}
                            </DialogTitle>
                            <DialogDescription>
                                Êtes-vous sûr de vouloir {compteToLock?.compteVerrouille ? "déverrouiller" : "verrouiller"} le compte{" "}
                                <span className="font-bold">{compteToLock?.codeCompte} - {compteToLock?.intitule}</span> ?
                                {!compteToLock?.compteVerrouille && (
                                    <div className="mt-2 p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                                        <strong>⚠️ Attention :</strong> Un compte verrouillé ne pourra plus être modifié ni supprimé.
                                    </div>
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setLockDialogOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant={compteToLock?.compteVerrouille ? "default" : "destructive"}
                                onClick={() => compteToLock && handleVerrouiller(compteToLock)}
                            >
                                {compteToLock?.compteVerrouille ? "Déverrouiller" : "Verrouiller"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action est irréversible. Le compte{" "}
                                <span className="font-bold">{compteToDelete?.codeCompte} - {compteToDelete?.intitule}</span>{" "}
                                sera définitivement supprimé.
                                <div className="mt-3 p-3 bg-red-50 text-red-800 rounded-md text-sm">
                                    <strong>⚠️ Attention :</strong> Cette suppression peut affecter les écritures comptables existantes.
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setCompteToDelete(null)}>
                                Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Supprimer définitivement
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Dialog open={statutDialogOpen} onOpenChange={setStatutDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Statut du compte</DialogTitle>
                        </DialogHeader>
                        {compteForStatut && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Code compte</Label>
                                        <div className="font-mono font-bold text-lg">
                                            {compteForStatut.codeFormate || compteForStatut.codeCompte}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Type</Label>
                                        <div className="mt-1">{getTypeBadge(compteForStatut.typeCompte)}</div>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm text-muted-foreground">Intitulé</Label>
                                    <div className="font-medium mt-1">{compteForStatut.intitule}</div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Statut</Label>
                                        <div className="mt-1">
                                            {compteForStatut.statut === "ACTIF" ? (
                                                <Badge variant="default" className="bg-green-600">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Actif
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                                    <XCircle className="w-3 h-3 mr-1" /> Inactif
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Verrouillage</Label>
                                        <div className="mt-1">
                                            {compteForStatut.compteVerrouille ? (
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                    <Lock className="w-3 h-3 mr-1" /> Verrouillé
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    <Unlock className="w-3 h-3 mr-1" /> Non verrouillé
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Utilisable</Label>
                                        <div className="mt-1">
                                            <Switch
                                                checked={compteForStatut.estUtilisable || false}
                                                disabled
                                                className="data-[state=checked]:bg-green-600"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Niveau de détail</Label>
                                        <div className="font-medium mt-1">Niveau {compteForStatut.niveauDetail || 1}</div>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm text-muted-foreground">Classe OHADA</Label>
                                    <div className="mt-1">
                                        {getClasseBadge(compteForStatut.classeOhada) || (
                                            <span className="text-muted-foreground">Automatique</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm text-muted-foreground">Devise associée</Label>
                                    <div className="mt-1">
                                        {compteForStatut.devise ? (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">
                                                    {compteForStatut.devise.code}
                                                </Badge>
                                                <span>{compteForStatut.devise.intitule}</span>
                                                {compteForStatut.devise.symbole && (
                                                    <span className="text-muted-foreground">({compteForStatut.devise.symbole})</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Aucune devise spécifiée</span>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Créé le</Label>
                                        <div className="mt-1">{formatDate(compteForStatut.createdAt)}</div>
                                        {compteForStatut.createdBy && (
                                            <div className="text-xs text-muted-foreground">Par {compteForStatut.createdBy}</div>
                                        )}
                                    </div>
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Modifié le</Label>
                                        <div className="mt-1">{formatDate(compteForStatut.updatedAt)}</div>
                                        {compteForStatut.updatedBy && (
                                            <div className="text-xs text-muted-foreground">Par {compteForStatut.updatedBy}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setStatutDialogOpen(false)}
                            >
                                Fermer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
};

export default GestionPlanComptable;