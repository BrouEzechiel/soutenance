import MainLayout from "@/components/layout/MainLayout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Plus,
    Save,
    Edit,
    Trash2,
    Lock,
    Unlock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search,
    Download,
    Eye,
    User,
    Phone,
    Mail,
    MapPin,
    Users,
    Shield,
    Briefcase,
    Globe,
} from "lucide-react";

// Types
interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    statut: string;
}

interface Societe {
    id: number;
    raisonSociale: string;
    code: string;
    statut: string;
}

interface Utilisateur {
    id: number;
    username: string;
    email: string;
}

interface Tiers {
    id?: number;
    code: string;
    intitule: string;
    typeTiers: "CLIENT" | "FOURNISSEUR" | "SALARIE" | "ADMINISTRATION" | "AUTRE";
    adresse?: string;
    telephone?: string;
    email?: string;
    // Soit un objet complet
    compteComptable?: PlanComptable;
    // Soit juste l'ID
    compteComptableId?: number;
    // Soit un objet complet
    societe?: Societe;
    // Soit juste l'ID
    societeId?: number;
    delaiReglement?: number;
    statut: string;
    statutCode?: string;
    estVerrouille: boolean;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: Utilisateur | string; // Peut être un objet complet ou juste une string
    updatedBy?: Utilisateur | string; // Peut être un objet complet ou juste une string
    hasBeenUsed?: boolean;
    peutEtreSupprime?: boolean;
    peutEtreModifie?: boolean;
    peutEtreDesactive?: boolean;
    nombreOperations?: number;
    typeTiersLibelle?: string;
    statutLibelle?: string;
    estActif?: boolean;
    delaiReglementEffectif?: number;
}

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

const API_BASE_URL = "http://127.0.0.1:8000/api";

// Constantes pour les types de tiers
const TYPES_TIERS = {
    CLIENT: "Client",
    FOURNISSEUR: "Fournisseur",
    SALARIE: "Salarié",
    ADMINISTRATION: "Administration",
    AUTRE: "Autre",
};

const STATUTS = {
    ACTIF: "Actif",
    INACTIF: "Inactif",
};

// Fonctions utilitaires
const getTypeIcon = (type: string) => {
    switch (type) {
        case "CLIENT": return <Users className="w-4 h-4" />;
        case "FOURNISSEUR": return <Briefcase className="w-4 h-4" />;
        case "SALARIE": return <User className="w-4 h-4" />;
        case "ADMINISTRATION": return <Shield className="w-4 h-4" />;
        case "AUTRE": return <Globe className="w-4 h-4" />;
        default: return <User className="w-4 h-4" />;
    }
};

const getDelaiReglementText = (delai?: number) => {
    if (delai === undefined || delai === null) return "Non défini";
    if (delai === 0) return "Immédiat";
    return `${delai} jour${delai > 1 ? "s" : ""}`;
};

// Fonction utilitaire pour obtenir le statut réel
const getStatutReel = (tier: Tiers): "ACTIF" | "INACTIF" => {
    // Si statutCode existe et est valide, l'utiliser
    if (tier.statutCode && (tier.statutCode === "ACTIF" || tier.statutCode === "INACTIF")) {
        return tier.statutCode as "ACTIF" | "INACTIF";
    }

    // Si statut est déjà un code valide
    if (tier.statut === "ACTIF" || tier.statut === "INACTIF") {
        return tier.statut as "ACTIF" | "INACTIF";
    }

    // Si statut est un libellé, le convertir
    if (tier.statut === "Actif") return "ACTIF";
    if (tier.statut === "Inactif") return "INACTIF";

    // Valeur par défaut
    return "ACTIF";
};

// Fonction utilitaire pour obtenir le nom de l'utilisateur
const getUtilisateurName = (user?: Utilisateur | string): string => {
    if (!user) return "Non spécifié";

    if (typeof user === 'string') {
        return user;
    }

    if (user.username) {
        return user.username;
    }

    if (user.email) {
        return user.email;
    }

    return `Utilisateur ${user.id}`;
};

const TiersPage = () => {
    const { toast } = useToast();
    const [tiers, setTiers] = useState<Tiers[]>([]);
    const [societes, setSocietes] = useState<Societe[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedTiers, setSelectedTiers] = useState<Tiers | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatut, setFilterStatut] = useState<string>("all");
    const [filterVerrouille, setFilterVerrouille] = useState<string>("all");
    const [pagination, setPagination] = useState<PaginationData>({
        total: 0,
        page: 1,
        limit: 20,
        pages: 1,
    });
    const [compatibleComptes, setCompatibleComptes] = useState<PlanComptable[]>([]);

    // Fonction simplifiée calculerPermissions
    const calculerPermissions = (tier: Tiers): Tiers => {
        const statutReel = getStatutReel(tier);
        const hasBeenUsed = tier.hasBeenUsed || (tier.nombreOperations ? tier.nombreOperations > 0 : false);
        const estActif = statutReel === "ACTIF";
        const estVerrouille = tier.estVerrouille || false;

        return {
            ...tier,
            estActif,
            peutEtreDesactive: estActif && !estVerrouille,
            peutEtreModifie: !estVerrouille,
            peutEtreSupprime: !hasBeenUsed && !estVerrouille,
        };
    };

    // Mettre à jour les permissions pour tous les tiers
    const updateTiersWithPermissions = (tiersList: Tiers[]): Tiers[] => {
        return tiersList.map(tier => calculerPermissions(tier));
    };

    // État du formulaire
    const [formData, setFormData] = useState<Tiers>({
        code: "",
        intitule: "",
        typeTiers: "CLIENT",
        adresse: "",
        telephone: "",
        email: "",
        compteComptableId: undefined,
        delaiReglement: undefined,
        statut: "ACTIF",
        estVerrouille: false,
        notes: "",
    });

    // Fonction utilitaire pour les headers
    const getAuthHeaders = (): HeadersInit => {
        const token = localStorage.getItem("auth_token") ||
            localStorage.getItem("token") ||
            sessionStorage.getItem("auth_token") ||
            sessionStorage.getItem("token");

        const headers: HeadersInit = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return headers;
    };

    // Types de tiers disponibles
    const typesTiersOptions = Object.entries(TYPES_TIERS).map(([value, label]) => ({
        value,
        label,
        icon: getTypeIcon(value),
    }));

    const getTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            CLIENT: "bg-blue-100 text-blue-800 border-blue-200",
            FOURNISSEUR: "bg-green-100 text-green-800 border-green-200",
            SALARIE: "bg-yellow-100 text-yellow-800 border-yellow-200",
            ADMINISTRATION: "bg-red-100 text-red-800 border-red-200",
            AUTRE: "bg-gray-100 text-gray-800 border-gray-200",
        };

        return (
            <Badge variant="outline" className={`${colors[type] || "bg-gray-100 text-gray-800"} flex items-center gap-1`}>
                {getTypeIcon(type)}
                {TYPES_TIERS[type as keyof typeof TYPES_TIERS] || type}
            </Badge>
        );
    };

    // getStatutBadge
    const getStatutBadge = (tier: Tiers) => {
        const statutReel = getStatutReel(tier);

        switch (statutReel) {
            case "ACTIF":
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {STATUTS[statutReel]}
                    </Badge>
                );
            case "INACTIF":
                return (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        {STATUTS[statutReel]}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{tier.statut}</Badge>;
        }
    };

    // Chargement des données
    useEffect(() => {
        fetchData();
        fetchSocietes();
    }, [pagination.page, searchTerm, filterType, filterStatut, filterVerrouille]);

    // Charger les comptes comptables compatibles quand le type change
    useEffect(() => {
        if (formData.typeTiers) {
            fetchCompatibleAccounts(formData.typeTiers);
        }
    }, [formData.typeTiers]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const headers = getAuthHeaders();

            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });

            if (searchTerm) params.append('search', searchTerm);
            if (filterType !== 'all') params.append('type', filterType);
            if (filterStatut !== 'all') params.append('statut', filterStatut);
            if (filterVerrouille !== 'all') params.append('estVerrouille', filterVerrouille);

            const url = `${API_BASE_URL}/tiers?${params.toString()}`;

            const response = await fetch(url, { headers });

            if (response.status === 401) {
                setError("Non authentifié. Veuillez vous connecter.");
                toast({
                    title: "Session expirée",
                    description: "Veuillez vous reconnecter",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error(`Erreur ${response.status} lors du chargement des tiers`);
            }

            const data = await response.json();

            if (data.success) {
                const tiersWithPermissions = updateTiersWithPermissions(data.data || []);
                setTiers(tiersWithPermissions);
                setPagination(data.pagination || pagination);
            } else {
                throw new Error(data.error || "Erreur inconnue");
            }

        } catch (error) {
            setError("Impossible de charger les données des tiers");

            toast({
                title: "Erreur",
                description: "Impossible de charger les données des tiers",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchSocietes = async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/societes`, { headers });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSocietes(data.data || []);
                }
            }
        } catch (error) {
            // Log silencieux
        }
    };

    const fetchCompatibleAccounts = async (typeTiers: string) => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/tiers/comptes-compatibles/${typeTiers}`, { headers });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCompatibleComptes(data.data || []);
                }
            }
        } catch (error) {
            setCompatibleComptes([]);
        }
    };

    const handleFormChange = (field: keyof Tiers, value: any) => {
        if (field === 'compteComptableId' && (value === "none" || value === "")) {
            setFormData(prev => ({
                ...prev,
                [field]: undefined
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }

        if (field === 'typeTiers') {
            setFormData(prev => ({
                ...prev,
                compteComptableId: undefined
            }));
        }
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!formData.code.trim()) {
            errors.push("Le code tiers est obligatoire");
        } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
            errors.push("Le code tiers doit contenir uniquement des lettres majuscules, chiffres, tirets et underscores");
        } else if (formData.code.length < 2 || formData.code.length > 20) {
            errors.push("Le code tiers doit avoir entre 2 et 20 caractères");
        }

        if (!formData.intitule.trim()) {
            errors.push("L'intitulé/raison sociale est obligatoire");
        }

        if (!formData.typeTiers) {
            errors.push("Le type de tiers est obligatoire");
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.push("L'adresse email n'est pas valide");
        }

        if (formData.delaiReglement !== undefined && formData.delaiReglement < 0) {
            errors.push("Le délai de règlement doit être positif ou zéro");
        }

        return errors;
    };

    const checkCodeAvailability = async (code: string, excludeId?: number): Promise<boolean> => {
        try {
            const headers = getAuthHeaders();
            const params = new URLSearchParams({ code });
            if (excludeId) params.append('excludeId', excludeId.toString());

            const response = await fetch(`${API_BASE_URL}/tiers/check-code?${params.toString()}`, { headers });
            const data = await response.json();

            return data.success ? !data.available : true;
        } catch (error) {
            return true;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            validationErrors.forEach(error => {
                toast({
                    title: "Erreur de validation",
                    description: error,
                    variant: "destructive",
                });
            });
            return;
        }

        const codeExists = await checkCodeAvailability(formData.code, editMode ? formData.id : undefined);
        if (codeExists) {
            toast({
                title: "Erreur de validation",
                description: "Un tiers avec ce code existe déjà",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const url = editMode && formData.id
                ? `${API_BASE_URL}/tiers/${formData.id}`
                : `${API_BASE_URL}/tiers`;

            const method = editMode ? "PUT" : "POST";

            const requestData: any = {
                code: formData.code.toUpperCase(),
                intitule: formData.intitule,
                typeTiers: formData.typeTiers,
                adresse: formData.adresse || null,
                telephone: formData.telephone || null,
                email: formData.email || null,
                delaiReglement: formData.delaiReglement || null,
                statut: formData.statut,
                estVerrouille: formData.estVerrouille,
                notes: formData.notes || null,
            };

            if (formData.compteComptableId && formData.compteComptableId > 0) {
                requestData.compteComptableId = formData.compteComptableId;
            } else {
                requestData.compteComptableId = null;
            }

            if (!editMode && societes.length > 0) {
                requestData.societeId = societes[0].id;
            }

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(requestData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                if (response.status === 400 && responseData.validation_errors) {
                    Object.entries(responseData.validation_errors).forEach(([field, message]) => {
                        toast({
                            title: "Erreur de validation",
                            description: `${field}: ${message}`,
                            variant: "destructive",
                        });
                    });
                } else {
                    throw new Error(responseData.error || `Erreur ${response.status}`);
                }
                return;
            }

            toast({
                title: "Succès",
                description: responseData.message || (editMode ? "Tiers mis à jour avec succès" : "Tiers créé avec succès"),
            });

            resetForm();
            fetchData();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
            setError(errorMessage);

            toast({
                title: "Erreur",
                description: "Une erreur est survenue lors de l'enregistrement",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (tiers: Tiers) => {
        const statutPourFormulaire = getStatutReel(tiers);

        setFormData({
            id: tiers.id,
            code: tiers.code,
            intitule: tiers.intitule,
            typeTiers: tiers.typeTiers,
            adresse: tiers.adresse || "",
            telephone: tiers.telephone || "",
            email: tiers.email || "",
            compteComptableId: tiers.compteComptable?.id,
            delaiReglement: tiers.delaiReglement,
            statut: statutPourFormulaire,
            estVerrouille: tiers.estVerrouille || false,
            notes: tiers.notes || "",
            hasBeenUsed: tiers.hasBeenUsed,
            peutEtreModifie: tiers.peutEtreModifie,
        });
        setEditMode(true);
        setShowForm(true);
    };

    const handleViewDetail = (tiers: Tiers) => {
        setSelectedTiers(tiers);
        setShowDetail(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce tiers ? Cette action est irréversible.")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/tiers/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de la suppression");
            }

            toast({
                title: "Succès",
                description: "Tiers supprimé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Erreur lors de la suppression",
                variant: "destructive",
            });
        }
    };

    const handleActiver = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tiers/${id}/activer`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({}),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de l'activation");
            }

            toast({
                title: "Succès",
                description: data.message || "Tiers activé avec succès",
            });

            setTiers(prevTiers =>
                prevTiers.map(tier => {
                    if (tier.id === id) {
                        const updatedTier = {
                            ...tier,
                            statut: "Actif",
                            statutCode: "ACTIF",
                        };
                        return calculerPermissions(updatedTier);
                    }
                    return tier;
                })
            );

            await fetchData();

        } catch (error) {
            toast({
                title: "Erreur",
                description: "Erreur lors de l'activation",
                variant: "destructive",
            });
        }
    };

    const handleDesactiver = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tiers/${id}/desactiver`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({}),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de la désactivation");
            }

            toast({
                title: "Succès",
                description: data.message || "Tiers désactivé avec succès",
            });

            setTiers(prevTiers =>
                prevTiers.map(tier => {
                    if (tier.id === id) {
                        const updatedTier = {
                            ...tier,
                            statut: "Inactif",
                            statutCode: "INACTIF",
                        };
                        return calculerPermissions(updatedTier);
                    }
                    return tier;
                })
            );

            await fetchData();

        } catch (error) {
            toast({
                title: "Erreur",
                description: "Erreur lors de la désactivation",
                variant: "destructive",
            });
        }
    };

    const handleVerrouiller = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tiers/${id}/verrouiller`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({}),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors du verrouillage");
            }

            toast({
                title: "Succès",
                description: "Tiers verrouillé avec succès",
            });

            setTiers(prevTiers =>
                prevTiers.map(tier => {
                    if (tier.id === id) {
                        const updatedTier = { ...tier, estVerrouille: true };
                        return calculerPermissions(updatedTier);
                    }
                    return tier;
                })
            );

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Erreur lors du verrouillage",
                variant: "destructive",
            });
        }
    };

    const handleDeverrouiller = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tiers/${id}/deverrouiller`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({}),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors du déverrouillage");
            }

            toast({
                title: "Succès",
                description: "Tiers déverrouillé avec succès",
            });

            setTiers(prevTiers =>
                prevTiers.map(tier => {
                    if (tier.id === id) {
                        const updatedTier = { ...tier, estVerrouille: false };
                        return calculerPermissions(updatedTier);
                    }
                    return tier;
                })
            );

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Erreur lors du déverrouillage",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setFormData({
            code: "",
            intitule: "",
            typeTiers: "CLIENT",
            adresse: "",
            telephone: "",
            email: "",
            compteComptableId: undefined,
            delaiReglement: undefined,
            statut: "ACTIF",
            estVerrouille: false,
            notes: "",
        });
        setEditMode(false);
        setShowForm(false);
        setError(null);
        setSelectedTiers(null);
        setShowDetail(false);
    };

    const handlePageChange = (page: number) => {
        setPagination(prev => ({ ...prev, page }));
    };

    const handleExportCsv = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/tiers/export/csv`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error("Erreur lors de l'export");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tiers_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Succès",
                description: "Export CSV réalisé avec succès",
            });
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Erreur lors de l'export",
                variant: "destructive",
            });
        }
    };

    if (loading && tiers.length === 0) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Chargement des tiers...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                {/* En-tête */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Gestion des Tiers</h1>
                        <p className="text-muted-foreground">
                            Gestion des clients, fournisseurs, salariés et autres tiers
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={fetchData} variant="outline" className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                        </Button>
                        <Button onClick={handleExportCsv} variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            Exporter CSV
                        </Button>
                        <Button onClick={() => setShowForm(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nouveau tiers
                        </Button>
                    </div>
                </div>

                {/* Messages d'erreur */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Filtres */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">Recherche</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Code, intitulé..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filterType">Type de tiers</Label>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les types</SelectItem>
                                        {typesTiersOptions.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                    {type.icon}
                                                    {type.label}
                                                </div>
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
                                        <SelectItem value="ACTIF">Actif</SelectItem>
                                        <SelectItem value="INACTIF">Inactif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filterVerrouille">Verrouillage</Label>
                                <Select value={filterVerrouille} onValueChange={setFilterVerrouille}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous</SelectItem>
                                        <SelectItem value="true">Verrouillés</SelectItem>
                                        <SelectItem value="false">Non verrouillés</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tableau des tiers */}
                <Card>
                    <CardHeader>
                        <CardTitle>Liste des tiers</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {pagination.total} tier{pagination.total !== 1 ? "s" : ""} trouvé
                            {pagination.total !== 1 ? "s" : ""} - Page {pagination.page} sur {pagination.pages}
                        </p>
                    </CardHeader>
                    <CardContent>
                        {tiers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {searchTerm || filterType !== 'all' || filterStatut !== 'all' || filterVerrouille !== 'all'
                                    ? "Aucun tiers ne correspond aux critères de recherche"
                                    : "Aucun tiers trouvé"}
                            </div>
                        ) : (
                            <>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Code</TableHead>
                                                <TableHead>Intitulé</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Contact</TableHead>
                                                <TableHead>Délai règlement</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tiers.map((tier) => {
                                                const tierWithPermissions = calculerPermissions(tier);
                                                const estActif = getStatutReel(tierWithPermissions) === "ACTIF";

                                                return (
                                                    <TableRow key={tier.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {tier.code}
                                                                {tier.estVerrouille && (
                                                                    <Lock className="w-3 h-3 text-yellow-600" />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-xs truncate" title={tier.intitule}>
                                                                {tier.intitule}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{getTypeBadge(tier.typeTiers)}</TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                {tier.telephone && (
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <Phone className="w-3 h-3" />
                                                                        {tier.telephone}
                                                                    </div>
                                                                )}
                                                                {tier.email && (
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <Mail className="w-3 h-3" />
                                                                        <span className="truncate">{tier.email}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getDelaiReglementText(tier.delaiReglement)}
                                                        </TableCell>
                                                        <TableCell>{getStatutBadge(tierWithPermissions)}</TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleViewDetail(tier)}
                                                                    title="Voir les détails"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleEdit(tier)}
                                                                    disabled={tierWithPermissions.estVerrouille || !tierWithPermissions.peutEtreModifie}
                                                                    title={tierWithPermissions.estVerrouille ? "Tiers verrouillé" : !tierWithPermissions.peutEtreModifie ? "Modification non autorisée" : "Modifier"}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>

                                                                {estActif ? (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleDesactiver(tier.id!)}
                                                                        disabled={!tierWithPermissions.peutEtreDesactive}
                                                                        title={!tierWithPermissions.peutEtreDesactive ? "Désactivation non autorisée" : "Désactiver"}
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleActiver(tier.id!)}
                                                                        title="Activer"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </Button>
                                                                )}

                                                                {tier.estVerrouille ? (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleDeverrouiller(tier.id!)}
                                                                        disabled={!tierWithPermissions.peutEtreModifie}
                                                                        title="Déverrouiller"
                                                                    >
                                                                        <Unlock className="w-4 h-4" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleVerrouiller(tier.id!)}
                                                                        disabled={!tierWithPermissions.peutEtreModifie}
                                                                        title="Verrouiller"
                                                                    >
                                                                        <Lock className="w-4 h-4" />
                                                                    </Button>
                                                                )}

                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => handleDelete(tier.id!)}
                                                                    disabled={!tierWithPermissions.peutEtreSupprime}
                                                                    title={!tierWithPermissions.peutEtreSupprime ? "Suppression non autorisée" : "Supprimer"}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                {pagination.pages > 1 && (
                                    <div className="mt-4">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                                                        className={pagination.page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                    />
                                                </PaginationItem>

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
                                                        <PaginationItem key={pageNum}>
                                                            <PaginationLink
                                                                onClick={() => handlePageChange(pageNum)}
                                                                isActive={pageNum === pagination.page}
                                                                className="cursor-pointer"
                                                            >
                                                                {pageNum}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    );
                                                })}

                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={() => handlePageChange(Math.min(pagination.pages, pagination.page + 1))}
                                                        className={pagination.page === pagination.pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Modal de création/édition */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editMode ? "Modifier le tiers" : "Créer un nouveau tiers"}
                            </DialogTitle>
                            <DialogDescription>
                                {editMode
                                    ? "Modifiez les informations du tiers"
                                    : "Remplissez les informations pour créer un nouveau tiers"}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Tabs defaultValue="informations" className="w-full">
                                <TabsList className="grid grid-cols-3">
                                    <TabsTrigger value="informations">Informations</TabsTrigger>
                                    <TabsTrigger value="coordonnees">Coordonnées</TabsTrigger>
                                    <TabsTrigger value="comptabilite">Comptabilité</TabsTrigger>
                                </TabsList>

                                <TabsContent value="informations" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="code">
                                                Code tiers <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="code"
                                                value={formData.code}
                                                onChange={(e) => handleFormChange("code", e.target.value.toUpperCase())}
                                                placeholder="Ex: CLI001"
                                                required
                                                disabled={submitting || (editMode && formData.hasBeenUsed)}
                                                maxLength={20}
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                2 à 20 caractères, lettres majuscules, chiffres, tirets et underscores
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="intitule">
                                                Intitulé/Raison sociale <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="intitule"
                                                value={formData.intitule}
                                                onChange={(e) => handleFormChange("intitule", e.target.value)}
                                                placeholder="Ex: Client Principal"
                                                required
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="typeTiers">
                                                Type de tiers <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.typeTiers}
                                                onValueChange={(value: any) => handleFormChange("typeTiers", value)}
                                                disabled={submitting || (editMode && formData.hasBeenUsed)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {typesTiersOptions.map((type) => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            <div className="flex items-center gap-2">
                                                                {type.icon}
                                                                {type.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="delaiReglement">Délai de règlement (jours)</Label>
                                            <Input
                                                id="delaiReglement"
                                                type="number"
                                                min="0"
                                                value={formData.delaiReglement || ""}
                                                onChange={(e) => handleFormChange("delaiReglement", e.target.value ? parseInt(e.target.value) : undefined)}
                                                placeholder="Ex: 30"
                                                disabled={submitting}
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                Par défaut: Client (30), Fournisseur (60), Administration (30), Autre (0)
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="coordonnees" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="adresse">Adresse</Label>
                                        <Textarea
                                            id="adresse"
                                            value={formData.adresse || ""}
                                            onChange={(e) => handleFormChange("adresse", e.target.value)}
                                            placeholder="Adresse complète"
                                            rows={3}
                                            disabled={submitting}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="telephone">Téléphone</Label>
                                            <Input
                                                id="telephone"
                                                value={formData.telephone || ""}
                                                onChange={(e) => handleFormChange("telephone", e.target.value)}
                                                placeholder="Ex: +33 1 23 45 67 89"
                                                disabled={submitting}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email || ""}
                                                onChange={(e) => handleFormChange("email", e.target.value)}
                                                placeholder="Ex: contact@exemple.fr"
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="comptabilite" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="compteComptableId">Compte comptable associé</Label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <Select
                                                    value={formData.compteComptableId?.toString() || ""}
                                                    onValueChange={(value) => handleFormChange("compteComptableId", value)}
                                                    disabled={submitting || (editMode && formData.hasBeenUsed)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sélectionner un compte comptable" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Aucun compte</SelectItem>
                                                        {compatibleComptes.length > 0 ? (
                                                            compatibleComptes.map((pc) => (
                                                                <SelectItem key={pc.id} value={pc.id.toString()}>
                                                                    {pc.codeCompte} - {pc.intitule}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="no-accounts" disabled>
                                                                Aucun compte compatible disponible
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => handleFormChange("compteComptableId", undefined)}
                                                disabled={submitting || !formData.compteComptableId}
                                                title="Effacer la sélection"
                                            >
                                                Effacer
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Comptes compatibles avec le type de tiers sélectionné
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="statut">Statut</Label>
                                            <Select
                                                value={formData.statut}
                                                onValueChange={(value: string) => handleFormChange("statut", value)}
                                                disabled={submitting}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Statut" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ACTIF">Actif</SelectItem>
                                                    <SelectItem value="INACTIF">Inactif</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="estVerrouille">Tiers verrouillé</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Empêche les modifications
                                                </p>
                                            </div>
                                            <Switch
                                                id="estVerrouille"
                                                checked={formData.estVerrouille}
                                                onCheckedChange={(checked) => handleFormChange("estVerrouille", checked)}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Notes et observations</Label>
                                        <Textarea
                                            id="notes"
                                            value={formData.notes || ""}
                                            onChange={(e) => handleFormChange("notes", e.target.value)}
                                            placeholder="Informations complémentaires..."
                                            rows={4}
                                            disabled={submitting}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="flex justify-end gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    disabled={submitting}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {editMode ? "Modification..." : "Création..."}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {editMode ? "Modifier" : "Créer"}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Modal de détail */}
                <Dialog open={showDetail} onOpenChange={setShowDetail}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Détails du tiers</DialogTitle>
                            <DialogDescription>
                                Informations complètes du tiers
                            </DialogDescription>
                        </DialogHeader>

                        {selectedTiers && (
                            <div className="space-y-6">
                                {/* En-tête */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold">{selectedTiers.code}</h3>
                                            {getTypeBadge(selectedTiers.typeTiers)}
                                            {getStatutBadge(selectedTiers)}
                                            {selectedTiers.estVerrouille && (
                                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                                    <Lock className="w-3 h-3 mr-1" />
                                                    Verrouillé
                                                </Badge>
                                            )}
                                        </div>
                                        <h4 className="text-lg font-semibold text-foreground mt-1">
                                            {selectedTiers.intitule}
                                        </h4>
                                    </div>
                                    <div className="text-sm text-muted-foreground text-right">
                                        <div>Créé le: {new Date(selectedTiers.createdAt || '').toLocaleDateString('fr-FR')}</div>
                                        {selectedTiers.updatedAt && (
                                            <div>Modifié le: {new Date(selectedTiers.updatedAt).toLocaleDateString('fr-FR')}</div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Onglets */}
                                <Tabs defaultValue="general" className="w-full">
                                    <TabsList className="grid grid-cols-4">
                                        <TabsTrigger value="general">Général</TabsTrigger>
                                        <TabsTrigger value="contact">Contact</TabsTrigger>
                                        <TabsTrigger value="comptabilite">Comptabilité</TabsTrigger>
                                        <TabsTrigger value="historique">Historique</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="general" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Type de tiers</Label>
                                                <p className="font-medium">{selectedTiers.typeTiersLibelle || TYPES_TIERS[selectedTiers.typeTiers]}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Délai de règlement</Label>
                                                <p className="font-medium">{getDelaiReglementText(selectedTiers.delaiReglement)}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Statut</Label>
                                                <p className="font-medium">{selectedTiers.statutLibelle || selectedTiers.statut}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Nombre d'opérations</Label>
                                                <p className="font-medium">{selectedTiers.nombreOperations || 0}</p>
                                            </div>
                                        </div>

                                        {selectedTiers.notes && (
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Notes</Label>
                                                <div className="p-3 bg-muted rounded-md">
                                                    <p className="whitespace-pre-wrap">{selectedTiers.notes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="contact" className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            {selectedTiers.adresse && (
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Adresse</Label>
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                                                        <p className="whitespace-pre-wrap">{selectedTiers.adresse}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {(selectedTiers.telephone || selectedTiers.email) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {selectedTiers.telephone && (
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Téléphone</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="w-4 h-4 text-muted-foreground" />
                                                                <p>{selectedTiers.telephone}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {selectedTiers.email && (
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Email</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="w-4 h-4 text-muted-foreground" />
                                                                <p>{selectedTiers.email}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="comptabilite" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Compte comptable associé</Label>
                                                {selectedTiers.compteComptable ? (
                                                    <div className="space-y-1">
                                                        <p className="font-medium">{selectedTiers.compteComptable.codeCompte}</p>
                                                        <p className="text-sm text-muted-foreground">{selectedTiers.compteComptable.intitule}</p>
                                                        <Badge variant="outline" className="mt-1">
                                                            {selectedTiers.compteComptable.statut === 'ACTIF' ? 'Actif' : 'Inactif'}
                                                        </Badge>
                                                    </div>
                                                ) : selectedTiers.compteComptableId ? (
                                                    <div className="space-y-1">
                                                        <p className="text-muted-foreground">ID: {selectedTiers.compteComptableId}</p>
                                                        <p className="text-sm text-muted-foreground italic">
                                                            Détails non chargés, veuillez actualiser
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground">Aucun compte associé</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Société</Label>
                                                {selectedTiers.societe ? (
                                                    <div className="space-y-1">
                                                        <p className="font-medium">{selectedTiers.societe.raisonSociale}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Code: {selectedTiers.societe.code}
                                                        </p>
                                                        <Badge variant="outline" className="mt-1">
                                                            {selectedTiers.societe.statut === 'ACTIF' ? 'Actif' : 'Inactif'}
                                                        </Badge>
                                                    </div>
                                                ) : selectedTiers.societeId ? (
                                                    <div className="space-y-1">
                                                        <p className="text-muted-foreground">ID: {selectedTiers.societeId}</p>
                                                        <p className="text-sm text-muted-foreground italic">
                                                            Détails non chargés, veuillez actualiser
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground">Non spécifiée</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Restrictions</Label>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                                    <span>Peut être modifié: {selectedTiers.peutEtreModifie ? 'Oui' : 'Non'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                                    <span>Peut être supprimé: {selectedTiers.peutEtreSupprime ? 'Oui' : 'Non'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                                    <span>Utilisé dans des opérations: {selectedTiers.hasBeenUsed ? 'Oui' : 'Non'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="historique" className="space-y-4">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Création</Label>
                                                <div className="p-3 bg-muted rounded-md">
                                                    <div className="flex items-center justify-between">
                                                        <span>Date: {new Date(selectedTiers.createdAt || '').toLocaleString('fr-FR')}</span>
                                                        {selectedTiers.createdBy && (
                                                            <span className="text-sm text-muted-foreground">
                                                                Par: {getUtilisateurName(selectedTiers.createdBy)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedTiers.updatedAt && (
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Dernière modification</Label>
                                                    <div className="p-3 bg-muted rounded-md">
                                                        <div className="flex items-center justify-between">
                                                            <span>Date: {new Date(selectedTiers.updatedAt).toLocaleString('fr-FR')}</span>
                                                            {selectedTiers.updatedBy && (
                                                                <span className="text-sm text-muted-foreground">
                                                                    Par: {getUtilisateurName(selectedTiers.updatedBy)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <DialogFooter>
                                    <Button onClick={() => setShowDetail(false)}>Fermer</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Aide */}
                <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                        <div className="font-semibold mb-2">Informations importantes :</div>
                        <ul className="text-sm space-y-1 list-disc list-inside">
                            <li>Le code tiers doit être unique (2-20 caractères, majuscules/chiffres/tirets/underscores)</li>
                            <li>Le compte comptable doit correspondre au type de tiers (classe spécifique)</li>
                            <li>Un tiers déjà utilisé ne peut avoir son code, type ou compte comptable modifié</li>
                            <li>Un tiers verrouillé ne peut être modifié</li>
                            <li>Un tiers utilisé dans des opérations ne peut être supprimé</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            </div>
        </MainLayout>
    );
};

export default TiersPage;