import MainLayout from "@/components/layout/MainLayout";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Plus,
    Save,
    Edit,
    Trash2,
    Eye,
    Calculator,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search,
    Download,
    Calendar,
    Percent,
    DollarSign,
    Building,
    Banknote,
    MoreVertical,
    Receipt,
    FileDigit,
    CalendarDays,
    CalendarClock,
    TrendingUp,
    Filter,
    Clock,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Types basés sur l'entité Facture
interface Facture {
    id?: number;
    numero: string;
    dateEmission: string;
    dateEcheance?: string | null;
    montant: string;
    solde: string;
    montantTotal?: string;
    statut: string;
    description?: string | null;
    bonCommande?: string | null;
    bonLivraison?: string | null;
    contrat?: string | null;
    montantTva?: string | null;
    tauxTva?: string | null;
    createdAt?: string;
    updatedAt?: string;

    // Relations
    tiersId?: number | null;
    tiers?: {
        id: number;
        code: string;
        raisonSociale?: string;
        intitule?: string;
        type: string;
    };
    compteComptableId?: number | null;
    compteComptable?: {
        id: number;
        codeCompte: string;
        intitule: string;
    };

    // Propriétés calculées
    tiersNom?: string;
    tiersCode?: string;
    compteComptableCode?: string;
    statutLibelle?: string;
    montantTotalFormate?: string;
    soldeFormate?: string;
    montantPaye?: string;
    estEnRetard?: boolean;
    joursRetard?: number | null;
    dateEmissionFormatee?: string;
    dateEcheanceFormatee?: string;
    nbEncaissements?: number;
    nbOrdresPaiement?: number;
}

interface Tiers {
    id: number;
    code: string;
    raisonSociale?: string;
    intitule?: string;
    type: string;
    statut: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    classe: string;
}

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

// Constantes basées sur l'entité Facture
const STATUTS = {
    brouillon: "Brouillon",
    emise: "Émise",
    payee: "Payée",
    partiellement_payee: "Partiellement payée",
    annulee: "Annulée",
    impayee: "Impayée",
};

const TYPE_TIERS = {
    client: "Client",
    fournisseur: "Fournisseur",
    autre: "Autre",
};

const API_BASE_URL = "http://127.0.0.1:8000/api";

// Helper pour construire les URLs d'API
const api = (path: string) => path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

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
const fetchJson = async (url: string, opts: RequestInit = {}, navigate?: any) => {
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
        if (navigate) {
            navigate('/login');
        } else if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/login';
        }
    }
    return res;
};

// Fonction pour décoder un JWT sans dépendance externe
const decodeJWT = (token: string): any => {
    try {
        // Un JWT est composé de 3 parties séparées par des points
        const base64Url = token.split('.')[1];
        if (!base64Url) {
            throw new Error("Token JWT invalide");
        }
        
        // Remplacer les caractères spécifiques au base64Url
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // Décoder la chaîne base64
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Erreur lors du décodage du JWT:", error);
        return {};
    }
};

const FacturePage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [factures, setFactures] = useState<Facture[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showPaiement, setShowPaiement] = useState(false);
    const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
    const [editMode, setEditMode] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterTiers, setFilterTiers] = useState<string>("all");
    const [filterStatut, setFilterStatut] = useState<string>("all");
    const [filterEnRetard, setFilterEnRetard] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    const [pagination, setPagination] = useState<PaginationData>({
        total: 0,
        page: 1,
        limit: 20,
        pages: 1,
    });

    const [tiersList, setTiersList] = useState<Tiers[]>([]);
    const [comptes, setComptes] = useState<PlanComptable[]>([]);
    const [stats, setStats] = useState({
        totalImpayes: 0,
        totalEnRetard: 0,
        nombreEnRetard: 0,
        monthlyStats: [] as any[],
    });

    const [montantPaiement, setMontantPaiement] = useState<string>("");

    const [formData, setFormData] = useState<Facture>({
        numero: "",
        dateEmission: new Date().toISOString().split('T')[0],
        dateEcheance: null,
        montant: "0.00",
        solde: "0.00",
        statut: "brouillon",
    });

    const [companyCurrencyCode, setCompanyCurrencyCode] = useState<string | null>("EUR");
    const [companyCurrencySymbol, setCompanyCurrencySymbol] = useState<string | null>(null);

    const [dateEmissionOpen, setDateEmissionOpen] = useState(false);
    const [dateEcheanceOpen, setDateEcheanceOpen] = useState(false);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    const getAuthHeaders = (): Record<string, string> => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        const token = localStorage.getItem("auth_token") ||
            localStorage.getItem("token") ||
            sessionStorage.getItem("auth_token") ||
            sessionStorage.getItem("token");

        if (token && token !== "null" && token !== "undefined") {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return headers;
    };

    const fetchUserRoles = () => {
        try {
            const token = localStorage.getItem("auth_token") ||
                localStorage.getItem("token") ||
                sessionStorage.getItem("auth_token") ||
                sessionStorage.getItem("token");

            if (token && token !== "null" && token !== "undefined") {
                const decoded = decodeJWT(token);
                setUserRoles(decoded.roles || []);
            }
        } catch (error) {
            console.error("Erreur lors du décodage du token:", error);
            setUserRoles([]);
        }
    };

    const canEditAnnulee = (): boolean => {
        return userRoles.includes('ROLE_ADMINISTRATEUR') || userRoles.includes('ROLE_SUPER_ADMIN');
    };

    const canEditPayee = (): boolean => {
        return userRoles.includes('ROLE_ADMINISTRATEUR') || userRoles.includes('ROLE_SUPER_ADMIN');
    };

    const canDeleteFacture = (): boolean => {
        return userRoles.includes('ROLE_ADMINISTRATEUR') || userRoles.includes('ROLE_SUPER_ADMIN');
    };

    const getStatutBadge = (statut: string) => {
        const config = {
            brouillon: {
                variant: "outline" as const,
                className: "bg-gray-100 text-gray-800 border-gray-200",
                icon: <FileText className="w-3 h-3 mr-1" />
            },
            emise: {
                variant: "default" as const,
                className: "bg-blue-100 text-blue-800 border-blue-200",
                icon: <Receipt className="w-3 h-3 mr-1" />
            },
            payee: {
                variant: "default" as const,
                className: "bg-green-100 text-green-800 border-green-200",
                icon: <CheckCircle className="w-3 h-3 mr-1" />
            },
            partiellement_payee: {
                variant: "secondary" as const,
                className: "bg-yellow-100 text-yellow-800 border-yellow-200",
                icon: <Banknote className="w-3 h-3 mr-1" />
            },
            annulee: {
                variant: "outline" as const,
                className: "bg-gray-100 text-gray-800 border-gray-200",
                icon: <XCircle className="w-3 h-3 mr-1" />
            },
            impayee: {
                variant: "destructive" as const,
                className: "bg-red-100 text-red-800 border-red-200",
                icon: <AlertCircle className="w-3 h-3 mr-1" />
            },
        };

        const conf = config[statut as keyof typeof config] || config.brouillon;

        return (
            <Badge variant={conf.variant} className={`${conf.className} flex items-center gap-1`}>
                {conf.icon}
                {STATUTS[statut as keyof typeof STATUTS] || statut}
            </Badge>
        );
    };

    const getRetardBadge = (estEnRetard: boolean, joursRetard?: number | null) => {
        if (!estEnRetard) return null;

        return (
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                <Clock className="w-3 h-3 mr-1" />
                Retard: {joursRetard || 'N/A'} jour{joursRetard && joursRetard > 1 ? 's' : ''}
            </Badge>
        );
    };

    const formatMontant = (montant: string | number | undefined | null): string => {
        const montantNum = (montant === undefined || montant === null || montant === "")
            ? 0
            : (typeof montant === 'string' ? parseFloat(montant) : montant);

        // Try to use currency code with Intl if available
        if (companyCurrencyCode) {
            try {
                return new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: companyCurrencyCode,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(montantNum as number);
            } catch (e) {
                console.warn('Intl formatting failed for', companyCurrencyCode, e);
            }
        }

        // Fallback: format number and append company symbol if present
        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(montantNum as number);

        if (companyCurrencySymbol) return `${formatted} ${companyCurrencySymbol}`;

        // Final fallback to Euro symbol
        return `${formatted} €`;
    };

    const formatNumber = (num: number | string | undefined | null): string => {
        if (num === undefined || num === null || num === "") return "0,00";

        const numValue = typeof num === 'string' ? parseFloat(num) : num;

        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue);
    };

    useEffect(() => {
        fetchUserRoles();
        fetchData();
        fetchReferences();
        fetchStats();
    }, [pagination.page, searchTerm, filterTiers, filterStatut, filterEnRetard, dateFrom, dateTo]);

    // Définir la devise (code et symbole) de la société de l'utilisateur connecté (si disponible)
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const u = JSON.parse(userStr);
                const code = u?.societe?.deviseParDefaut?.code || u?.societe?.devise?.code || u?.societe?.deviseCode || null;
                const symbole = u?.societe?.deviseParDefaut?.symbole || u?.societe?.devise?.symbole || u?.societe?.deviseSymbole || null;
                
                console.log('Currency from localStorage:', { code, symbole, societe: u?.societe });
                
                setCompanyCurrencyCode(code ?? 'EUR');
                setCompanyCurrencySymbol(symbole ?? null);
            } else {
                console.warn('No user in localStorage');
                setCompanyCurrencyCode('EUR');
            }
        } catch (e) {
            console.error('Erreur lecture user pour devise:', e);
            setCompanyCurrencyCode('EUR');
            setCompanyCurrencySymbol(null);
        }
    }, []);

    const fetchReferences = async () => {
        try {
            const headers = getAuthHeaders();

            // Récupérer les tiers
            try {
                const tiersResponse = await fetchJson(`${API_BASE_URL}/tiers?statut=ACTIF&limit=100`, {}, navigate);
                if (tiersResponse.ok) {
                    const data = await tiersResponse.json();
                    if (data.success) {
                        setTiersList(data.data || []);
                    }
                }
            } catch (error) {
                console.error("Erreur chargement tiers:", error);
            }

            // Récupérer les comptes comptables
            try {
                const comptesResponse = await fetchJson(`${API_BASE_URL}/plan-comptables?statut=ACTIF&limit=100`, {}, navigate);
                if (comptesResponse.ok) {
                    const data = await comptesResponse.json();
                    if (data.success) {
                        setComptes(data.data || []);
                    }
                }
            } catch (error) {
                console.error("Erreur chargement comptes:", error);
            }

        } catch (error) {
            console.error("Erreur chargement références:", error);
        }
    };

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
            if (filterTiers !== 'all') params.append('tiers', filterTiers);
            if (filterStatut !== 'all') params.append('statut', filterStatut);
            if (filterEnRetard === 'true') params.append('enRetard', 'true');
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const url = `${API_BASE_URL}/factures?${params.toString()}`;

            const response = await fetchJson(url, {}, navigate);

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
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                setFactures(data.data || []);
                setPagination(data.pagination || pagination);
            } else {
                throw new Error(data.message || "Erreur inconnue");
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
            setError(errorMessage);
            console.error('❌ Erreur fetchData:', error);

            toast({
                title: "Erreur",
                description: "Impossible de charger les factures",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetchJson(`${API_BASE_URL}/factures/stats`, {}, navigate);

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setStats(data.data);
                }
            }
        } catch (error) {
            console.error("Erreur chargement stats:", error);
        }
    };

    const handleFormChange = useCallback((field: keyof Facture, value: any) => {
        if ((field === 'tiersId' || field === 'compteComptableId') && value === "0") {
            setFormData(prevState => ({
                ...prevState,
                [field]: undefined
            }));
            return;
        }

        setFormData(prevState => ({
            ...prevState,
            [field]: value
        }));

        // Si le montant change et que le solde est égal à l'ancien montant, mettre à jour le solde
        if (field === 'montant') {
            setFormData(prevState => {
                if (prevState.solde === prevState.montant) {
                    return {
                        ...prevState,
                        solde: value,
                        [field]: value
                    };
                }
                return {
                    ...prevState,
                    [field]: value
                };
            });
        }
    }, []);

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!formData.numero?.trim()) {
            errors.push("Le numéro de facture est obligatoire");
        }

        if (!formData.dateEmission) {
            errors.push("La date d'émission est obligatoire");
        }

        if (!formData.montant || parseFloat(formData.montant || "0") <= 0) {
            errors.push("Le montant doit être supérieur à 0");
        }

        // Validation stricte de l'ID du tiers
        if (!formData.tiersId) {
            errors.push("Le tiers est obligatoire");
        } else {
            const tiersExists = tiersList.some(t => t.id === formData.tiersId);
            if (!tiersExists) {
                errors.push("Le tiers sélectionné n'existe pas ou n'est plus actif");
            }
        }

        // Validation stricte de l'ID du compte comptable si fourni
        if (formData.compteComptableId) {
            const compteExists = comptes.some(c => c.id === formData.compteComptableId);
            if (!compteExists) {
                errors.push("Le compte comptable sélectionné n'existe pas ou n'est plus actif");
            }
        }

        if (formData.dateEcheance && new Date(formData.dateEcheance) < new Date(formData.dateEmission)) {
            errors.push("La date d'échéance ne peut pas être antérieure à la date d'émission");
        }

        // Vérification des permissions pour modifier une facture annulée ou payée
        if (editMode && selectedFacture) {
            if (selectedFacture.statut === 'annulee' && !canEditAnnulee()) {
                errors.push("Vous n'avez pas les permissions pour modifier une facture annulée");
            }
            if (selectedFacture.statut === 'payee' && !canEditPayee()) {
                errors.push("Vous n'avez pas les permissions pour modifier une facture payée");
            }
        }

        return errors;
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

        setSubmitting(true);
        setError(null);

        try {
            const url = editMode && formData.id
                ? `${API_BASE_URL}/factures/${formData.id}`
                : `${API_BASE_URL}/factures`;

            const method = editMode ? "PUT" : "POST";

            const requestData: any = {
                numero: formData.numero,
                dateEmission: formData.dateEmission,
                dateEcheance: formData.dateEcheance || null,
                montant: formData.montant,
                solde: formData.solde || formData.montant,
                statut: formData.statut,
                tiersId: formData.tiersId,
                compteComptableId: formData.compteComptableId || null,
                description: formData.description || null,
                bonCommande: formData.bonCommande || null,
                bonLivraison: formData.bonLivraison || null,
                contrat: formData.contrat || null,
                montantTva: formData.montantTva || null,
                tauxTva: formData.tauxTva || null,
            };

            console.log('Données envoyées:', requestData);

            const response = await fetchJson(url, {
                method,
                body: JSON.stringify(requestData)
            }, navigate);

            const responseData = await response.json();
            console.log('Réponse serveur:', responseData);

            if (!response.ok) {
                // Gestion détaillée des erreurs spécifiques du backend
                if (response.status === 400 && responseData.errors) {
                    const firstError = Object.entries(responseData.errors)[0];
                    if (firstError) {
                        const [field, message] = firstError;
                        toast({
                            title: "Erreur de validation",
                            description: `${field}: ${message}`,
                            variant: "destructive",
                        });
                    }
                } else if (response.status === 403) {
                    toast({
                        title: "Accès refusé",
                        description: responseData.message || "Vous n'avez pas les permissions nécessaires pour effectuer cette action",
                        variant: "destructive",
                    });
                } else if (response.status === 404) {
                    toast({
                        title: "Ressource introuvable",
                        description: responseData.message || "La ressource demandée n'existe pas",
                        variant: "destructive",
                    });
                } else if (response.status === 409) {
                    toast({
                        title: "Conflit",
                        description: responseData.message || "Une facture avec ce numéro existe déjà",
                        variant: "destructive",
                    });
                } else if (responseData.message) {
                    // Gestion des messages d'erreur spécifiques du backend
                    let errorMessage = responseData.message;
                    if (errorMessage.includes('Tiers invalide')) {
                        errorMessage = "Le tiers sélectionné n'existe pas ou n'est plus actif";
                    } else if (errorMessage.includes('Compte comptable invalide')) {
                        errorMessage = "Le compte comptable sélectionné n'existe pas ou n'est plus actif";
                    } else if (errorMessage.includes('permission')) {
                        errorMessage = "Vous n'avez pas les permissions nécessaires pour cette opération";
                    }
                    toast({
                        title: "Erreur",
                        description: errorMessage,
                        variant: "destructive",
                    });
                }
                return;
            }

            toast({
                title: "Succès",
                description: responseData.message || (editMode ? "Facture mise à jour" : "Facture créée"),
            });

            setTimeout(() => {
                fetchData();
                fetchStats();
            }, 500);

            resetForm();

        } catch (error) {
            console.error('Erreur soumission:', error);
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

    const resetFilters = () => {
        setSearchTerm("");
        setFilterTiers("all");
        setFilterStatut("all");
        setFilterEnRetard("all");
        setDateFrom("");
        setDateTo("");
        setPagination(prevState => ({ ...prevState, page: 1 }));

        toast({
            title: "Filtres réinitialisés",
            description: "Tous les filtres ont été réinitialisés",
        });
    };

    const handleEdit = (facture: Facture) => {
        // Vérifier les permissions pour les factures payées ou annulées
        if (facture.statut === 'annulee' && !canEditAnnulee()) {
            toast({
                title: "Accès refusé",
                description: "Seuls les administrateurs peuvent modifier une facture annulée",
                variant: "destructive",
            });
            return;
        }

        if (facture.statut === 'payee' && !canEditPayee()) {
            toast({
                title: "Accès refusé",
                description: "Seuls les administrateurs peuvent modifier une facture payée",
                variant: "destructive",
            });
            return;
        }

        setSelectedFacture(facture);
        setFormData({
            id: facture.id,
            numero: facture.numero,
            dateEmission: facture.dateEmission,
            dateEcheance: facture.dateEcheance || null,
            montant: facture.montant,
            solde: facture.solde || facture.montant,
            statut: facture.statut,
            tiersId: facture.tiers?.id,
            compteComptableId: facture.compteComptable?.id,
            description: facture.description || "",
            bonCommande: facture.bonCommande || "",
            bonLivraison: facture.bonLivraison || "",
            contrat: facture.contrat || "",
            montantTva: facture.montantTva || "",
            tauxTva: facture.tauxTva || "",
        });
        setEditMode(true);
        setShowForm(true);
    };

    const handleViewDetail = (facture: Facture) => {
        setSelectedFacture(facture);
        setShowDetail(true);
    };

    const handleDelete = async (id: number) => {
        if (!canDeleteFacture()) {
            toast({
                title: "Accès refusé",
                description: "Seuls les administrateurs peuvent supprimer une facture",
                variant: "destructive",
            });
            return;
        }

        if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement cette facture ? Cette action est irréversible.")) {
            return;
        }

        try {
            const response = await fetchJson(`${API_BASE_URL}/factures/${id}`, {
                method: "DELETE"
            }, navigate);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur lors de la suppression");
            }

            toast({
                title: "Succès",
                description: "Facture supprimée avec succès",
            });

            setFactures(prevState => prevState.filter(f => f.id !== id));
            fetchStats();

        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de la suppression",
                variant: "destructive",
            });
        }
    };

    const handleEnregistrerPaiement = async () => {
        if (!selectedFacture?.id || !montantPaiement || parseFloat(montantPaiement) <= 0) {
            toast({
                title: "Erreur",
                description: "Veuillez saisir un montant valide",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetchJson(`${API_BASE_URL}/factures/${selectedFacture.id}/paiement`, {
                method: "POST",
                body: JSON.stringify({ montant: montantPaiement })
            }, navigate);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur lors de l'enregistrement du paiement");
            }

            toast({
                title: "Succès",
                description: "Paiement enregistré avec succès",
            });

            setShowPaiement(false);
            setMontantPaiement("");
            fetchData();
            fetchStats();

        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de l'enregistrement du paiement",
                variant: "destructive",
            });
        }
    };

    const handleChangerStatut = async (id: number, nouveauStatut: string) => {
        try {
            const response = await fetchJson(`${API_BASE_URL}/factures/${id}`, {
                method: "PUT",
                body: JSON.stringify({ statut: nouveauStatut })
            }, navigate);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur lors du changement de statut");
            }

            toast({
                title: "Succès",
                description: "Statut mis à jour avec succès",
            });

            fetchData();
            fetchStats();
        } catch (error) {
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors du changement de statut",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setFormData({
            numero: "",
            dateEmission: new Date().toISOString().split('T')[0],
            dateEcheance: null,
            montant: "0.00",
            solde: "0.00",
            statut: "brouillon",
        });
        setEditMode(false);
        setShowForm(false);
        setError(null);
        setSelectedFacture(null);
        setShowDetail(false);
        setShowPaiement(false);
        setMontantPaiement("");
    };

    const handlePageChange = (page: number) => {
        setPagination(prevState => ({ ...prevState, page }));
    };

    const handleExportCsv = async () => {
        try {
            const response = await fetchJson(`${API_BASE_URL}/factures/export/csv`, {}, navigate);

            if (!response.ok) {
                throw new Error("Erreur lors de l'export");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `factures_${new Date().toISOString().split('T')[0]}.csv`;
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

    const handleGenererNumero = () => {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const numero = `FACT-${year}${month}-${random}`;

        setFormData(prevState => ({
            ...prevState,
            numero
        }));

        toast({
            title: "Numéro généré",
            description: `Numéro: ${numero}`,
        });
    };

    const calculerTva = () => {
        if (formData.tauxTva && formData.montant) {
            const montantHT = parseFloat(formData.montant);
            const taux = parseFloat(formData.tauxTva);
            const tva = (montantHT * taux) / 100;

            setFormData(prevState => ({
                ...prevState,
                montantTva: tva.toFixed(2)
            }));

            toast({
                title: "TVA calculée",
                description: `Montant TVA: ${formatMontant(tva)}`,
            });
        }
    };

    if (loading && factures.length === 0) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Chargement des factures...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Gestion des Factures</h1>
                        <p className="text-muted-foreground">
                            Création, suivi et gestion des factures clients et fournisseurs
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={resetFilters} variant="outline" className="gap-2">
                            <Filter className="w-4 h-4" />
                            Réinitialiser filtres
                        </Button>
                        <Button onClick={fetchData} variant="outline" className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                        </Button>
                        <Button onClick={() => fetchStats()} variant="outline" className="gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Statistiques
                        </Button>
                        <Button onClick={handleExportCsv} variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            Exporter
                        </Button>
                        <Button onClick={() => setShowForm(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nouvelle facture
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                Factures impayées
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {formatMontant(stats.totalImpayes)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Montant total à recevoir
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-orange-500" />
                                Factures en retard
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {stats.nombreEnRetard}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {formatMontant(stats.totalEnRetard)} en retard
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-blue-500" />
                                Total factures
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {factures.length}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Factures dans le système
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">Recherche</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Numéro, tiers, description..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filterTiers">Tiers</Label>
                                <Select value={filterTiers} onValueChange={setFilterTiers}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les tiers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les tiers</SelectItem>
                                        {tiersList.map((tier) => (
                                            <SelectItem key={tier.id} value={tier.id.toString()}>
                                                {tier.code} - {tier.raisonSociale || tier.intitule}
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
                                        {Object.entries(STATUTS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filterEnRetard">En retard</Label>
                                <Select value={filterEnRetard} onValueChange={setFilterEnRetard}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Toutes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes</SelectItem>
                                        <SelectItem value="true">En retard uniquement</SelectItem>
                                        <SelectItem value="false">Non en retard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="dateFrom">Émission à partir du</Label>
                                <Input
                                    id="dateFrom"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateTo">Émission jusqu'au</Label>
                                <Input
                                    id="dateTo"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Liste des factures</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {pagination.total} facture{pagination.total !== 1 ? "s" : ""} trouvée
                            {pagination.total !== 1 ? "s" : ""} - Page {pagination.page} sur {pagination.pages}
                        </p>
                    </CardHeader>
                    <CardContent>
                        {factures.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {searchTerm || filterTiers !== 'all' || filterStatut !== 'all'
                                    ? "Aucune facture ne correspond aux critères de recherche"
                                    : "Aucune facture trouvée. Créez-en une nouvelle !"}
                            </div>
                        ) : (
                            <>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Numéro</TableHead>
                                                <TableHead>Tiers</TableHead>
                                                <TableHead>Émission</TableHead>
                                                <TableHead>Échéance</TableHead>
                                                <TableHead>Montant</TableHead>
                                                <TableHead>Solde</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {factures.map((facture) => (
                                                <TableRow key={facture.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{facture.numero}</span>
                                                            {facture.bonCommande && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    BC: {facture.bonCommande}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>{facture.tiersNom}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {facture.tiersCode}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {facture.dateEmissionFormatee ||
                                                            new Date(facture.dateEmission).toLocaleDateString('fr-FR')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>
                                                                {facture.dateEcheanceFormatee ||
                                                                    (facture.dateEcheance ?
                                                                        new Date(facture.dateEcheance).toLocaleDateString('fr-FR') :
                                                                        "Non définie")}
                                                            </span>
                                                            {getRetardBadge(facture.estEnRetard || false, facture.joursRetard)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">
                                                            {facture.montantTotalFormate || formatMontant(facture.montant)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className={`font-medium ${
                                                            parseFloat(facture.solde || "0") === 0 ?
                                                                "text-green-600" :
                                                                parseFloat(facture.solde || "0") < parseFloat(facture.montant || "0") ?
                                                                    "text-orange-600" :
                                                                    "text-red-600"
                                                        }`}>
                                                            {facture.soldeFormate || formatMontant(facture.solde)}
                                                        </div>
                                                        {facture.montantPaye && parseFloat(facture.montantPaye) > 0 && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Payé: {formatMontant(facture.montantPaye)}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            {getStatutBadge(facture.statut)}
                                                            <div className="flex items-center gap-2 text-xs">
                                                                {facture.nbEncaissements && facture.nbEncaissements > 0 && (
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                                        {facture.nbEncaissements} encaiss.
                                                                    </Badge>
                                                                )}
                                                                {facture.nbOrdresPaiement && facture.nbOrdresPaiement > 0 && (
                                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                        {facture.nbOrdresPaiement} ordre{facture.nbOrdresPaiement > 1 ? 's' : ''}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleViewDetail(facture)}
                                                                title="Voir les détails"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button size="sm" variant="outline">
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />

                                                                    <DropdownMenuItem onClick={() => handleEdit(facture)}>
                                                                        <Edit className="w-4 h-4 mr-2" />
                                                                        Modifier
                                                                    </DropdownMenuItem>

                                                                    {facture.statut !== 'payee' && facture.statut !== 'annulee' && (
                                                                        <DropdownMenuItem onClick={() => {
                                                                            setSelectedFacture(facture);
                                                                            setShowPaiement(true);
                                                                        }}>
                                                                            <Banknote className="w-4 h-4 mr-2" />
                                                                            Enregistrer un paiement
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    {facture.statut === 'brouillon' && (
                                                                        <DropdownMenuItem onClick={() => handleChangerStatut(facture.id!, 'emise')}>
                                                                            <Receipt className="w-4 h-4 mr-2" />
                                                                            Émettre la facture
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    {facture.statut === 'emise' && (
                                                                        <DropdownMenuItem onClick={() => handleChangerStatut(facture.id!, 'annulee')}>
                                                                            <XCircle className="w-4 h-4 mr-2" />
                                                                            Annuler la facture
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    <DropdownMenuSeparator />

                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(facture.id!)}
                                                                        className="text-red-600"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                                        Supprimer
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

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

                                                {pagination.pages > 5 && pagination.page < pagination.pages - 2 && (
                                                    <PaginationItem>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                )}

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

                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editMode ? "Modifier la facture" : "Nouvelle facture"}
                            </DialogTitle>
                            <DialogDescription>
                                {editMode
                                    ? "Modifiez les informations de la facture"
                                    : "Remplissez les informations pour créer une nouvelle facture"}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Tabs defaultValue="informations" className="w-full">
                                <TabsList className="grid grid-cols-3">
                                    <TabsTrigger value="informations">Informations</TabsTrigger>
                                    <TabsTrigger value="montants">Montants</TabsTrigger>
                                    <TabsTrigger value="references">Références</TabsTrigger>
                                </TabsList>

                                <TabsContent value="informations" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="numero">
                                                Numéro de facture <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="numero"
                                                    value={formData.numero}
                                                    onChange={(e) => handleFormChange("numero", e.target.value)}
                                                    placeholder="Ex: FACT-202401-001"
                                                    disabled={submitting}
                                                    required
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={handleGenererNumero}
                                                    disabled={submitting}
                                                >
                                                    <FileDigit className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="tiersId">
                                                Tiers <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.tiersId?.toString() || "0"}
                                                onValueChange={(value) => handleFormChange("tiersId", value)}
                                                disabled={submitting}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un tiers" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Sélectionner un tiers</SelectItem>
                                                    {tiersList.map((tier) => (
                                                        <SelectItem key={tier.id} value={tier.id.toString()}>
                                                            {tier.code} - {tier.raisonSociale || tier.intitule} ({TYPE_TIERS[tier.type as keyof typeof TYPE_TIERS] || tier.type})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="dateEmission">
                                                Date d'émission <span className="text-red-500">*</span>
                                            </Label>
                                            <Popover open={dateEmissionOpen} onOpenChange={setDateEmissionOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !formData.dateEmission && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {formData.dateEmission ? (
                                                            format(new Date(formData.dateEmission), "PPP", { locale: fr })
                                                        ) : (
                                                            <span>Sélectionner une date</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <CalendarComponent
                                                        mode="single"
                                                        selected={formData.dateEmission ? new Date(formData.dateEmission) : undefined}
                                                        onSelect={(date) => {
                                                            handleFormChange("dateEmission", date?.toISOString().split('T')[0]);
                                                            setDateEmissionOpen(false);
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="dateEcheance">Date d'échéance</Label>
                                            <Popover open={dateEcheanceOpen} onOpenChange={setDateEcheanceOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !formData.dateEcheance && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {formData.dateEcheance ? (
                                                            format(new Date(formData.dateEcheance), "PPP", { locale: fr })
                                                        ) : (
                                                            <span>Sélectionner une date</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <CalendarComponent
                                                        mode="single"
                                                        selected={formData.dateEcheance ? new Date(formData.dateEcheance) : undefined}
                                                        onSelect={(date) => {
                                                            handleFormChange("dateEcheance", date?.toISOString().split('T')[0]);
                                                            setDateEcheanceOpen(false);
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description || ""}
                                            onChange={(e) => handleFormChange("description", e.target.value)}
                                            placeholder="Description de la facture"
                                            disabled={submitting}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="compteComptableId">Compte comptable</Label>
                                        <Select
                                            value={formData.compteComptableId?.toString() || "0"}
                                            onValueChange={(value) => handleFormChange("compteComptableId", value)}
                                            disabled={submitting}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un compte" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">Sélectionner un compte</SelectItem>
                                                {comptes.map((compte) => (
                                                    <SelectItem key={compte.id} value={compte.id.toString()}>
                                                        {compte.codeCompte} - {compte.intitule}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>

                                <TabsContent value="montants" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="montant">
                                                Montant total HT <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="montant"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.montant}
                                                onChange={(e) => handleFormChange("montant", e.target.value)}
                                                placeholder="0.00"
                                                disabled={submitting}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="solde">Solde restant</Label>
                                            <Input
                                                id="solde"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.solde}
                                                onChange={(e) => handleFormChange("solde", e.target.value)}
                                                placeholder="0.00"
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="tauxTva">Taux TVA (%)</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="tauxTva"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={formData.tauxTva || ""}
                                                    onChange={(e) => handleFormChange("tauxTva", e.target.value)}
                                                    placeholder="Ex: 20.00"
                                                    disabled={submitting}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={calculerTva}
                                                    disabled={!formData.tauxTva || !formData.montant}
                                                >
                                                    <Calculator className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="montantTva">Montant TVA</Label>
                                            <Input
                                                id="montantTva"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.montantTva || ""}
                                                onChange={(e) => handleFormChange("montantTva", e.target.value)}
                                                placeholder="0.00"
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="statut">Statut</Label>
                                        <Select
                                            value={formData.statut}
                                            onValueChange={(value) => handleFormChange("statut", value)}
                                            disabled={submitting}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un statut" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(STATUTS).map(([value, label]) => (
                                                    <SelectItem key={value} value={value}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </TabsContent>

                                <TabsContent value="references" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="bonCommande">Bon de commande</Label>
                                            <Input
                                                id="bonCommande"
                                                value={formData.bonCommande || ""}
                                                onChange={(e) => handleFormChange("bonCommande", e.target.value)}
                                                placeholder="N° de bon de commande"
                                                disabled={submitting}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bonLivraison">Bon de livraison</Label>
                                            <Input
                                                id="bonLivraison"
                                                value={formData.bonLivraison || ""}
                                                onChange={(e) => handleFormChange("bonLivraison", e.target.value)}
                                                placeholder="N° de bon de livraison"
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="contrat">Contrat</Label>
                                            <Input
                                                id="contrat"
                                                value={formData.contrat || ""}
                                                onChange={(e) => handleFormChange("contrat", e.target.value)}
                                                placeholder="Référence contrat"
                                                disabled={submitting}
                                            />
                                        </div>
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

                <Dialog open={showDetail} onOpenChange={setShowDetail}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Détails de la facture</DialogTitle>
                            <DialogDescription>
                                Informations complètes de la facture
                            </DialogDescription>
                        </DialogHeader>

                        {selectedFacture && (
                            <div className="space-y-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold">{selectedFacture.numero}</h3>
                                            {getStatutBadge(selectedFacture.statut)}
                                            {getRetardBadge(selectedFacture.estEnRetard || false, selectedFacture.joursRetard)}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            Créée le: {new Date(selectedFacture.createdAt || '').toLocaleDateString('fr-FR')}
                                            {selectedFacture.updatedAt && (
                                                <> • Modifiée le: {new Date(selectedFacture.updatedAt).toLocaleDateString('fr-FR')}</>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">
                                            {selectedFacture.montantTotalFormate || formatMontant(selectedFacture.montant)}
                                        </div>
                                        <div className={`text-sm ${
                                            parseFloat(selectedFacture.solde || "0") === 0 ?
                                                "text-green-600" :
                                                parseFloat(selectedFacture.solde || "0") < parseFloat(selectedFacture.montant || "0") ?
                                                    "text-orange-600" :
                                                    "text-red-600"
                                        }`}>
                                            Solde: {selectedFacture.soldeFormate || formatMontant(selectedFacture.solde)}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <Tabs defaultValue="general" className="w-full">
                                    <TabsList className="grid grid-cols-3">
                                        <TabsTrigger value="general">Général</TabsTrigger>
                                        <TabsTrigger value="montants">Montants</TabsTrigger>
                                        <TabsTrigger value="historique">Historique</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="general" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Tiers</Label>
                                                <div className="space-y-1">
                                                    <p className="font-medium">{selectedFacture.tiersNom}</p>
                                                    <p className="text-sm text-muted-foreground">{selectedFacture.tiersCode}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Compte comptable</Label>
                                                <div className="space-y-1">
                                                    <p className="font-medium">{selectedFacture.compteComptableCode}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedFacture.compteComptable?.intitule}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Date d'émission</Label>
                                                <p className="font-medium">
                                                    {selectedFacture.dateEmissionFormatee ||
                                                        new Date(selectedFacture.dateEmission).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Date d'échéance</Label>
                                                <p className="font-medium">
                                                    {selectedFacture.dateEcheanceFormatee ||
                                                        (selectedFacture.dateEcheance ?
                                                            new Date(selectedFacture.dateEcheance).toLocaleDateString('fr-FR') :
                                                            "Non définie")}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedFacture.description && (
                                            <>
                                                <Separator />
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Description</Label>
                                                    <p className="whitespace-pre-wrap">{selectedFacture.description}</p>
                                                </div>
                                            </>
                                        )}

                                        {(selectedFacture.bonCommande || selectedFacture.bonLivraison || selectedFacture.contrat) && (
                                            <>
                                                <Separator />
                                                <div className="grid grid-cols-3 gap-4">
                                                    {selectedFacture.bonCommande && (
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Bon de commande</Label>
                                                            <p className="font-medium">{selectedFacture.bonCommande}</p>
                                                        </div>
                                                    )}
                                                    {selectedFacture.bonLivraison && (
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Bon de livraison</Label>
                                                            <p className="font-medium">{selectedFacture.bonLivraison}</p>
                                                        </div>
                                                    )}
                                                    {selectedFacture.contrat && (
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Contrat</Label>
                                                            <p className="font-medium">{selectedFacture.contrat}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="montants" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Montant total HT</Label>
                                                <p className="font-medium text-lg">
                                                    {selectedFacture.montantTotalFormate || formatMontant(selectedFacture.montant)}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Solde restant</Label>
                                                <p className={`font-medium text-lg ${
                                                    parseFloat(selectedFacture.solde || "0") === 0 ?
                                                        "text-green-600" :
                                                        "text-red-600"
                                                }`}>
                                                    {selectedFacture.soldeFormate || formatMontant(selectedFacture.solde)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Montant payé</Label>
                                                <p className="font-medium text-green-600">
                                                    {formatMontant(selectedFacture.montantPaye || "0")}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Pourcentage payé</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div
                                                            className="bg-green-600 h-2.5 rounded-full"
                                                            style={{
                                                                width: `${(1 - parseFloat(selectedFacture.solde || "0") / parseFloat(selectedFacture.montant || "1")) * 100}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium">
                                                        {Math.round((1 - parseFloat(selectedFacture.solde || "0") / parseFloat(selectedFacture.montant || "1")) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {(selectedFacture.tauxTva || selectedFacture.montantTva) && (
                                            <>
                                                <Separator />
                                                <div className="grid grid-cols-2 gap-4">
                                                    {selectedFacture.tauxTva && (
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Taux TVA</Label>
                                                            <p className="font-medium">{selectedFacture.tauxTva}%</p>
                                                        </div>
                                                    )}
                                                    {selectedFacture.montantTva && (
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Montant TVA</Label>
                                                            <p className="font-medium">{formatMontant(selectedFacture.montantTva)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        <Separator />

                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Associations</Label>
                                            <div className="flex gap-4">
                                                {selectedFacture.nbEncaissements && selectedFacture.nbEncaissements > 0 && (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        {selectedFacture.nbEncaissements} encaissement{selectedFacture.nbEncaissements > 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                {selectedFacture.nbOrdresPaiement && selectedFacture.nbOrdresPaiement > 0 && (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        {selectedFacture.nbOrdresPaiement} ordre{selectedFacture.nbOrdresPaiement > 1 ? 's' : ''} de paiement
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="historique" className="space-y-4">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Dates importantes</Label>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                                        <span>Émission: {new Date(selectedFacture.dateEmission).toLocaleDateString('fr-FR')}</span>
                                                    </div>
                                                    {selectedFacture.dateEcheance && (
                                                        <div className="flex items-center gap-2">
                                                            <CalendarClock className="w-4 h-4 text-muted-foreground" />
                                                            <span>Échéance: {new Date(selectedFacture.dateEcheance).toLocaleDateString('fr-FR')}</span>
                                                            {selectedFacture.estEnRetard && (
                                                                <Badge variant="destructive" className="ml-2">
                                                                    En retard ({selectedFacture.joursRetard} jour{selectedFacture.joursRetard && selectedFacture.joursRetard > 1 ? 's' : ''})
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Statut</Label>
                                                <div className="p-3 bg-muted rounded-md">
                                                    <div className="flex items-center gap-2">
                                                        {getStatutBadge(selectedFacture.statut)}
                                                        <span className="text-sm text-muted-foreground">
                                                            {selectedFacture.statutLibelle}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Création</Label>
                                                <div className="p-3 bg-muted rounded-md">
                                                    <div className="flex items-center justify-between">
                                                        <span>Date: {new Date(selectedFacture.createdAt || '').toLocaleString('fr-FR')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedFacture.updatedAt && (
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Dernière modification</Label>
                                                    <div className="p-3 bg-muted rounded-md">
                                                        <div className="flex items-center justify-between">
                                                            <span>Date: {new Date(selectedFacture.updatedAt).toLocaleString('fr-FR')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                <DialogFooter className="flex gap-2">
                                    {selectedFacture.statut !== 'payee' && selectedFacture.statut !== 'annulee' && (
                                        <Button
                                            onClick={() => {
                                                setShowDetail(false);
                                                setSelectedFacture(selectedFacture);
                                                setShowPaiement(true);
                                            }}
                                            className="gap-2"
                                        >
                                            <Banknote className="w-4 h-4" />
                                            Enregistrer un paiement
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => handleEdit(selectedFacture)}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Modifier
                                    </Button>
                                    <Button onClick={() => setShowDetail(false)}>Fermer</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={showPaiement} onOpenChange={setShowPaiement}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Enregistrer un paiement</DialogTitle>
                            <DialogDescription>
                                Enregistrez un paiement pour la facture {selectedFacture?.numero}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedFacture && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Montant total</Label>
                                        <div className="font-medium text-lg">
                                            {formatMontant(selectedFacture.montant)}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Solde restant</Label>
                                        <div className="font-medium text-lg text-red-600">
                                            {formatMontant(selectedFacture.solde)}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="montantPaiement">
                                        Montant du paiement <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="montantPaiement"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={selectedFacture.solde}
                                        value={montantPaiement}
                                        onChange={(e) => setMontantPaiement(e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Maximum: {formatMontant(selectedFacture.solde)}
                                    </p>
                                </div>

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowPaiement(false);
                                            setMontantPaiement("");
                                        }}
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        onClick={handleEnregistrerPaiement}
                                        disabled={!montantPaiement || parseFloat(montantPaiement) <= 0}
                                    >
                                        <Banknote className="w-4 h-4 mr-2" />
                                        Enregistrer le paiement
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
};

export default FacturePage;