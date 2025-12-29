// src/pages/ParametresBancaires.tsx
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
    Calculator,
    CreditCard,
    Percent,
    DollarSign,
    AlertTriangle,
    Building,
    RefreshCw,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight,
    Copy,
    FileText,
    Banknote,
    Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://127.0.0.1:8000/api/parametres-bancaires";
const COMPTES_URL = "http://127.0.0.1:8000/api/comptes-tresorerie";

// Helper pour parser les réponses JSON de manière sécurisée
const safeJson = async (res: Response) => {
    try {
        const txt = await res.text();
        const trimmed = txt.trim();
        if (trimmed.startsWith('<')) {
            console.error('Expected JSON but received HTML:', trimmed.substring(0, 500));
            return null;
        }
        return JSON.parse(trimmed);
    } catch (e) {
        console.error('Failed to parse JSON response', e);
        return null;
    }
};

// Wrapper fetch centralisé avec gestion de l'authentification et des erreurs 401
const fetchJson = async (url: string, opts: RequestInit = {}, navigate?: any, toast?: any) => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || null;
    const headers: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) };
    if (!headers['Content-Type'] && opts.body && typeof opts.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...opts, headers });
    // Gestion des erreurs 401 (token expiré/invalide)
    if (res.status === 401) {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
        } catch (e) {
            // ignore
        }
        if (toast) {
            toast({
                title: "Session expirée",
                description: "Veuillez vous reconnecter",
                variant: "destructive"
            });
        }
        if (navigate) {
            navigate('/login');
        } else if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/login';
        }
    }
    return res;
};

// Types alignés avec l'entité ParametreCompteBancaire
type ParametreCompteBancaire = {
    id: number;
    seuilDecouvertAutorise: string;
    decouvertAutorise: boolean;
    plafondTransaction: string | null;
    fraisTenueCompte: string;
    typeFraisTenueCompte: "FIXE" | "VARIABLE";
    formuleFraisTenueCompte: string | null;
    periodiciteFraisTenueCompte: "MENSUEL" | "TRIMESTRIEL" | "SEMESTRIEL" | "ANNUEL" | null;
    tauxAgios: string;
    modeCalculAgios: "TAUX" | "MONTANT_FIXE";
    commissionOperation: string;
    typeCommission: "FIXE" | "VARIABLE" | "POURCENTAGE";
    tauxCommission: string | null;
    fraisRejet: string;
    autresFrais: string;
    descriptionAutresFrais: string | null;
    appliquerFraisAutomatiquement: boolean;
    createdAt: string;
    updatedAt: string;

    // Relation
    compteTresorerie: {
        id: number;
        intitule: string;
        numeroCompte: string;
        typeCompte: string;
        typeCompteLibelle: string;
        soldeActuel: string;
        soldeActuelFormate: string;
        statut: string;
        statutLibelle: string;
        banqueNom?: string;
        deviseCode?: string;
        badgeColor: string;
        devise?: {
            id: number;
            code: string;
            intitule: string;
            symbole: string;
        };
    };
};

type CompteTresorerie = {
    id: number;
    intitule: string;
    numeroCompte: string;
    typeCompte: string;
    typeCompteLibelle: string;
    soldeActuel: string;
    soldeActuelFormate: string;
    statut: string;
    statutLibelle: string;
    banqueNom?: string;
    deviseCode?: string;
    badgeColor: string;
    devise?: {
        id: number;
        code: string;
        intitule: string;
        symbole: string;
    };
};

type FormState = {
    compteTresorerie: { id: number } | null;
    seuilDecouvertAutorise: string;
    decouvertAutorise: boolean;
    plafondTransaction: string;
    fraisTenueCompte: string;
    typeFraisTenueCompte: "FIXE" | "VARIABLE";
    formuleFraisTenueCompte: string;
    periodiciteFraisTenueCompte: "MENSUEL" | "TRIMESTRIEL" | "SEMESTRIEL" | "ANNUEL" | "";
    tauxAgios: string;
    modeCalculAgios: "TAUX" | "MONTANT_FIXE";
    commissionOperation: string;
    typeCommission: "FIXE" | "VARIABLE" | "POURCENTAGE";
    tauxCommission: string;
    fraisRejet: string;
    autresFrais: string;
    descriptionAutresFrais: string;
    appliquerFraisAutomatiquement: boolean;
};

type PaginationMeta = {
    total: number;
    page: number;
    limit: number;
    pages: number;
    societe?: {
        id: number;
        raisonSociale: string;
    };
};

type CalculFraisData = {
    fraisMensuels: number;
    agios: number;
    commissionExemple: number;
    totalEstime: number;
    details: {
        frais_tenue_compte: {
            montant: number;
            type: string;
            periodicite: string | null;
            formule: string | null;
        };
        agios: {
            taux: number;
            mode_calcul: string;
        };
        commissions: {
            montant: number;
            type: string;
            taux: number | null;
        };
        frais_rejet: number;
        autres_frais: {
            montant: number;
            description: string | null;
        };
        decouvert: {
            autorise: boolean;
            seuil: number;
        };
        plafond_transaction: number | null;
    };
    decouvertAutorise: boolean;
    compte: {
        id: number;
        intitule: string;
        societe: {
            id: number;
            raisonSociale: string;
        };
    };
};

const ParametresBancaires = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [parametres, setParametres] = useState<ParametreCompteBancaire[]>([]);
    const [comptes, setComptes] = useState<CompteTresorerie[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingComptes, setLoadingComptes] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>({
        compteTresorerie: null,
        seuilDecouvertAutorise: "0",
        decouvertAutorise: false,
        plafondTransaction: "",
        fraisTenueCompte: "0",
        typeFraisTenueCompte: "FIXE",
        formuleFraisTenueCompte: "",
        periodiciteFraisTenueCompte: "",
        tauxAgios: "0",
        modeCalculAgios: "TAUX",
        commissionOperation: "0",
        typeCommission: "FIXE",
        tauxCommission: "",
        fraisRejet: "0",
        autresFrais: "0",
        descriptionAutresFrais: "",
        appliquerFraisAutomatiquement: true,
    });

    // États pour la pagination et filtres
    const [pagination, setPagination] = useState<PaginationMeta>({
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // États pour les dialogues
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [parametreToDelete, setParametreToDelete] = useState<ParametreCompteBancaire | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedParametre, setSelectedParametre] = useState<ParametreCompteBancaire | null>(null);
    const [calculDialogOpen, setCalculDialogOpen] = useState(false);
    const [calculData, setCalculData] = useState<CalculFraisData | null>(null);
    const [montantDecouvert, setMontantDecouvert] = useState<string>("0");
    const [joursDecouvert, setJoursDecouvert] = useState<string>("0");
    const [calculating, setCalculating] = useState(false);
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [parametreToDuplicate, setParametreToDuplicate] = useState<ParametreCompteBancaire | null>(null);
    const [targetCompteId, setTargetCompteId] = useState<string>("");

    const token = localStorage.getItem("token") ?? "";

    const resetForm = () => {
        setEditingId(null);
        setForm({
            compteTresorerie: null,
            seuilDecouvertAutorise: "0",
            decouvertAutorise: false,
            plafondTransaction: "",
            fraisTenueCompte: "0",
            typeFraisTenueCompte: "FIXE",
            formuleFraisTenueCompte: "",
            periodiciteFraisTenueCompte: "",
            tauxAgios: "0",
            modeCalculAgios: "TAUX",
            commissionOperation: "0",
            typeCommission: "FIXE",
            tauxCommission: "",
            fraisRejet: "0",
            autresFrais: "0",
            descriptionAutresFrais: "",
            appliquerFraisAutomatiquement: true,
        });
    };

    const authHeaders = (): HeadersInit => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    });

    const handleUnauthorized = () => {
        toast({
            title: "Non autorisé",
            description: "Veuillez vous reconnecter.",
            variant: "destructive"
        });
        navigate("/login");
    };

    const fetchParametres = async (page = pagination.page, search = searchTerm) => {
        if (!token) return handleUnauthorized();

        setLoading(true);
        try {
            let url = `${API_URL}?page=${page}&limit=${pagination.limit}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            console.log('Fetching URL:', url); // Pour debug

            const res = await fetchJson(url, {}, navigate, toast);

            console.log('Response status:', res.status); // Pour debug

            if (res.status === 401) return handleUnauthorized();

            if (!res.ok) {
                // Essayez de lire l'erreur détaillée
                let errorMessage = `Erreur ${res.status}`;
                try {
                    const errorData = await res.json();
                    console.error('Error data:', errorData);
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    const errorText = await res.text();
                    console.error('Error text:', errorText);
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const response = await res.json();
            console.log('Full response:', response); // Pour debug

            // Le backend retourne maintenant {success, data, meta, societe}
            if (response.success) {
                setParametres(response.data || []);
                setPagination({
                    total: response.meta?.total || 0,
                    page: response.meta?.page || page,
                    limit: response.meta?.limit || pagination.limit,
                    pages: response.meta?.pages || Math.ceil((response.meta?.total || 0) / (response.meta?.limit || pagination.limit)),
                    societe: response.societe || undefined
                });
            } else {
                // Si success est false
                throw new Error(response.error || 'Erreur inconnue du serveur');
            }
        } catch (err: any) {
            console.error('Fetch error details:', err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de charger les paramètres bancaires.",
                variant: "destructive"
            });
            setParametres([]);
            // Réinitialiser la pagination en cas d'erreur
            setPagination({
                total: 0,
                page: 1,
                limit: 20,
                pages: 0,
                societe: undefined
            });
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const fetchComptesActifs = async () => {
        if (!token) return handleUnauthorized();

        setLoadingComptes(true);
        try {
            const res = await fetchJson(`${COMPTES_URL}/actifs`, {}, navigate, toast);

            if (res.status === 401) return handleUnauthorized();
            if (!res.ok) throw new Error(`Erreur ${res.status}`);

            const data = await res.json();
            // Le backend retourne {data: [...], count: X, peutModifier: boolean}
            setComptes(data.data || []);
        } catch (err) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de charger les comptes.",
                variant: "destructive"
            });
            setComptes([]);
        } finally {
            setLoadingComptes(false);
        }
    };

    useEffect(() => {
        fetchParametres();
        fetchComptesActifs();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm(prev => ({
            ...prev,
            [id]: value,
            ...(id === 'typeFraisTenueCompte' && value === 'FIXE' ? { formuleFraisTenueCompte: '' } : {}),
            ...(id === 'typeCommission' && value !== 'POURCENTAGE' ? { tauxCommission: '' } : {})
        }));
    };

    const handleSelectChange = (field: string, value: string) => {
        setForm(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'typeFraisTenueCompte' && value === 'FIXE' ? { formuleFraisTenueCompte: '' } : {}),
            ...(field === 'typeCommission' && value !== 'POURCENTAGE' ? { tauxCommission: '' } : {})
        }));
    };

    const handleCompteChange = (compteId: string) => {
        const compte = comptes.find(c => c.id.toString() === compteId);
        setForm(prev => ({
            ...prev,
            compteTresorerie: compte ? { id: compte.id } : null
        }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormState) => {
        const value = e.target.value;
        // Validation: seulement nombres avec jusqu'à 2 décimales
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            setForm(prev => ({ ...prev, [field]: value }));
        }
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!form.compteTresorerie) {
            errors.push("Le compte de trésorerie est obligatoire");
        }

        if (parseFloat(form.seuilDecouvertAutorise) < 0) {
            errors.push("Le seuil de découvert ne peut pas être négatif");
        }

        if (form.plafondTransaction && parseFloat(form.plafondTransaction) < 0) {
            errors.push("Le plafond de transaction ne peut pas être négatif");
        }

        if (parseFloat(form.fraisTenueCompte) < 0) {
            errors.push("Les frais de tenue de compte ne peuvent pas être négatifs");
        }

        if (parseFloat(form.tauxAgios) < 0 || parseFloat(form.tauxAgios) > 100) {
            errors.push("Le taux d'agios doit être entre 0 et 100%");
        }

        if (parseFloat(form.commissionOperation) < 0) {
            errors.push("La commission ne peut pas être négative");
        }

        if (form.typeCommission === "POURCENTAGE") {
            if (!form.tauxCommission) {
                errors.push("Le taux de commission est requis pour le type POURCENTAGE");
            } else if (parseFloat(form.tauxCommission) < 0 || parseFloat(form.tauxCommission) > 100) {
                errors.push("Le taux de commission doit être entre 0 et 100%");
            }
        }

        if (parseFloat(form.fraisRejet) < 0) {
            errors.push("Les frais de rejet ne peuvent pas être négatifs");
        }

        if (parseFloat(form.autresFrais) < 0) {
            errors.push("Les autres frais ne peuvent pas être négatifs");
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

        if (!token) return handleUnauthorized();

        const url = editingId ? `${API_URL}/${editingId}` : API_URL;
        const method = editingId ? "PUT" : "POST";

        // Préparer les données pour l'API
        const payload: any = {
            ...form,
            seuilDecouvertAutorise: form.seuilDecouvertAutorise || "0",
            fraisTenueCompte: form.fraisTenueCompte || "0",
            tauxAgios: form.tauxAgios || "0",
            commissionOperation: form.commissionOperation || "0",
            fraisRejet: form.fraisRejet || "0",
            autresFrais: form.autresFrais || "0",
            plafondTransaction: form.plafondTransaction || null,
            formuleFraisTenueCompte: form.formuleFraisTenueCompte || null,
            periodiciteFraisTenueCompte: form.periodiciteFraisTenueCompte || null,
            tauxCommission: form.typeCommission === "POURCENTAGE" ? form.tauxCommission : null,
            descriptionAutresFrais: form.descriptionAutresFrais || null,
        };

        // Pour la création, inclure le compteTresorerie sous forme d'objet avec id
        if (!editingId && form.compteTresorerie) {
            payload.compteTresorerie = { id: form.compteTresorerie.id };
        }

        try {
            const res = await fetchJson(url, {
                method,
                body: JSON.stringify(payload)
            }, navigate, toast);

            if (res.status === 401) return handleUnauthorized();

            const data = res.headers.get("content-type")?.includes("application/json")
                ? await res.json()
                : null;

            if (!res.ok) {
                const errorMessage = data?.error || data?.message || `Erreur ${res.status}`;
                // Gérer les erreurs de validation spécifiques
                if (data?.messages) {
                    const validationErrors = Object.values(data.messages).flat().join(" • ");
                    return toast({
                        title: "Erreur de validation",
                        description: validationErrors,
                        variant: "destructive"
                    });
                }
                return toast({
                    title: "Erreur",
                    description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
                    variant: "destructive"
                });
            }

            toast({
                title: editingId ? "Paramètres modifiés" : "Paramètres créés",
                description: "Configuration bancaire enregistrée avec succès"
            });

            resetForm();
            setShowForm(false);
            fetchParametres();
            fetchComptesActifs(); // Recharger les comptes car un compte peut maintenant avoir des paramètres

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible d'enregistrer les paramètres",
                variant: "destructive"
            });
        }
    };

    const handleEdit = (parametre: ParametreCompteBancaire) => {
        setForm({
            compteTresorerie: { id: parametre.compteTresorerie.id },
            seuilDecouvertAutorise: parametre.seuilDecouvertAutorise,
            decouvertAutorise: parametre.decouvertAutorise,
            plafondTransaction: parametre.plafondTransaction || "",
            fraisTenueCompte: parametre.fraisTenueCompte,
            typeFraisTenueCompte: parametre.typeFraisTenueCompte,
            formuleFraisTenueCompte: parametre.formuleFraisTenueCompte || "",
            periodiciteFraisTenueCompte: parametre.periodiciteFraisTenueCompte || "",
            tauxAgios: parametre.tauxAgios,
            modeCalculAgios: parametre.modeCalculAgios,
            commissionOperation: parametre.commissionOperation,
            typeCommission: parametre.typeCommission,
            tauxCommission: parametre.tauxCommission || "",
            fraisRejet: parametre.fraisRejet,
            autresFrais: parametre.autresFrais,
            descriptionAutresFrais: parametre.descriptionAutresFrais || "",
            appliquerFraisAutomatiquement: parametre.appliquerFraisAutomatiquement,
        });
        setEditingId(parametre.id);
        setShowForm(true);
    };

    const handleShowDetails = (parametre: ParametreCompteBancaire) => {
        setSelectedParametre(parametre);
        setDetailsDialogOpen(true);
    };

    const handleCalculFrais = async (parametre: ParametreCompteBancaire) => {
        if (!token) return handleUnauthorized();

        setCalculating(true);
        try {
            const url = `${API_URL}/compte/${parametre.compteTresorerie.id}/calcul-frais?montantDecouvert=${montantDecouvert}&joursDecouvert=${joursDecouvert}`;
            const res = await fetchJson(url, {}, navigate, toast);

            if (res.status === 401) return handleUnauthorized();
            if (!res.ok) throw new Error(`Erreur ${res.status}`);

            const data = await res.json();
            setCalculData(data);
            setSelectedParametre(parametre);
            setCalculDialogOpen(true);
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de calculer les frais",
                variant: "destructive"
            });
        } finally {
            setCalculating(false);
        }
    };

    const handleDuplicate = async () => {
        if (!parametreToDuplicate || !targetCompteId || !token) return;

        try {
            const url = `${API_URL}/compte/${parametreToDuplicate.compteTresorerie.id}/duplicate`;
            const res = await fetchJson(url, {
                method: "POST",
                body: JSON.stringify({ targetCompteId: parseInt(targetCompteId) })
            }, navigate, toast);

            if (res.status === 401) return handleUnauthorized();

            const data = res.headers.get("content-type")?.includes("application/json")
                ? await res.json()
                : null;

            if (!res.ok) {
                const errorMessage = data?.error || data?.message || `Erreur ${res.status}`;
                return toast({
                    title: "Erreur",
                    description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
                    variant: "destructive"
                });
            }

            toast({
                title: "Paramètres dupliqués",
                description: "Configuration copiée avec succès"
            });

            setDuplicateDialogOpen(false);
            setParametreToDuplicate(null);
            setTargetCompteId("");
            fetchParametres();
            fetchComptesActifs();

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de dupliquer les paramètres",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async () => {
        if (!parametreToDelete || !token) return;

        try {
            const res = await fetchJson(`${API_URL}/${parametreToDelete.id}`, {
                method: "DELETE"
            }, navigate, toast);

            if (res.status === 401) return handleUnauthorized();

            const data = res.headers.get("content-type")?.includes("application/json")
                ? await res.json()
                : null;

            if (!res.ok) {
                const errorMessage = data?.error || data?.message || `Erreur ${res.status}`;
                return toast({
                    title: "Erreur",
                    description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
                    variant: "destructive"
                });
            }

            toast({
                title: "Paramètres supprimés",
                description: "Configuration supprimée avec succès"
            });

            fetchParametres();
            fetchComptesActifs(); // Recharger les comptes car un compte peut maintenant être sans paramètres
            setDeleteDialogOpen(false);
            setParametreToDelete(null);

        } catch (err) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de supprimer les paramètres",
                variant: "destructive"
            });
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPagination(prev => ({ ...prev, page: newPage }));
            fetchParametres(newPage);
        }
    };

    const handleSearch = () => {
        setIsSearching(true);
        fetchParametres(1, searchTerm);
    };

    const handleClearFilters = () => {
        setSearchTerm("");
        fetchParametres(1, "");
    };

    const formatCurrency = (amount: string, currency: string = "MGA") => {
        const num = parseFloat(amount);
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num) + ` ${currency}`;
    };

    const formatPercent = (value: string) => {
        const num = parseFloat(value);
        return `${num.toFixed(3)}%`;
    };

    const getStatusBadge = (statut: string) => {
        const colors: Record<string, string> = {
            'ACTIF': 'bg-green-600',
            'INACTIF': 'bg-gray-100 text-gray-700',
            'CLOTURE': 'bg-red-100 text-red-700'
        };

        const text: Record<string, string> = {
            'ACTIF': 'Actif',
            'INACTIF': 'Inactif',
            'CLOTURE': 'Clôturé'
        };

        const color = colors[statut] || 'bg-gray-100 text-gray-700';
        const label = text[statut] || statut;

        return (
            <Badge variant="outline" className={color}>
                {statut === 'ACTIF' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                    statut === 'INACTIF' ? <XCircle className="w-3 h-3 mr-1" /> :
                        <AlertTriangle className="w-3 h-3 mr-1" />}
                {label}
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
            return dateString;
        }
    };

    const getComptesSansParametres = () => {
        const comptesAvecParametres = parametres.map(p => p.compteTresorerie.id);
        return comptes.filter(c => !comptesAvecParametres.includes(c.id));
    };

    const getCompteDevise = (compte: { deviseCode?: string, devise?: { code: string } }) => {
        return compte.devise?.code || compte.deviseCode || "MGA";
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Paramètres Bancaires</h1>
                        <p className="text-muted-foreground">
                            Configuration des frais, commissions et découverts pour les comptes
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchParametres()}
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
                            disabled={getComptesSansParametres().length === 0}
                        >
                            <Plus className="w-4 h-4" />
                            Nouveaux paramètres
                        </Button>
                    </div>
                </div>

                {/* Statistiques rapides */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total paramètres</p>
                                    <p className="text-2xl font-bold">{pagination.total}</p>
                                </div>
                                <FileText className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avec découvert</p>
                                    <p className="text-2xl font-bold">
                                        {parametres.filter(p => p.decouvertAutorise).length}
                                    </p>
                                </div>
                                <CreditCard className="w-8 h-8 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avec agios</p>
                                    <p className="text-2xl font-bold">
                                        {parametres.filter(p => parseFloat(p.tauxAgios) > 0).length}
                                    </p>
                                </div>
                                <Percent className="w-8 h-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Comptes sans paramètres</p>
                                    <p className="text-2xl font-bold">{getComptesSansParametres().length}</p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtres */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Recherche
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="search">Recherche par compte, banque ou numéro</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="search"
                                        placeholder="Intitulé du compte, nom de banque, numéro..."
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
                                <Label>&nbsp;</Label>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleClearFilters}
                                >
                                    Réinitialiser
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
                                        {editingId ? "Modifier les paramètres" : "Créer de nouveaux paramètres"}
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
                            <CardContent className="space-y-6">
                                {/* Sélection du compte */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Building className="w-5 h-5" />
                                        Compte de trésorerie
                                    </h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="compteTresorerie">Compte *</Label>
                                        <Select
                                            value={form.compteTresorerie?.id.toString() || ""}
                                            onValueChange={handleCompteChange}
                                            disabled={editingId !== null}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un compte" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {loadingComptes ? (
                                                    <SelectItem value="" disabled>Chargement...</SelectItem>
                                                ) : getComptesSansParametres().length === 0 ? (
                                                    <SelectItem value="" disabled>Tous les comptes ont des paramètres</SelectItem>
                                                ) : (
                                                    getComptesSansParametres().map(compte => (
                                                        <SelectItem key={compte.id} value={compte.id.toString()}>
                                                            {compte.intitule} - {compte.numeroCompte} ({compte.typeCompteLibelle})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {getComptesSansParametres().length === 0 && !loadingComptes && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Tous les comptes actifs de votre société ont déjà des paramètres configurés.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Découvert et limites */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        Découvert et limites
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="decouvertAutorise"
                                                    checked={form.decouvertAutorise}
                                                    onChange={(e) => setForm(prev => ({ ...prev, decouvertAutorise: e.target.checked }))}
                                                    className="w-4 h-4"
                                                />
                                                <Label htmlFor="decouvertAutorise" className="cursor-pointer">
                                                    Découvert autorisé
                                                </Label>
                                            </div>
                                            <Input
                                                id="seuilDecouvertAutorise"
                                                value={form.seuilDecouvertAutorise}
                                                onChange={(e) => handleNumberChange(e, 'seuilDecouvertAutorise')}
                                                placeholder="0.00"
                                                disabled={!form.decouvertAutorise}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="plafondTransaction">Plafond de transaction (optionnel)</Label>
                                            <Input
                                                id="plafondTransaction"
                                                value={form.plafondTransaction}
                                                onChange={(e) => handleNumberChange(e, 'plafondTransaction')}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Frais de tenue de compte */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Banknote className="w-5 h-5" />
                                        Frais de tenue de compte
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="typeFraisTenueCompte">Type de frais</Label>
                                            <Select
                                                value={form.typeFraisTenueCompte}
                                                onValueChange={(value) => handleSelectChange('typeFraisTenueCompte', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="FIXE">Fixe</SelectItem>
                                                    <SelectItem value="VARIABLE">Variable</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="fraisTenueCompte">Montant</Label>
                                            <Input
                                                id="fraisTenueCompte"
                                                value={form.fraisTenueCompte}
                                                onChange={(e) => handleNumberChange(e, 'fraisTenueCompte')}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {form.typeFraisTenueCompte === "VARIABLE" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="formuleFraisTenueCompte">Formule de calcul (optionnel)</Label>
                                            <Input
                                                id="formuleFraisTenueCompte"
                                                value={form.formuleFraisTenueCompte}
                                                onChange={handleChange}
                                                placeholder="Ex: solde_moyen * 0.01"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="periodiciteFraisTenueCompte">Périodicité (optionnel)</Label>
                                        <Select
                                            value={form.periodiciteFraisTenueCompte}
                                            onValueChange={(value) => handleSelectChange('periodiciteFraisTenueCompte', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MENSUEL">Mensuel</SelectItem>
                                                <SelectItem value="TRIMESTRIEL">Trimestriel</SelectItem>
                                                <SelectItem value="SEMESTRIEL">Semestriel</SelectItem>
                                                <SelectItem value="ANNUEL">Annuel</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator />

                                {/* Agios */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Percent className="w-5 h-5" />
                                        Agios
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="modeCalculAgios">Mode de calcul</Label>
                                            <Select
                                                value={form.modeCalculAgios}
                                                onValueChange={(value) => handleSelectChange('modeCalculAgios', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="TAUX">Taux annuel</SelectItem>
                                                    <SelectItem value="MONTANT_FIXE">Montant fixe par jour</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="tauxAgios">
                                                {form.modeCalculAgios === "TAUX" ? "Taux annuel (%)" : "Montant fixe par jour"}
                                            </Label>
                                            <Input
                                                id="tauxAgios"
                                                value={form.tauxAgios}
                                                onChange={(e) => handleNumberChange(e, 'tauxAgios')}
                                                placeholder={form.modeCalculAgios === "TAUX" ? "0.000" : "0.00"}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Commissions */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <DollarSign className="w-5 h-5" />
                                        Commissions par opération
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="typeCommission">Type de commission</Label>
                                            <Select
                                                value={form.typeCommission}
                                                onValueChange={(value) => handleSelectChange('typeCommission', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="FIXE">Fixe</SelectItem>
                                                    <SelectItem value="VARIABLE">Variable</SelectItem>
                                                    <SelectItem value="POURCENTAGE">Pourcentage</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="commissionOperation">
                                                {form.typeCommission === "POURCENTAGE" ? "Montant de base" : "Montant"}
                                            </Label>
                                            <Input
                                                id="commissionOperation"
                                                value={form.commissionOperation}
                                                onChange={(e) => handleNumberChange(e, 'commissionOperation')}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {form.typeCommission === "POURCENTAGE" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="tauxCommission">Taux de commission (%)</Label>
                                            <Input
                                                id="tauxCommission"
                                                value={form.tauxCommission}
                                                onChange={(e) => handleNumberChange(e, 'tauxCommission')}
                                                placeholder="0.000"
                                            />
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Autres frais */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Autres frais
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fraisRejet">Frais de rejet</Label>
                                            <Input
                                                id="fraisRejet"
                                                value={form.fraisRejet}
                                                onChange={(e) => handleNumberChange(e, 'fraisRejet')}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="autresFrais">Autres frais</Label>
                                            <Input
                                                id="autresFrais"
                                                value={form.autresFrais}
                                                onChange={(e) => handleNumberChange(e, 'autresFrais')}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="descriptionAutresFrais">Description des autres frais (optionnel)</Label>
                                        <Textarea
                                            id="descriptionAutresFrais"
                                            value={form.descriptionAutresFrais}
                                            onChange={handleChange}
                                            placeholder="Description des frais supplémentaires..."
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Configuration automatique */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="appliquerFraisAutomatiquement"
                                            checked={form.appliquerFraisAutomatiquement}
                                            onChange={(e) => setForm(prev => ({ ...prev, appliquerFraisAutomatiquement: e.target.checked }))}
                                            className="w-4 h-4"
                                        />
                                        <Label htmlFor="appliquerFraisAutomatiquement" className="cursor-pointer">
                                            Appliquer les frais automatiquement
                                        </Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Les frais seront automatiquement calculés et appliqués selon la périodicité configurée
                                    </p>
                                </div>

                                <Separator />

                                {/* Boutons d'action */}
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

                {/* Liste des paramètres */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Paramètres configurés</CardTitle>
                            <div className="text-sm text-muted-foreground">
                                {pagination.total} compte{pagination.total > 1 ? 's' : ''} configuré{pagination.total > 1 ? 's' : ''}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">Chargement des paramètres...</p>
                            </div>
                        ) : (
                            <>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Compte</TableHead>
                                                <TableHead>Découvert</TableHead>
                                                <TableHead>Frais mensuels</TableHead>
                                                <TableHead>Agios</TableHead>
                                                <TableHead>Commissions</TableHead>
                                                <TableHead>Dernière mise à jour</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {parametres.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8">
                                                        <p className="text-muted-foreground">
                                                            {searchTerm
                                                                ? "Aucun paramètre ne correspond aux critères de recherche"
                                                                : "Aucun paramètre bancaire configuré"}
                                                        </p>
                                                        {!searchTerm && getComptesSansParametres().length > 0 && (
                                                            <Button
                                                                variant="outline"
                                                                className="mt-2"
                                                                onClick={() => setShowForm(true)}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Configurer le premier compte
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                parametres.map((param) => (
                                                    <TableRow key={param.id} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="font-medium">{param.compteTresorerie.intitule}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {param.compteTresorerie.numeroCompte}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {getStatusBadge(param.compteTresorerie.statut)}
                                                                {param.compteTresorerie.banqueNom && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        <Building className="w-3 h-3 mr-1" />
                                                                        {param.compteTresorerie.banqueNom}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {param.decouvertAutorise ? (
                                                                <div className="space-y-1">
                                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                        Autorisé
                                                                    </Badge>
                                                                    <div className="text-sm">
                                                                        Seuil: {formatCurrency(param.seuilDecouvertAutorise, getCompteDevise(param.compteTresorerie))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-gray-50 text-gray-600">
                                                                    <XCircle className="w-3 h-3 mr-1" />
                                                                    Non autorisé
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="font-medium">
                                                                    {formatCurrency(param.fraisTenueCompte, getCompteDevise(param.compteTresorerie))}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {param.typeFraisTenueCompte === 'FIXE' ? 'Fixe' : 'Variable'}
                                                                    {param.periodiciteFraisTenueCompte && ` • ${param.periodiciteFraisTenueCompte.toLowerCase()}`}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {parseFloat(param.tauxAgios) > 0 ? (
                                                                <div className="space-y-1">
                                                                    <div className="font-medium">{formatPercent(param.tauxAgios)}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {param.modeCalculAgios === 'TAUX' ? 'Taux annuel' : 'Montant/jour'}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-sm">Aucun</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {parseFloat(param.commissionOperation) > 0 ? (
                                                                <div className="space-y-1">
                                                                    <div className="font-medium">
                                                                        {param.typeCommission === 'POURCENTAGE' && param.tauxCommission
                                                                            ? `${parseFloat(param.tauxCommission).toFixed(3)}%`
                                                                            : formatCurrency(param.commissionOperation, getCompteDevise(param.compteTresorerie))}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {param.typeCommission === 'FIXE' ? 'Fixe' :
                                                                            param.typeCommission === 'VARIABLE' ? 'Variable' : 'Pourcentage'}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-sm">Aucune</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                {formatDate(param.updatedAt)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleShowDetails(param)}
                                                                    title="Voir les détails"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleCalculFrais(param)}
                                                                    title="Calculer les frais"
                                                                >
                                                                    <Calculator className="w-4 h-4" />
                                                                </Button>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setParametreToDuplicate(param);
                                                                        setDuplicateDialogOpen(true);
                                                                    }}
                                                                    title="Dupliquer vers un autre compte"
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                </Button>

                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleEdit(param)}
                                                                    title="Modifier"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>

                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setParametreToDelete(param);
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
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Détails des paramètres bancaires</DialogTitle>
                            <DialogDescription>
                                Configuration complète des frais et commissions
                            </DialogDescription>
                        </DialogHeader>
                        {selectedParametre && (
                            <div className="space-y-6">
                                {/* Informations du compte */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Compte de trésorerie</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Intitulé</Label>
                                            <div className="font-medium">{selectedParametre.compteTresorerie.intitule}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Numéro de compte</Label>
                                            <div className="font-mono">{selectedParametre.compteTresorerie.numeroCompte}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <div>{selectedParametre.compteTresorerie.typeCompteLibelle}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Statut</Label>
                                            <div>{getStatusBadge(selectedParametre.compteTresorerie.statut)}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Solde actuel</Label>
                                            <div className="font-bold">{selectedParametre.compteTresorerie.soldeActuelFormate}</div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Découvert et limites */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Découvert et limites</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Découvert autorisé</Label>
                                            <div className="flex items-center gap-2">
                                                {selectedParametre.decouvertAutorise ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                        <span className="font-medium">Oui</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                        <span>Non</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Seuil de découvert</Label>
                                            <div className="font-medium">
                                                {formatCurrency(selectedParametre.seuilDecouvertAutorise, getCompteDevise(selectedParametre.compteTresorerie))}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedParametre.plafondTransaction && (
                                        <div className="space-y-2">
                                            <Label>Plafond de transaction</Label>
                                            <div className="font-medium">
                                                {formatCurrency(selectedParametre.plafondTransaction, getCompteDevise(selectedParametre.compteTresorerie))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Frais de tenue de compte */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Frais de tenue de compte</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <div>{selectedParametre.typeFraisTenueCompte === 'FIXE' ? 'Fixe' : 'Variable'}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Montant</Label>
                                            <div className="font-medium">
                                                {formatCurrency(selectedParametre.fraisTenueCompte, getCompteDevise(selectedParametre.compteTresorerie))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Périodicité</Label>
                                            <div>{selectedParametre.periodiciteFraisTenueCompte || 'Non spécifiée'}</div>
                                        </div>
                                    </div>
                                    {selectedParametre.formuleFraisTenueCompte && (
                                        <div className="space-y-2">
                                            <Label>Formule de calcul</Label>
                                            <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                                                {selectedParametre.formuleFraisTenueCompte}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Agios */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Agios</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Mode de calcul</Label>
                                            <div>{selectedParametre.modeCalculAgios === 'TAUX' ? 'Taux annuel' : 'Montant fixe par jour'}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{selectedParametre.modeCalculAgios === 'TAUX' ? 'Taux annuel' : 'Montant/jour'}</Label>
                                            <div className="font-medium">
                                                {selectedParametre.modeCalculAgios === 'TAUX'
                                                    ? formatPercent(selectedParametre.tauxAgios)
                                                    : formatCurrency(selectedParametre.tauxAgios, getCompteDevise(selectedParametre.compteTresorerie))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Commissions */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Commissions</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <div>
                                                {selectedParametre.typeCommission === 'FIXE' ? 'Fixe' :
                                                    selectedParametre.typeCommission === 'VARIABLE' ? 'Variable' : 'Pourcentage'}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Montant</Label>
                                            <div className="font-medium">
                                                {formatCurrency(selectedParametre.commissionOperation, getCompteDevise(selectedParametre.compteTresorerie))}
                                            </div>
                                        </div>
                                        {selectedParametre.tauxCommission && (
                                            <div className="space-y-2">
                                                <Label>Taux</Label>
                                                <div className="font-medium">{formatPercent(selectedParametre.tauxCommission)}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Autres frais */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Autres frais</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Frais de rejet</Label>
                                            <div className="font-medium">
                                                {formatCurrency(selectedParametre.fraisRejet, getCompteDevise(selectedParametre.compteTresorerie))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Autres frais</Label>
                                            <div className="font-medium">
                                                {formatCurrency(selectedParametre.autresFrais, getCompteDevise(selectedParametre.compteTresorerie))}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedParametre.descriptionAutresFrais && (
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <div className="text-sm">{selectedParametre.descriptionAutresFrais}</div>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Configuration */}
                                <div className="space-y-2">
                                    <Label>Application automatique des frais</Label>
                                    <div className="flex items-center gap-2">
                                        {selectedParametre.appliquerFraisAutomatiquement ? (
                                            <>
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <span className="font-medium">Activée</span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="w-4 h-4 text-red-600" />
                                                <span>Désactivée</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Métadonnées */}
                                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div className="space-y-1">
                                        <Label>Créé le</Label>
                                        <div>{formatDate(selectedParametre.createdAt)}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Dernière modification</Label>
                                        <div>{formatDate(selectedParametre.updatedAt)}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setDetailsDialogOpen(false)}>Fermer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialogue de calcul des frais */}
                <Dialog open={calculDialogOpen} onOpenChange={setCalculDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Calcul des frais</DialogTitle>
                            <DialogDescription>
                                Simulation des frais bancaires
                            </DialogDescription>
                        </DialogHeader>
                        {selectedParametre && calculData && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="montantDecouvert">Montant du découvert</Label>
                                            <Input
                                                id="montantDecouvert"
                                                value={montantDecouvert}
                                                onChange={(e) => setMontantDecouvert(e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="joursDecouvert">Nombre de jours</Label>
                                            <Input
                                                id="joursDecouvert"
                                                value={joursDecouvert}
                                                onChange={(e) => setJoursDecouvert(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleCalculFrais(selectedParametre)}
                                        disabled={calculating}
                                        className="w-full"
                                    >
                                        {calculating ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Calcul en cours...
                                            </>
                                        ) : (
                                            <>
                                                <Calculator className="w-4 h-4 mr-2" />
                                                Recalculer
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Résultats du calcul</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-muted-foreground">Frais mensuels prévisionnels</p>
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {formatCurrency(calculData.fraisMensuels.toString(), getCompteDevise(selectedParametre.compteTresorerie))}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium text-muted-foreground">Agios estimés</p>
                                                    <p className="text-2xl font-bold text-amber-600">
                                                        {formatCurrency(calculData.agios.toString(), getCompteDevise(selectedParametre.compteTresorerie))}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Card className="bg-green-50 border-green-200">
                                        <CardContent className="pt-6">
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-green-700">Total estimé</p>
                                                <p className="text-3xl font-bold text-green-700">
                                                    {formatCurrency(calculData.totalEstime.toString(), getCompteDevise(selectedParametre.compteTresorerie))}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-2">
                                        <Label>Découvert autorisé pour ce montant</Label>
                                        <div className="flex items-center gap-2">
                                            {calculData.decouvertAutorise ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                    <span className="font-medium text-green-700">Oui</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                    <span className="font-medium text-red-700">Non - Dépasse le seuil autorisé</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Détails des frais</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span>Frais de tenue de compte</span>
                                            <span className="font-medium">
                                                {formatCurrency(calculData.details.frais_tenue_compte.montant.toString(), getCompteDevise(selectedParametre.compteTresorerie))}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Agios</span>
                                            <span className="font-medium">
                                                {formatCurrency(calculData.agios.toString(), getCompteDevise(selectedParametre.compteTresorerie))}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Frais de rejet</span>
                                            <span className="font-medium">
                                                {formatCurrency(calculData.details.frais_rejet.toString(), getCompteDevise(selectedParametre.compteTresorerie))}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Autres frais</span>
                                            <span className="font-medium">
                                                {formatCurrency(calculData.details.autres_frais.montant.toString(), getCompteDevise(selectedParametre.compteTresorerie))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setCalculDialogOpen(false)}>Fermer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialogue de duplication */}
                <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Dupliquer les paramètres</DialogTitle>
                            <DialogDescription>
                                Copier la configuration vers un autre compte
                            </DialogDescription>
                        </DialogHeader>
                        {parametreToDuplicate && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Configuration source</Label>
                                    <div className="p-3 bg-gray-50 rounded">
                                        <div className="font-medium">{parametreToDuplicate.compteTresorerie.intitule}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {parametreToDuplicate.compteTresorerie.numeroCompte}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="targetCompteId">Compte cible *</Label>
                                    <Select
                                        value={targetCompteId}
                                        onValueChange={setTargetCompteId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un compte" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getComptesSansParametres()
                                                .filter(c => c.id !== parametreToDuplicate.compteTresorerie.id)
                                                .map(compte => (
                                                    <SelectItem key={compte.id} value={compte.id.toString()}>
                                                        {compte.intitule} - {compte.numeroCompte}
                                                    </SelectItem>
                                                ))
                                            }
                                            {getComptesSansParametres()
                                                .filter(c => c.id !== parametreToDuplicate.compteTresorerie.id)
                                                .length === 0 && (
                                                <SelectItem value="" disabled>
                                                    Aucun compte disponible sans paramètres
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <p className="text-sm text-muted-foreground">
                                    Tous les paramètres (découvert, frais, commissions, etc.) seront copiés vers le compte sélectionné.
                                </p>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDuplicateDialogOpen(false);
                                    setParametreToDuplicate(null);
                                    setTargetCompteId("");
                                }}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleDuplicate}
                                disabled={!targetCompteId}
                                className="gap-2"
                            >
                                <Copy className="w-4 h-4" />
                                Dupliquer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialogue de suppression */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer les paramètres</AlertDialogTitle>
                            <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer les paramètres du compte{" "}
                                <strong>{parametreToDelete?.compteTresorerie.intitule}</strong> ?
                                <br />
                                <span className="text-red-600 font-medium">
                                    Cette action est irréversible. Les configurations de frais, commissions et découverts seront définitivement supprimées.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setParametreToDelete(null)}>
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

export default ParametresBancaires;