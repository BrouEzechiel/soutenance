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
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    Filter,
    Eye,
    EyeOff,
} from "lucide-react";

// Types
interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    typeCompte?: string;
    codeFormate?: string;
    statut: string;
    societe?: {
        id: number;
        nom: string;
    };
}

interface JournalTresorerie {
    id?: number;
    code: string;
    intitule: string;
    typeJournal: "BANQUE" | "OD_TRESORERIE" | "DIVERS";
    compteAssocieId: number;
    compteAssocie?: PlanComptable;
    societe?: {
        id: number;
        nom: string;
    };
    statut: "ACTIF" | "INACTIF";
    estVerrouille: boolean;
    description?: string;
    hasBeenUsed?: boolean;
    peutEtreSupprime?: boolean;
    peutEtreModifie?: boolean;
    peutEtreDesactive?: boolean;
    peutEtreUtilisePourSaisie?: boolean;
    restrictionsMessage?: string;
    classeComptableRequise?: string;
    nombreOperations?: number;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: any;
    updatedBy?: any;
}

const API_BASE_URL = "http://127.0.0.1:8000/api";

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

const JournalTresorerie = () => {
    const { toast } = useToast();
    const [journaux, setJournaux] = useState<JournalTresorerie[]>([]);
    const [planComptables, setPlanComptables] = useState<PlanComptable[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatut, setFilterStatut] = useState<string>("all");
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filterVerrouille, setFilterVerrouille] = useState<string>("all");
    const [filterUsed, setFilterUsed] = useState<string>("all");

    // État du formulaire
    const [formData, setFormData] = useState<JournalTresorerie>({
        code: "",
        intitule: "",
        typeJournal: "BANQUE",
        compteAssocieId: 0,
        statut: "ACTIF",
        estVerrouille: false,
        description: "",
    });

    // Types de journaux disponibles selon l'entité PHP (SANS CAISSE)
    const typesJournal = [
        { value: "BANQUE", label: "Banque" },
        { value: "OD_TRESORERIE", label: "Opérations diverses de trésorerie" },
        { value: "DIVERS", label: "Divers" },
    ];

    // Classes comptables requises (selon l'entité JournalTresorerie.php)
    const getClasseRequise = (type: string): string => {
        switch (type) {
            case "BANQUE": return "52";
            case "OD_TRESORERIE": return "58";
            case "DIVERS": return "58";
            default: return "58";
        }
    };

    // Filtrer les plans comptables
    const getPlansComptablesFiltres = () => {
        if (!formData.typeJournal) return planComptables;

        const classeRequise = getClasseRequise(formData.typeJournal);

        // Filtre par classe OHADA (premier chiffre du code compte)
        return planComptables.filter(
            pc => pc.codeCompte.startsWith(classeRequise.substring(0, 1)) && pc.statut === "ACTIF"
        );
    };

    // Chargement des données
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const headers = getAuthHeaders();

            // 1. Charger les journaux
            const journauxResponse = await fetch(`${API_BASE_URL}/journaux-tresorerie`, {
                headers,
            });

            if (journauxResponse.status === 401) {
                setError("Non authentifié. Veuillez vous connecter.");
                toast({
                    title: "Session expirée",
                    description: "Veuillez vous reconnecter",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }

            if (!journauxResponse.ok) {
                const errorData = await journauxResponse.json();
                throw new Error(errorData.error || `Erreur ${journauxResponse.status} lors du chargement des journaux`);
            }

            const journauxData = await journauxResponse.json();
            setJournaux(journauxData.data || []);

            // 2. Charger les plans comptables
            try {
                const pcResponse = await fetch(`${API_BASE_URL}/plan-comptables/actifs`, {
                    headers,
                });

                if (pcResponse.ok) {
                    const pcData = await pcResponse.json();
                    if (pcData.data) {
                        setPlanComptables(pcData.data);
                    } else if (Array.isArray(pcData)) {
                        setPlanComptables(pcData);
                    } else {
                        await loadPlanComptablesFallback(headers);
                    }
                } else {
                    await loadPlanComptablesFallback(headers);
                }
            } catch (pcError) {
                console.warn("Erreur lors du chargement des plans comptables:", pcError);
                await loadPlanComptablesFallback(headers);
            }

        } catch (error) {
            console.error("Erreur lors du chargement des données:", error);
            setError(error instanceof Error ? error.message : "Erreur inconnue");

            toast({
                title: "Erreur",
                description: "Impossible de charger les données",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Fallback pour charger les plans comptables
    const loadPlanComptablesFallback = async (headers: HeadersInit) => {
        try {
            const fallbackResponse = await fetch(`${API_BASE_URL}/plan-comptables`, {
                headers,
            });

            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                if (fallbackData.data) {
                    setPlanComptables(fallbackData.data);
                } else if (Array.isArray(fallbackData)) {
                    setPlanComptables(fallbackData);
                } else {
                    setPlanComptables([]);
                }
            } else {
                setPlanComptables([]);
            }
        } catch (error) {
            setPlanComptables([]);
        }
    };

    const handleFormChange = (
        field: keyof JournalTresorerie,
        value: string | boolean | number
    ) => {
        const updatedFormData = {
            ...formData,
            [field]: value
        };

        // Si le type de journal change, réinitialiser le compte associé
        if (field === "typeJournal") {
            updatedFormData.compteAssocieId = 0;
        }

        setFormData(updatedFormData);
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!formData.code.trim()) {
            errors.push("Le code journal est obligatoire");
        } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
            errors.push("Le code journal doit contenir uniquement des lettres majuscules et chiffres");
        } else if (formData.code.length < 2 || formData.code.length > 10) {
            errors.push("Le code journal doit avoir entre 2 et 10 caractères");
        }

        if (!formData.intitule.trim()) {
            errors.push("L'intitulé est obligatoire");
        }

        if (!formData.compteAssocieId) {
            errors.push("Le compte comptable associé est obligatoire");
        }

        return errors;
    };

    // Vérifier si le code est unique
    const checkCodeUnique = async (code: string, excludeId?: number): Promise<boolean> => {
        try {
            let url = `${API_BASE_URL}/journaux-tresorerie/validation/code/${code}`;
            if (excludeId) {
                url += `?excludeId=${excludeId}`;
            }

            const response = await fetch(url, {
                headers: getAuthHeaders(),
            });

            if (response.ok) {
                const data = await response.json();
                return data.isUnique;
            }
            return false;
        } catch (error) {
            console.error("Erreur lors de la vérification du code:", error);
            return false;
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

        // Vérifier l'unicité du code
        const isCodeUnique = await checkCodeUnique(formData.code, formData.id);
        if (!isCodeUnique) {
            toast({
                title: "Erreur de validation",
                description: "Un journal avec ce code existe déjà",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const url = editMode && formData.id
                ? `${API_BASE_URL}/journaux-tresorerie/${formData.id}`
                : `${API_BASE_URL}/journaux-tresorerie`;

            const method = editMode ? "PUT" : "POST";

            const requestData = {
                code: formData.code,
                intitule: formData.intitule,
                typeJournal: formData.typeJournal,
                compteAssocieId: formData.compteAssocieId,
                description: formData.description || null,
                statut: formData.statut,
                estVerrouille: formData.estVerrouille,
            };

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(requestData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                if (response.status === 400) {
                    if (responseData.errors) {
                        Object.entries(responseData.errors).forEach(([field, message]) => {
                            toast({
                                title: "Erreur de validation",
                                description: `${field}: ${message}`,
                                variant: "destructive",
                            });
                        });
                    } else if (responseData.error) {
                        throw new Error(responseData.error);
                    }
                } else if (response.status === 409) {
                    throw new Error(responseData.message || "Conflit de données");
                } else {
                    throw new Error(responseData.message || `Erreur ${response.status}`);
                }
                return;
            }

            toast({
                title: "Succès",
                description: responseData.message || (editMode ? "Journal modifié avec succès" : "Journal créé avec succès"),
            });

            resetForm();
            fetchData();

        } catch (error) {
            console.error("Erreur lors de l'enregistrement:", error);
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
            setError(errorMessage);

            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (journal: JournalTresorerie) => {
        setFormData({
            code: journal.code,
            intitule: journal.intitule,
            typeJournal: journal.typeJournal,
            compteAssocieId: journal.compteAssocie?.id || 0,
            statut: journal.statut,
            estVerrouille: journal.estVerrouille,
            description: journal.description || "",
            id: journal.id,
            hasBeenUsed: journal.hasBeenUsed,
            peutEtreModifie: journal.peutEtreModifie,
            peutEtreDesactive: journal.peutEtreDesactive,
            peutEtreUtilisePourSaisie: journal.peutEtreUtilisePourSaisie,
            restrictionsMessage: journal.restrictionsMessage,
            classeComptableRequise: journal.classeComptableRequise,
        });
        setEditMode(true);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce journal ? Cette action est irréversible.")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/journaux-tresorerie/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Erreur lors de la suppression");
            }

            toast({
                title: "Succès",
                description: "Journal supprimé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de la suppression",
                variant: "destructive",
            });
        }
    };

    const handleDesactiver = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir désactiver ce journal ?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/journaux-tresorerie/${id}/desactiver`, {
                method: "PUT",
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Erreur lors de la désactivation");
            }

            toast({
                title: "Succès",
                description: data.message || "Journal désactivé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de la désactivation",
                variant: "destructive",
            });
        }
    };

    const handleReactiver = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/journaux-tresorerie/${id}/reactiver`, {
                method: "PUT",
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Erreur lors de la réactivation");
            }

            toast({
                title: "Succès",
                description: data.message || "Journal réactivé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur",
                variant: "destructive",
            });
        }
    };

    const handleVerrouiller = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/journaux-tresorerie/${id}/verrouiller`, {
                method: "PUT",
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Erreur lors du verrouillage");
            }

            toast({
                title: "Succès",
                description: data.message || "Journal verrouillé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur",
                variant: "destructive",
            });
        }
    };

    const handleDeverrouiller = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/journaux-tresorerie/${id}/deverrouiller`, {
                method: "PUT",
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || "Erreur lors du déverrouillage");
            }

            toast({
                title: "Succès",
                description: data.message || "Journal déverrouillé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setFormData({
            code: "",
            intitule: "",
            typeJournal: "BANQUE",
            compteAssocieId: 0,
            statut: "ACTIF",
            estVerrouille: false,
            description: "",
        });
        setEditMode(false);
        setShowForm(false);
        setError(null);
    };

    const resetFilters = () => {
        setSearchTerm("");
        setFilterType("all");
        setFilterStatut("all");
        setFilterVerrouille("all");
        setFilterUsed("all");
    };

    const getStatutBadge = (statut: string) => {
        switch (statut) {
            case "ACTIF":
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Actif
                    </Badge>
                );
            case "INACTIF":
                return (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactif
                    </Badge>
                );
            default:
                return <Badge variant="outline">{statut}</Badge>;
        }
    };

    const getTypeJournalBadge = (type: string) => {
        const colors: Record<string, string> = {
            BANQUE: "bg-blue-100 text-blue-800 border-blue-200",
            OD_TRESORERIE: "bg-green-100 text-green-800 border-green-200",
            DIVERS: "bg-gray-100 text-gray-800 border-gray-200",
        };

        const labels: Record<string, string> = {
            BANQUE: "Banque",
            OD_TRESORERIE: "OD Trésorerie",
            DIVERS: "Divers",
        };

        return (
            <Badge variant="outline" className={colors[type] || "bg-gray-100 text-gray-800"}>
                {labels[type] || type}
            </Badge>
        );
    };

    const getVerrouilleBadge = (verrouille: boolean) => {
        if (verrouille) {
            return (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Lock className="w-3 h-3 mr-1" />
                    Verrouillé
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                <Unlock className="w-3 h-3 mr-1" />
                Déverrouillé
            </Badge>
        );
    };

    const getUsedBadge = (used: boolean) => {
        if (used) {
            return (
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Utilisé
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                Non utilisé
            </Badge>
        );
    };

    // Filtrer les journaux
    const filteredJournaux = journaux.filter((journal) => {
        const matchesSearch = searchTerm === "" ||
            journal.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            journal.intitule.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (journal.compteAssocie?.intitule || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === "all" || journal.typeJournal === filterType;
        const matchesStatut = filterStatut === "all" || journal.statut === filterStatut;
        const matchesVerrouille = filterVerrouille === "all" ||
            (filterVerrouille === "verrouille" && journal.estVerrouille) ||
            (filterVerrouille === "non_verrouille" && !journal.estVerrouille);
        const matchesUsed = filterUsed === "all" ||
            (filterUsed === "utilise" && journal.hasBeenUsed) ||
            (filterUsed === "non_utilise" && !journal.hasBeenUsed);

        return matchesSearch && matchesType && matchesStatut && matchesVerrouille && matchesUsed;
    });

    // Statistiques de filtrage (SANS CAISSE)
    const getStats = () => {
        const stats = {
            total: journaux.length,
            actifs: journaux.filter(j => j.statut === "ACTIF").length,
            inactifs: journaux.filter(j => j.statut === "INACTIF").length,
            banque: journaux.filter(j => j.typeJournal === "BANQUE").length,
            od: journaux.filter(j => j.typeJournal === "OD_TRESORERIE").length,
            divers: journaux.filter(j => j.typeJournal === "DIVERS").length,
            verrouilles: journaux.filter(j => j.estVerrouille).length,
            utilises: journaux.filter(j => j.hasBeenUsed).length,
        };
        return stats;
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Chargement des journaux...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* En-tête */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Journaux de Trésorerie</h1>
                    <p className="text-muted-foreground">
                        Gestion des journaux pour la saisie des opérations de trésorerie
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchData} variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Actualiser
                    </Button>
                    <Button onClick={() => setShowForm(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Nouveau journal
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
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Filtres</CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className="gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                {showAdvancedFilters ? "Filtres simples" : "Filtres avancés"}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="gap-2"
                            >
                                Réinitialiser
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="search">Recherche</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Code, intitulé ou compte..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="filterType">Type de journal</Label>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Tous les types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tous les types</SelectItem>
                                    {typesJournal.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label} ({type.value === "BANQUE" ? stats.banque :
                                            type.value === "OD_TRESORERIE" ? stats.od :
                                                stats.divers})
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
                                    <SelectItem value="all">Tous les statuts ({stats.total})</SelectItem>
                                    <SelectItem value="ACTIF">Actif ({stats.actifs})</SelectItem>
                                    <SelectItem value="INACTIF">Inactif ({stats.inactifs})</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Filtres avancés */}
                    {showAdvancedFilters && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="filterVerrouille">État de verrouillage</Label>
                                <Select value={filterVerrouille} onValueChange={setFilterVerrouille}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous ({stats.total})</SelectItem>
                                        <SelectItem value="verrouille">Verrouillé ({stats.verrouilles})</SelectItem>
                                        <SelectItem value="non_verrouille">Non verrouillé ({stats.total - stats.verrouilles})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filterUsed">État d'utilisation</Label>
                                <Select value={filterUsed} onValueChange={setFilterUsed}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous ({stats.total})</SelectItem>
                                        <SelectItem value="utilise">Utilisé ({stats.utilises})</SelectItem>
                                        <SelectItem value="non_utilise">Non utilisé ({stats.total - stats.utilises})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Résultats du filtrage</Label>
                                <div className="p-3 bg-gray-50 rounded-md">
                                    <div className="text-sm text-muted-foreground">
                                        {filteredJournaux.length} journal{filteredJournaux.length !== 1 ? "x" : ""} correspondant
                                        {filteredJournaux.length !== 1 ? "s" : ""} aux critères
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Statistiques (SANS CAISSE) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-full">
                                <Filter className="w-4 h-4 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Actifs</p>
                                <p className="text-2xl font-bold text-green-600">{stats.actifs}</p>
                            </div>
                            <div className="p-2 bg-green-100 rounded-full">
                                <Eye className="w-4 h-4 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Inactifs</p>
                                <p className="text-2xl font-bold text-gray-600">{stats.inactifs}</p>
                            </div>
                            <div className="p-2 bg-gray-100 rounded-full">
                                <EyeOff className="w-4 h-4 text-gray-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Verrouillés</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.verrouilles}</p>
                            </div>
                            <div className="p-2 bg-yellow-100 rounded-full">
                                <Lock className="w-4 h-4 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tableau des journaux */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Liste des journaux</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {filteredJournaux.length} journal{filteredJournaux.length !== 1 ? "x" : ""} trouvé
                                {filteredJournaux.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded-full"></div>
                                Actif
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded-full"></div>
                                Verrouillé
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredJournaux.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <p>Aucun journal ne correspond aux critères de recherche</p>
                            <Button
                                variant="link"
                                onClick={resetFilters}
                                className="mt-2"
                            >
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Intitulé</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Compte associé</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>État</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredJournaux.map((journal) => (
                                        <TableRow key={journal.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {journal.code}
                                                    {journal.estVerrouille && (
                                                        <Lock className="w-3 h-3 text-yellow-600" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{journal.intitule}</TableCell>
                                            <TableCell>{getTypeJournalBadge(journal.typeJournal)}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="font-medium">
                                                        {journal.compteAssocie?.codeCompte || "N/A"}
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {journal.compteAssocie?.intitule || "Non défini"}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatutBadge(journal.statut)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {getVerrouilleBadge(journal.estVerrouille)}
                                                    {getUsedBadge(!!journal.hasBeenUsed)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(journal)}
                                                        disabled={!journal.peutEtreModifie}
                                                        title={!journal.peutEtreModifie ? "Modification non autorisée" : "Modifier"}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>

                                                    {journal.estVerrouille ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDeverrouiller(journal.id!)}
                                                            title="Déverrouiller"
                                                        >
                                                            <Unlock className="w-4 h-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleVerrouiller(journal.id!)}
                                                            title="Verrouiller"
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    {journal.statut === "ACTIF" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDesactiver(journal.id!)}
                                                            disabled={!journal.peutEtreDesactive}
                                                            title={!journal.peutEtreDesactive ? "Désactivation non autorisée" : "Désactiver"}
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleReactiver(journal.id!)}
                                                            title="Réactiver"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(journal.id!)}
                                                        disabled={!journal.peutEtreSupprime}
                                                        title={!journal.peutEtreSupprime ? "Suppression non autorisée" : "Supprimer"}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de création/édition */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editMode ? "Modifier le journal" : "Créer un nouveau journal"}
                        </DialogTitle>
                        <DialogDescription>
                            {editMode
                                ? "Modifiez les informations du journal de trésorerie"
                                : "Remplissez les informations pour créer un nouveau journal de trésorerie"}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">
                                    Code journal <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => handleFormChange("code", e.target.value.toUpperCase())}
                                    placeholder="Ex: BQ001"
                                    required
                                    disabled={submitting || (editMode && formData.hasBeenUsed)}
                                    maxLength={10}
                                />
                                <p className="text-sm text-muted-foreground">
                                    2 à 10 caractères, lettres majuscules et chiffres uniquement
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="typeJournal">
                                    Type de journal <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.typeJournal}
                                    onValueChange={(value: "BANQUE" | "OD_TRESORERIE" | "DIVERS") =>
                                        handleFormChange("typeJournal", value)
                                    }
                                    disabled={submitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {typesJournal.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label} (Classe {getClasseRequise(type.value)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="intitule">
                                Intitulé <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="intitule"
                                value={formData.intitule}
                                onChange={(e) => handleFormChange("intitule", e.target.value)}
                                placeholder="Ex: Journal de banque principal"
                                required
                                disabled={submitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="compteAssocieId">
                                Compte comptable associé <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.compteAssocieId.toString()}
                                onValueChange={(value) => handleFormChange("compteAssocieId", parseInt(value))}
                                disabled={submitting || (editMode && formData.hasBeenUsed)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un compte comptable" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getPlansComptablesFiltres().length > 0 ? (
                                        getPlansComptablesFiltres().map((pc) => (
                                            <SelectItem key={pc.id} value={pc.id.toString()}>
                                                {pc.codeCompte} - {pc.intitule}
                                                {pc.societe && (
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        ({pc.societe.nom})
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="0" disabled>
                                            Aucun compte disponible pour ce type
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {getPlansComptablesFiltres().length === 0 && (
                                <p className="text-sm text-destructive">
                                    Aucun compte comptable de classe {getClasseRequise(formData.typeJournal)} disponible.
                                    Assurez-vous que la société a des comptes actifs de la classe appropriée.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="statut">Statut</Label>
                                <Select
                                    value={formData.statut}
                                    onValueChange={(value: "ACTIF" | "INACTIF") =>
                                        handleFormChange("statut", value)
                                    }
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
                                    <Label htmlFor="estVerrouille">Journal verrouillé</Label>
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
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description || ""}
                                onChange={(e) => handleFormChange("description", e.target.value)}
                                placeholder="Description (facultatif)"
                                rows={3}
                                disabled={submitting}
                            />
                        </div>

                        {editMode && formData.restrictionsMessage && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                                    <div className="text-yellow-800 text-sm">
                                        <strong className="font-semibold">Restrictions :</strong> {formData.restrictionsMessage}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                disabled={submitting || !formData.compteAssocieId}
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

            {/* Aide */}
            <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                    <div className="font-semibold mb-2">Informations :</div>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Le code journal doit être unique (2-10 caractères, majuscules/chiffres)</li>
                        <li>Le compte associé doit être de la classe OHADA correspondante : Banque (52...)</li>
                        <li>Types disponibles : Banque (classe 52), OD Trésorerie (classe 58), Divers (classe 58)</li>
                        <li>Un journal utilisé ne peut être supprimé</li>
                        <li>Les journaux inactifs n'apparaissent pas dans les listes de saisie</li>
                        <li>Un journal verrouillé ne peut être modifié</li>
                        <li>Seuls les journaux de votre société sont affichés</li>
                    </ul>
                </AlertDescription>
            </Alert>
        </div>
    );
};

export default JournalTresorerie;