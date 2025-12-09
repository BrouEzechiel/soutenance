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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Plus,
    Save,
    Edit,
    Trash2,
    Eye,
    Lock,
    Unlock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search,
    Filter,
} from "lucide-react";

// Types alignés avec l'entité JournalTresorerie
interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    typeCompte: string;
    codeFormate: string;
    statut: string;
}

interface JournalTresorerie {
    id?: number;
    code: string;
    intitule: string;
    typeJournal: "BANQUE" | "CAISSE" | "VIREMENT_INTERNE" | "OD_TRESORERIE" | "DIVERS";
    compteAssocieId: number;
    compteAssocie?: PlanComptable;
    statut: "ACTIF" | "INACTIF";
    estVerrouille: boolean;
    description?: string;
    hasBeenUsed?: boolean;
    peutEtreSupprime?: boolean;
    peutEtreModifie?: boolean;
    peutEtreUtilisePourSaisie?: boolean;
    nombreOperations?: number;
    nombreEcritures?: number;
    createdAt?: string;
    updatedAt?: string;
}

const API_BASE_URL = "http://127.0.0.1:8000/api";

// Fonction utilitaire pour les headers d'authentification
const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        Accept: "application/json",
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
    const [filterType, setFilterType] = useState<string>("");
    const [filterStatut, setFilterStatut] = useState<string>("");

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

    // Types de journaux disponibles
    const typesJournal = [
        { value: "BANQUE", label: "Banque" },
        { value: "CAISSE", label: "Caisse" },
        { value: "VIREMENT_INTERNE", label: "Virement interne" },
        { value: "OD_TRESORERIE", label: "OD de trésorerie" },
        { value: "DIVERS", label: "Divers" },
    ];

    // Classes comptables requises par type de journal
    const getClasseRequise = (type: string): string => {
        switch (type) {
            case "BANQUE":
                return "52";
            case "CAISSE":
                return "57";
            case "VIREMENT_INTERNE":
            case "OD_TRESORERIE":
            case "DIVERS":
                return "58";
            default:
                return "58";
        }
    };

    // Filtrer les plans comptables par classe requise
    const getPlansComptablesFiltres = () => {
        if (!formData.typeJournal) return planComptables;

        const classeRequise = getClasseRequise(formData.typeJournal);
        return planComptables.filter(
            (pc) => pc.codeCompte.startsWith(classeRequise) && pc.statut === "ACTIF"
        );
    };

    // Chargement initial des données
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const headers = getAuthHeaders();

            // Charger les journaux
            const journauxResponse = await fetch(`${API_BASE_URL}/journaux-tresorerie`, {
                headers,
            });
            if (!journauxResponse.ok) {
                throw new Error("Erreur lors du chargement des journaux");
            }
            const journauxData = await journauxResponse.json();
            setJournaux(journauxData.data || []);

            // Charger les plans comptables actifs
            const planComptableResponse = await fetch(
                `${API_BASE_URL}/plan-comptable/actifs`,
                { headers }
            );
            if (planComptableResponse.ok) {
                const planComptableData = await planComptableResponse.json();
                setPlanComptables(planComptableData.data || []);
            }

        } catch (error) {
            console.error("Erreur lors du chargement des données:", error);
            setError("Impossible de charger les données. Veuillez réessayer.");

            toast({
                title: "Erreur",
                description: "Impossible de charger les données nécessaires",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (
        field: keyof JournalTresorerie,
        value: string | boolean | number
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        // Si le type de journal change, réinitialiser le compte associé
        if (field === "typeJournal") {
            setFormData((prev) => ({
                ...prev,
                compteAssocieId: 0,
            }));
        }
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

        if (!formData.typeJournal) {
            errors.push("Le type de journal est obligatoire");
        }

        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            validationErrors.forEach((error) => {
                toast({
                    title: "Erreur de validation",
                    description: error,
                    variant: "destructive",
                });
            });
            return;
        }

        // Vérifier l'unicité du code en temps réel
        const isCodeUnique = await validateCodeUnique(
            formData.code,
            editMode ? formData.id : undefined
        );

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

            const method = editMode && formData.id ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                if (response.status === 400 && responseData.errors) {
                    Object.entries(responseData.errors).forEach(([field, message]) => {
                        toast({
                            title: "Erreur de validation",
                            description: `${field}: ${message}`,
                            variant: "destructive",
                        });
                    });
                } else if (responseData.error) {
                    throw new Error(responseData.error);
                } else {
                    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
                }
                return;
            }

            toast({
                title: "Succès",
                description: responseData.message || `Journal ${editMode ? "modifié" : "créé"} avec succès`,
            });

            resetForm();
            fetchData();

        } catch (error) {
            console.error("Erreur lors de l'enregistrement:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Une erreur inattendue est survenue";
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

    const validateCodeUnique = async (
        code: string,
        excludeId?: number
    ): Promise<boolean> => {
        try {
            const params = new URLSearchParams();
            if (excludeId) {
                params.append("excludeId", excludeId.toString());
            }

            const response = await fetch(
                `${API_BASE_URL}/journaux-tresorerie/validation/code/${code}?${params}`,
                { headers: getAuthHeaders() }
            );

            if (response.ok) {
                const data = await response.json();
                return data.isUnique;
            }
            return false;
        } catch {
            return false;
        }
    };

    const handleEdit = (journal: JournalTresorerie) => {
        setFormData({
            ...journal,
            compteAssocieId: journal.compteAssocie?.id || 0,
        });
        setEditMode(true);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce journal ?")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/journaux-tresorerie/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || "Erreur lors de la suppression");
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
            const response = await fetch(
                `${API_BASE_URL}/journaux-tresorerie/${id}/desactiver`,
                {
                    method: "PUT",
                    headers: getAuthHeaders(),
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || "Erreur lors de la désactivation");
            }

            toast({
                title: "Succès",
                description: "Journal désactivé avec succès",
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
            const response = await fetch(
                `${API_BASE_URL}/journaux-tresorerie/${id}/reactiver`,
                {
                    method: "PUT",
                    headers: getAuthHeaders(),
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || "Erreur lors de la réactivation");
            }

            toast({
                title: "Succès",
                description: "Journal réactivé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de la réactivation",
                variant: "destructive",
            });
        }
    };

    const handleVerrouiller = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir verrouiller ce journal ?")) {
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/journaux-tresorerie/${id}/verrouiller`,
                {
                    method: "PUT",
                    headers: getAuthHeaders(),
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || "Erreur lors du verrouillage");
            }

            toast({
                title: "Succès",
                description: "Journal verrouillé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors du verrouillage",
                variant: "destructive",
            });
        }
    };

    const handleDeverrouiller = async (id: number) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/journaux-tresorerie/${id}/deverrouiller`,
                {
                    method: "PUT",
                    headers: getAuthHeaders(),
                }
            );

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || "Erreur lors du déverrouillage");
            }

            toast({
                title: "Succès",
                description: "Journal déverrouillé avec succès",
            });

            fetchData();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors du déverrouillage",
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

    const getStatutBadge = (statut: string) => {
        switch (statut) {
            case "ACTIF":
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800">
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
            BANQUE: "bg-blue-100 text-blue-800",
            CAISSE: "bg-yellow-100 text-yellow-800",
            VIREMENT_INTERNE: "bg-purple-100 text-purple-800",
            OD_TRESORERIE: "bg-green-100 text-green-800",
            DIVERS: "bg-gray-100 text-gray-800",
        };

        const labels: Record<string, string> = {
            BANQUE: "Banque",
            CAISSE: "Caisse",
            VIREMENT_INTERNE: "Virement interne",
            OD_TRESORERIE: "OD Trésorerie",
            DIVERS: "Divers",
        };

        return (
            <Badge variant="outline" className={colors[type] || "bg-gray-100 text-gray-800"}>
                {labels[type] || type}
            </Badge>
        );
    };

    // Filtrer les journaux
    const filteredJournaux = journaux.filter((journal) => {
        const matchesSearch =
            journal.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            journal.intitule.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = !filterType || journal.typeJournal === filterType;
        const matchesStatut = !filterStatut || journal.statut === filterStatut;

        return matchesSearch && matchesType && matchesStatut;
    });

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

            {/* Filtres */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="search">Recherche</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Rechercher par code ou intitulé..."
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
                                    <SelectItem value="">Tous les types</SelectItem>
                                    {typesJournal.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
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
                                    <SelectItem value="">Tous les statuts</SelectItem>
                                    <SelectItem value="ACTIF">Actif</SelectItem>
                                    <SelectItem value="INACTIF">Inactif</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tableau des journaux */}
            <Card>
                <CardHeader>
                    <CardTitle>Liste des journaux</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {filteredJournaux.length} journal{filteredJournaux.length !== 1 ? "x" : ""} trouvé
                        {filteredJournaux.length !== 1 ? "s" : ""}
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Intitulé</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Compte associé</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Utilisation</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredJournaux.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Aucun journal trouvé
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredJournaux.map((journal) => (
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
                                                        {journal.compteAssocie?.codeCompte}
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {journal.compteAssocie?.intitule}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatutBadge(journal.statut)}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>Opérations: {journal.nombreOperations || 0}</div>
                                                    <div>Écritures: {journal.nombreEcritures || 0}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {journal.statut === "ACTIF" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDesactiver(journal.id!)}
                                                            disabled={!journal.peutEtreSupprime}
                                                            title={
                                                                !journal.peutEtreSupprime
                                                                    ? "Impossible de désactiver un journal utilisé"
                                                                    : "Désactiver"
                                                            }
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleReactiver(journal.id!)}
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    {journal.estVerrouille ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDeverrouiller(journal.id!)}
                                                        >
                                                            <Unlock className="w-4 h-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleVerrouiller(journal.id!)}
                                                        >
                                                            <Lock className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(journal)}
                                                        disabled={!journal.peutEtreModifie}
                                                        title={
                                                            !journal.peutEtreModifie
                                                                ? "Impossible de modifier un journal verrouillé ou utilisé"
                                                                : "Modifier"
                                                        }
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(journal.id!)}
                                                        disabled={!journal.peutEtreSupprime}
                                                        title={
                                                            !journal.peutEtreSupprime
                                                                ? "Impossible de supprimer un journal utilisé"
                                                                : "Supprimer"
                                                        }
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

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

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
                                {editMode && formData.hasBeenUsed && (
                                    <p className="text-sm text-yellow-600">
                                        ⚠️ Le code ne peut plus être modifié car le journal a été utilisé
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="typeJournal">
                                    Type de journal <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.typeJournal}
                                    onValueChange={(value: JournalTresorerie["typeJournal"]) =>
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
                                <p className="text-sm text-muted-foreground">
                                    Classe comptable requise: {getClasseRequise(formData.typeJournal)}
                                </p>
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
                                    {getPlansComptablesFiltres().map((pc) => (
                                        <SelectItem key={pc.id} value={pc.id.toString()}>
                                            {pc.codeFormate} - {pc.intitule} ({pc.typeCompte})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editMode && formData.hasBeenUsed && (
                                <p className="text-sm text-yellow-600">
                                    ⚠️ Le compte associé ne peut plus être modifié car le journal a été utilisé
                                </p>
                            )}
                            {getPlansComptablesFiltres().length === 0 && (
                                <p className="text-sm text-destructive">
                                    Aucun compte comptable de classe {getClasseRequise(formData.typeJournal)} disponible
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="statut">Statut</Label>
                                <Select
                                    value={formData.statut}
                                    onValueChange={(value: JournalTresorerie["statut"]) =>
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
                                        Empêche les modifications non autorisées
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
                                placeholder="Description du journal (facultatif)"
                                rows={3}
                                disabled={submitting}
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={submitting}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={submitting} className="gap-2">
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {editMode ? "Modification..." : "Création..."}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {editMode ? "Modifier le journal" : "Créer le journal"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Informations sur les règles de gestion */}
            <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                    <div className="font-semibold mb-2">Règles de gestion :</div>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Le code journal doit être unique et ne peut être modifié après utilisation</li>
                        <li>Le compte associé doit être un compte de trésorerie (classe 5)</li>
                        <li>Un journal utilisé ne peut être supprimé, seulement désactivé</li>
                        <li>Un journal verrouillé ne peut être modifié que par des utilisateurs autorisés</li>
                        <li>Cohérence comptable : Banque → classe 52, Caisse → classe 57, Autres → classe 58</li>
                    </ul>
                </AlertDescription>
            </Alert>
        </div>
    );
};

export default JournalTresorerie;