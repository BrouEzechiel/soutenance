import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Save,
    Edit,
    Eye,
    PlusCircle,
    ArrowLeft,
    CheckCircle,
    XCircle,
    List,
    Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Interface alignée avec l'Entity Symfony exactement
interface SocieteFormData {
    id?: number;
    raisonSociale: string;
    forme?: string;
    activites?: string;
    registreCommerce: string;
    compteContribuable: string;
    telephone?: string;
    anneeDebutActivite?: number;
    adresse?: string;
    siegeSocial?: string;
    capitalSocial?: string;
    gerant?: string;
    deviseParDefaut: string; // ID de la devise
    emailContact?: string;
    statut: string;
}

interface Devise {
    id: number;
    code: string;
    symbole: string;
    nom: string;
}

interface Societe {
    id: number;
    raisonSociale: string;
    forme?: string;
    statut: string;
    deviseParDefaut?: {
        id: number;
        code: string;
        symbole: string;
        nom: string;
    };
}

const CreationSociete = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    // États pour gérer les modes
    const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
    const [loading, setLoading] = useState(false);
    const [devises, setDevises] = useState<Devise[]>([]);
    const [societes, setSocietes] = useState<Societe[]>([]);
    const [selectedSocieteId, setSelectedSocieteId] = useState<number | null>(null);
    const [loadingSocietes, setLoadingSocietes] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [societeToDelete, setSocieteToDelete] = useState<number | null>(null);

    // Initialisation du formulaire alignée avec l'Entity
    const [form, setForm] = useState<SocieteFormData>({
        raisonSociale: "",
        forme: "",
        activites: "",
        registreCommerce: "",
        compteContribuable: "",
        telephone: "",
        anneeDebutActivite: undefined,
        adresse: "",
        siegeSocial: "",
        capitalSocial: "",
        gerant: "",
        deviseParDefaut: "",
        emailContact: "",
        statut: "ACTIF"
    });

    // Constantes alignées avec l'Entity Symfony
    const FORMES_JURIDIQUES = [
        { value: "INDIVIDUELLE", label: "Entreprise individuelle" },
        { value: "SARL", label: "SARL (Société à Responsabilité Limitée)" },
        { value: "SA", label: "SA (Société Anonyme)" },
        { value: "SAS", label: "SAS (Société par Actions Simplifiée)" },
        { value: "EURL", label: "EURL (Entreprise Unipersonnelle à Responsabilité Limitée)" },
        { value: "SNC", label: "SNC (Société en Nom Collectif)" },
        { value: "SCS", label: "SCS (Société en Commandite Simple)" },
        { value: "AUTRE", label: "Autre forme juridique" }
    ];

    const STATUTS = [
        { value: "ACTIF", label: "Actif" },
        { value: "INACTIF", label: "Inactif" },
        { value: "SUSPENDED", label: "Suspendue" }
    ];

    // Charger les devises
    useEffect(() => {
        const fetchDevises = async () => {
            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    toast({
                        title: "Erreur",
                        description: "Vous devez être connecté",
                        variant: "destructive"
                    });
                    return;
                }

                const response = await fetch("http://127.0.0.1:8000/api/devises", {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Accept": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Gérer les deux formats de réponse possibles
                    if (Array.isArray(data)) {
                        setDevises(data);
                    } else if (data.data && Array.isArray(data.data)) {
                        setDevises(data.data);
                    }
                } else {
                    console.error("Erreur API devises:", response.status);
                }
            } catch (error) {
                console.error("Erreur chargement devises:", error);
            }
        };

        fetchDevises();
    }, [toast]);

    // Charger la liste des sociétés au chargement initial
    useEffect(() => {
        fetchSocietes();
    }, []);

    const fetchSocietes = async () => {
        try {
            setLoadingSocietes(true);
            const token = localStorage.getItem("token");

            if (!token) {
                toast({
                    title: "Erreur",
                    description: "Vous devez être connecté",
                    variant: "destructive"
                });
                return;
            }

            const response = await fetch("http://127.0.0.1:8000/api/societes", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    setSocietes(data.data);
                }
            } else {
                toast({
                    title: "Erreur",
                    description: "Impossible de charger la liste des sociétés",
                    variant: "destructive"
                });
                setSocietes([]);
            }
        } catch (error) {
            console.error("Erreur chargement sociétés:", error);
            toast({
                title: "Erreur",
                description: "Erreur lors du chargement des sociétés",
                variant: "destructive"
            });
            setSocietes([]);
        } finally {
            setLoadingSocietes(false);
        }
    };

    const fetchSocieteDetails = async (id: number) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            if (!token) {
                toast({
                    title: "Erreur",
                    description: "Vous devez être connecté",
                    variant: "destructive"
                });
                return;
            }

            const response = await fetch(`http://127.0.0.1:8000/api/societes/${id}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                const societeData = data.data || data;

                // Mise à jour alignée avec l'Entity
                setForm({
                    id: societeData.id,
                    raisonSociale: societeData.raisonSociale || "",
                    forme: societeData.forme || "",
                    activites: societeData.activites || "",
                    registreCommerce: societeData.registreCommerce || "",
                    compteContribuable: societeData.compteContribuable || "",
                    telephone: societeData.telephone || "",
                    anneeDebutActivite: societeData.anneeDebutActivite || undefined,
                    adresse: societeData.adresse || "",
                    siegeSocial: societeData.siegeSocial || "",
                    capitalSocial: societeData.capitalSocial || "",
                    gerant: societeData.gerant || "",
                    deviseParDefaut: societeData.deviseParDefaut?.id?.toString() || "",
                    emailContact: societeData.emailContact || "",
                    statut: societeData.statut || "ACTIF"
                });

                setSelectedSocieteId(id);
            } else {
                throw new Error("Impossible de charger les détails de la société");
            }
        } catch (error: any) {
            console.error("Erreur chargement société:", error);
            toast({
                title: "Erreur",
                description: error.message || "Erreur lors du chargement de la société",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;

        // Conversion pour les champs numériques
        if (id === 'anneeDebutActivite') {
            const numValue = value === '' ? undefined : parseInt(value);
            if (numValue === undefined || (!isNaN(numValue) && numValue >= 1900 && numValue <= 2100)) {
                setForm(prev => ({
                    ...prev,
                    [id]: numValue
                }));
            }
        } else if (id === 'capitalSocial') {
            setForm(prev => ({
                ...prev,
                [id]: value
            }));
        } else {
            setForm(prev => ({
                ...prev,
                [id]: value
            }));
        }
    };

    const handleSelect = (name: keyof SocieteFormData, value: string) => {
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation alignée avec l'Entity
            const errors: string[] = [];

            if (!form.raisonSociale.trim()) {
                errors.push("La raison sociale est obligatoire");
            }
            if (!form.registreCommerce.trim()) {
                errors.push("Le numéro de registre de commerce est obligatoire");
            }
            if (!form.compteContribuable.trim()) {
                errors.push("Le compte contribuable est obligatoire");
            }
            if (!form.deviseParDefaut) {
                errors.push("La devise par défaut est obligatoire");
            }
            if (form.raisonSociale.length < 2) {
                errors.push("La raison sociale doit contenir au moins 2 caractères");
            }
            if (form.telephone && !/^[\+]?[0-9\s\-\(\)]+$/.test(form.telephone)) {
                errors.push("Numéro de téléphone invalide");
            }
            if (form.anneeDebutActivite && (form.anneeDebutActivite < 1900 || form.anneeDebutActivite > 2100)) {
                errors.push("L'année doit être entre 1900 et 2100");
            }

            if (errors.length > 0) {
                toast({
                    title: "Erreurs de validation",
                    description: errors.join("\n"),
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            const token = localStorage.getItem("token");
            if (!token) {
                toast({
                    title: "Erreur",
                    description: "Vous devez être connecté",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            // Préparer les données - EXACTEMENT comme l'Entity les attend
            const dataToSend: any = {
                raisonSociale: form.raisonSociale.trim(),
                registreCommerce: form.registreCommerce.trim(),
                compteContribuable: form.compteContribuable.trim(),
                deviseParDefaut: parseInt(form.deviseParDefaut),
                statut: form.statut
            };

            // Ajouter les champs optionnels s'ils ont une valeur
            const optionalFields: Partial<Record<keyof SocieteFormData, any>> = {
                forme: form.forme?.trim(),
                activites: form.activites?.trim(),
                telephone: form.telephone?.trim(),
                anneeDebutActivite: form.anneeDebutActivite,
                adresse: form.adresse?.trim(),
                siegeSocial: form.siegeSocial?.trim(),
                capitalSocial: form.capitalSocial?.trim(),
                gerant: form.gerant?.trim(),
                emailContact: form.emailContact?.trim()
            };

            Object.entries(optionalFields).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    dataToSend[key] = value;
                }
            });

            const url = mode === 'edit' && form.id
                ? `http://127.0.0.1:8000/api/societes/${form.id}`
                : "http://127.0.0.1:8000/api/societes";

            const method = mode === 'edit' ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                },
                body: JSON.stringify(dataToSend)
            });

            const responseData = await response.json();

            if (!response.ok) {
                // Gérer les erreurs de validation Symfony
                if (response.status === 400 && responseData.errors) {
                    const errorMessages = responseData.errors
                        .map((err: any) => `${err.field}: ${err.message}`)
                        .join('\n');
                    throw new Error(`Erreurs de validation:\n${errorMessages}`);
                }

                const errorMsg = responseData?.message || `Erreur ${response.status}`;
                throw new Error(errorMsg);
            }

            toast({
                title: "Succès",
                description: mode === 'edit'
                    ? "La société a été mise à jour avec succès."
                    : "La société a été créée avec succès."
            });

            // Recharger la liste et revenir à la liste
            await fetchSocietes();
            setMode('list');
            resetForm();

        } catch (error: any) {
            console.error("Erreur:", error);
            toast({
                title: "Erreur",
                description: error.message || "Une erreur est survenue",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            raisonSociale: "",
            forme: "",
            activites: "",
            registreCommerce: "",
            compteContribuable: "",
            telephone: "",
            anneeDebutActivite: undefined,
            adresse: "",
            siegeSocial: "",
            capitalSocial: "",
            gerant: "",
            deviseParDefaut: "",
            emailContact: "",
            statut: "ACTIF"
        });
        setSelectedSocieteId(null);
    };

    const handleViewSociete = (id: number) => {
        fetchSocieteDetails(id);
        setMode('view');
    };

    const handleEditSociete = (id: number) => {
        fetchSocieteDetails(id);
        setMode('edit');
    };

    const handleCreateSociete = () => {
        resetForm();
        setMode('create');
    };

    const handleDeleteSociete = async (id: number) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            if (!token) {
                toast({
                    title: "Erreur",
                    description: "Vous devez être connecté",
                    variant: "destructive"
                });
                return;
            }

            // D'abord vérifier si la société peut être supprimée
            const checkResponse = await fetch(`http://127.0.0.1:8000/api/societes/${id}/check-deletion`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                if (!checkData.data.canDelete) {
                    toast({
                        title: "Impossible de supprimer",
                        description: "La société a des données associées (comptes, exercices, opérations)",
                        variant: "destructive"
                    });
                    return;
                }
            }

            // Si ok, procéder à la suppression
            const response = await fetch(`http://127.0.0.1:8000/api/societes/${id}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            if (response.ok) {
                toast({
                    title: "Succès",
                    description: "Société supprimée avec succès"
                });
                await fetchSocietes();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Erreur lors de la suppression");
            }
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message || "Erreur lors de la suppression",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
            setSocieteToDelete(null);
        }
    };

    const confirmDelete = (id: number) => {
        setSocieteToDelete(id);
        setShowDeleteConfirm(true);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setSocieteToDelete(null);
    };

    // Mode LISTE
    if (mode === 'list') {
        return (
            <MainLayout>
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Gestion des Sociétés</h1>
                            <p className="text-muted-foreground">
                                Liste de toutes les sociétés enregistrées dans le système
                            </p>
                        </div>

                        <Button
                            type="button"
                            onClick={handleCreateSociete}
                            className="gap-2"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Nouvelle Société
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Liste des Sociétés</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingSocietes ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    <p className="mt-2 text-muted-foreground">Chargement des sociétés...</p>
                                </div>
                            ) : societes.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">Aucune société trouvée</p>
                                    <Button
                                        type="button"
                                        onClick={handleCreateSociete}
                                        className="mt-4 gap-2"
                                        variant="outline"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Créer la première société
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {societes.map((societe) => (
                                            <Card key={societe.id} className="hover:shadow-md transition-shadow">
                                                <CardContent className="pt-6">
                                                    <div className="space-y-3">
                                                        <div className="flex items-start justify-between">
                                                            <h3 className="font-semibold text-lg">{societe.raisonSociale}</h3>
                                                            <span className={`text-xs px-2 py-1 rounded ${societe.statut === 'ACTIF'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : societe.statut === 'INACTIF'
                                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                                            }`}>
                                                                {societe.statut === 'ACTIF' ? 'Actif' :
                                                                    societe.statut === 'INACTIF' ? 'Inactif' : 'Suspendu'}
                                                            </span>
                                                        </div>

                                                        <div className="text-sm text-muted-foreground space-y-1">
                                                            {societe.forme && (
                                                                <p>Forme: {FORMES_JURIDIQUES.find(f => f.value === societe.forme)?.label || societe.forme}</p>
                                                            )}
                                                            {societe.deviseParDefaut && (
                                                                <p>Devise: {societe.deviseParDefaut.code} ({societe.deviseParDefaut.symbole})</p>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2 pt-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleViewSociete(societe.id)}
                                                                className="flex-1 gap-1"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                Consulter
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEditSociete(societe.id)}
                                                                className="flex-1 gap-1"
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                                Modifier
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => confirmDelete(societe.id)}
                                                                className="gap-1"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Modal de confirmation de suppression */}
                {showDeleteConfirm && societeToDelete && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <Card className="w-full max-w-md mx-4">
                            <CardHeader>
                                <CardTitle className="text-red-600">Confirmer la suppression</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-4">
                                    Êtes-vous sûr de vouloir supprimer cette société ? Cette action est irréversible.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={cancelDelete}
                                        disabled={loading}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() => handleDeleteSociete(societeToDelete)}
                                        disabled={loading}
                                    >
                                        {loading ? 'Suppression...' : 'Supprimer'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </MainLayout>
        );
    }

    // Mode CRÉATION, ÉDITION ou CONSULTATION
    return (
        <MainLayout>
            <div className="space-y-6">
                {/* En-tête avec boutons de mode */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            {mode === 'create' ? 'Création de Société' :
                                mode === 'edit' ? 'Modification de Société' :
                                    'Consultation de Société'}
                        </h1>
                        <p className="text-muted-foreground">
                            {mode === 'create' ? 'Paramétrez les informations légales de votre entreprise' :
                                mode === 'edit' ? 'Modifiez les informations de la société' :
                                    'Consultez les informations de la société'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMode('list')}
                            className="gap-2"
                        >
                            <List className="w-4 h-4" />
                            Retour à la liste
                        </Button>

                        {mode === 'view' && selectedSocieteId && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleEditSociete(selectedSocieteId)}
                                className="gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Modifier
                            </Button>
                        )}
                    </div>
                </div>

                {/* Indicateur de mode */}
                <div className={`px-4 py-2 rounded-md ${mode === 'create' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
                    mode === 'edit' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
                        'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                }`}>
                    <div className="flex items-center gap-2">
                        {mode === 'create' ? (
                            <>
                                <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-blue-700 dark:text-blue-300 font-medium">
                                    Mode Création
                                </span>
                            </>
                        ) : mode === 'edit' ? (
                            <>
                                <Edit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-amber-700 dark:text-amber-300 font-medium">
                                    Mode Modification
                                </span>
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-green-700 dark:text-green-300 font-medium">
                                    Mode Consultation (Lecture seule)
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Colonne 1: Informations légales */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Informations légales</CardTitle>
                                <p className="text-sm text-muted-foreground">Informations officielles et administratives</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="raisonSociale" className="required">
                                        Raison sociale
                                    </Label>
                                    <Input
                                        id="raisonSociale"
                                        value={form.raisonSociale}
                                        onChange={handleChange}
                                        required
                                        placeholder="Nom officiel de la société"
                                        disabled={loading || mode === 'view'}
                                        maxLength={255}
                                    />
                                    <p className="text-xs text-muted-foreground">Entre 2 et 255 caractères</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="forme">Forme juridique</Label>
                                        <Select
                                            onValueChange={(value) => handleSelect("forme", value)}
                                            value={form.forme}
                                            disabled={loading || mode === 'view'}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FORMES_JURIDIQUES.map((forme) => (
                                                    <SelectItem key={forme.value} value={forme.value}>
                                                        {forme.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="statut">Statut</Label>
                                        <Select
                                            onValueChange={(value) => handleSelect("statut", value)}
                                            value={form.statut}
                                            disabled={loading || mode === 'view'}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUTS.map((statut) => (
                                                    <SelectItem key={statut.value} value={statut.value}>
                                                        <div className="flex items-center gap-2">
                                                            {statut.value === 'ACTIF' && <CheckCircle className="w-4 h-4 text-green-600" />}
                                                            {statut.value === 'INACTIF' && <XCircle className="w-4 h-4 text-red-600" />}
                                                            <span>{statut.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="activites">Activités principales</Label>
                                    <Textarea
                                        id="activites"
                                        value={form.activites}
                                        onChange={handleChange}
                                        placeholder="Description des activités de l'entreprise"
                                        rows={2}
                                        disabled={loading || mode === 'view'}
                                        maxLength={255}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="registreCommerce" className="required">
                                            Registre de commerce
                                        </Label>
                                        <Input
                                            id="registreCommerce"
                                            value={form.registreCommerce}
                                            onChange={handleChange}
                                            required
                                            placeholder="RCCM"
                                            disabled={loading || mode === 'view'}
                                            maxLength={50}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="compteContribuable" className="required">
                                            Compte contribuable
                                        </Label>
                                        <Input
                                            id="compteContribuable"
                                            value={form.compteContribuable}
                                            onChange={handleChange}
                                            required
                                            placeholder="NIF"
                                            disabled={loading || mode === 'view'}
                                            maxLength={50}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="anneeDebutActivite">Année début activité</Label>
                                        <Input
                                            id="anneeDebutActivite"
                                            type="number"
                                            min="1900"
                                            max="2100"
                                            value={form.anneeDebutActivite || ''}
                                            onChange={handleChange}
                                            placeholder="2024"
                                            disabled={loading || mode === 'view'}
                                        />
                                        <p className="text-xs text-muted-foreground">Entre 1900 et 2100</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="capitalSocial">Capital social</Label>
                                        <Input
                                            id="capitalSocial"
                                            value={form.capitalSocial}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            disabled={loading || mode === 'view'}
                                        />
                                        <p className="text-xs text-muted-foreground">Valeur positive ou zéro</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Colonne 2: Contacts et configuration */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Contacts et configuration</CardTitle>
                                <p className="text-sm text-muted-foreground">Coordonnées et paramètres système</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="deviseParDefaut" className="required">
                                        Devise par défaut
                                    </Label>
                                    <Select
                                        onValueChange={(value) => handleSelect("deviseParDefaut", value)}
                                        value={form.deviseParDefaut}
                                        required
                                        disabled={loading || mode === 'view'}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner une devise" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {devises.map((devise) => (
                                                <SelectItem key={devise.id} value={devise.id.toString()}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{devise.code}</span>
                                                        <span className="text-muted-foreground">{devise.nom}</span>
                                                        <span className="ml-2">{devise.symbole}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="gerant">Gérant / Directeur</Label>
                                    <Input
                                        id="gerant"
                                        value={form.gerant}
                                        onChange={handleChange}
                                        placeholder="Nom et prénom du responsable"
                                        disabled={loading || mode === 'view'}
                                        maxLength={100}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="telephone">Téléphone</Label>
                                        <Input
                                            id="telephone"
                                            value={form.telephone}
                                            onChange={handleChange}
                                            placeholder="+XXX XX XXX XXX"
                                            disabled={loading || mode === 'view'}
                                            maxLength={20}
                                        />
                                        <p className="text-xs text-muted-foreground">Formats acceptés: +XXX XX XXX XXX</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="emailContact">Email de contact</Label>
                                        <Input
                                            id="emailContact"
                                            type="email"
                                            value={form.emailContact}
                                            onChange={handleChange}
                                            placeholder="contact@societe.com"
                                            disabled={loading || mode === 'view'}
                                            maxLength={100}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="adresse">Adresse postale</Label>
                                    <Textarea
                                        id="adresse"
                                        value={form.adresse}
                                        onChange={handleChange}
                                        placeholder="Adresse complète"
                                        rows={2}
                                        disabled={loading || mode === 'view'}
                                        maxLength={255}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="siegeSocial">Siège social</Label>
                                    <Textarea
                                        id="siegeSocial"
                                        value={form.siegeSocial}
                                        onChange={handleChange}
                                        placeholder="Siège social (si différent de l'adresse)"
                                        rows={2}
                                        disabled={loading || mode === 'view'}
                                        maxLength={255}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Boutons d'action */}
                    <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                            <span className="text-destructive">*</span> Champ obligatoire
                            {mode === 'view' && " - Mode consultation (lecture seule)"}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMode('list')}
                                disabled={loading}
                                className="gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Retour à la liste
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={loading || mode === 'view'}
                            >
                                Réinitialiser
                            </Button>

                            {mode !== 'view' && (
                                <Button
                                    type="submit"
                                    className={`gap-2 ${mode === 'edit' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                                    disabled={loading}
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                                            {mode === 'create' ? 'Création...' : 'Mise à jour...'}
                                        </span>
                                    ) : (
                                        mode === 'create' ? 'Créer la société' : 'Mettre à jour'
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Style pour les labels obligatoires */}
            <style>{`
                .required::after {
                    content: " *";
                    color: rgb(239, 68, 68);
                }
            `}</style>
        </MainLayout>
    );
};

export default CreationSociete;