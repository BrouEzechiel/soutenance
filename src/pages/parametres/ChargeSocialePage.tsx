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
    User,
    CreditCard,
    FileCheck,
    Clock,
    Filter,
    ChevronDown,
    ChevronUp,
    Link,
    Unlink,
    MoreVertical,
    Check,
    X,
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

// CORRECTION DES TYPES : baseCalcul peut être string, undefined ou null
interface ChargeSociale {
    id?: number;
    organisme: string;
    numeroAffiliation?: string | null;
    typeCharge: string;
    modeCalcul: string;
    periode: string;
    reference?: string | null;
    dateDeclaration?: string | null;
    dateEcheance?: string | null;
    montantBase?: string | null;
    majorations?: string | null;
    penalites?: string | null;
    baseCalcul?: string | null;
    taux?: string | null;
    statut: string;
    regulier: boolean;
    createdAt?: string;
    updatedAt?: string;
    ordrePaiementId?: number;
    compteId?: number;
    deviseId?: number;
    createdById?: number;
    updatedById?: number;

    ordrePaiement?: {
        id: number;
        numeroOrdre: string;
        societe?: Societe;
    };
    compte?: {
        id: number;
        codeCompte: string;
        intitule: string;
    };
    devise?: {
        id: number;
        code: string;
        symbole: string;
        tauxChange?: number;
    };
    createdBy?: {
        id: number;
        firstName: string;
    };
    updatedBy?: {
        id: number;
        firstName: string;
    };

    montantTotal?: number;
    montantTotalFormate?: string;
    montantBaseFormate?: string;
    estEnRetard?: boolean;
    organismeLibelle?: string;
    typeChargeLibelle?: string;
    periodeLibelle?: string;
    modeCalculLibelle?: string;
    numeroOrdrePaiement?: string;
    societeRaisonSociale?: string;

    montant_total_num?: number;
    montant_base_num?: number;
    numero_affiliation?: string;
    date_echeance?: string;
    est_en_retard?: boolean;
    base_calcul?: number;
    statut_libelle?: string;
    created_by?: string;
    updated_by?: string;
}

interface Societe {
    id: number;
    raisonSociale: string;
    code: string;
    deviseParDefaut: {
        id: number;
        code: string;
        symbole: string;
        intitule?: string;
        statut?: string;
        estUtilisable?: boolean;
    };
    planComptable?: {
        id: number;
        codeCompte: string;
        intitule: string;
    };
    forme?: string;
    activites?: string;
    registreCommerce?: string;
    compteContribuable?: string;
    telephone?: string;
    anneeDebutActivite?: number;
    adresse?: string;
    siegeSocial?: string;
    capitalSocial?: string;
    gerant?: string;
    statut?: string;
    emailContact?: string;
    createdAt?: string;
    updatedAt?: string;
    estActive?: boolean;
    formeLibelleComplet?: string;
}

interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    classe: string;
}

interface Devise {
    id: number;
    code: string;
    symbole: string;
    tauxChange?: number;
    intitule?: string;
    statut?: string;
    estUtilisable?: boolean;
}

interface OrdrePaiement {
    id: number;
    numeroOrdre: string;
    montantTotal: string;
    statut: string;
    societeId: number;
}

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

const ORGANISMES = {
    cnss: "CNSS (Caisse Nationale de Sécurité Sociale)",
    cnrps: "CNRPS (Caisse Nationale de Retraite et de Prévoyance Sociale)",
    cnas: "CNAS (Caisse Nationale des Assurances Sociales)",
    caisse_retraite: "Caisse de retraite complémentaire",
    caisse_maladie: "Caisse de maladie",
    autre: "Autre organisme social",
};

const TYPES_CHARGE = {
    contribution_patronale: "Contribution patronale",
    contribution_salariale: "Contribution salariale",
    cotisation_syndicale: "Cotisation syndicale",
    assurance_maladie: "Assurance maladie",
    assurance_vie: "Assurance vie",
    autre: "Autre charge sociale",
};

const PERIODES = {
    mensuelle: "Mensuelle",
    trimestrielle: "Trimestrielle",
    semestrielle: "Semestrielle",
    annuelle: "Annuelle",
    exceptionnelle: "Exceptionnelle",
};

const MODES_CALCUL = {
    taux: "Calcul par taux",
    montant_fixe: "Montant fixe",
};

const STATUTS = {
    brouillon: "Brouillon",
    calcule: "Calculé",
    declare: "Déclaré",
    paye: "Payé",
    annule: "Annulé",
};

const ChargeSocialePage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [charges, setCharges] = useState<ChargeSociale[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedCharge, setSelectedCharge] = useState<ChargeSociale | null>(null);
    const [editMode, setEditMode] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterOrganisme, setFilterOrganisme] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatut, setFilterStatut] = useState<string>("all");
    const [filterPeriode, setFilterPeriode] = useState<string>("all");
    const [filterEnRetard, setFilterEnRetard] = useState<string>("all");

    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    const [pagination, setPagination] = useState<PaginationData>({
        total: 0,
        page: 1,
        limit: 20,
        pages: 1,
    });

    const [comptes, setComptes] = useState<PlanComptable[]>([]);
    const [devises, setDevises] = useState<Devise[]>([]);
    const [ordresPaiement, setOrdresPaiement] = useState<OrdrePaiement[]>([]);
    const [societe, setSociete] = useState<Societe | null>(null);

    const [formData, setFormData] = useState<ChargeSociale>({
        organisme: "cnss",
        typeCharge: "contribution_patronale",
        modeCalcul: "montant_fixe",
        periode: "mensuelle",
        statut: "brouillon",
        regulier: true,
    });

    const [dateDeclarationOpen, setDateDeclarationOpen] = useState(false);
    const [dateEcheanceOpen, setDateEcheanceOpen] = useState(false);

    // CORRECTION : Fonction getAuthHeaders améliorée
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

    const getStatutBadge = (statut: string) => {
        const config = {
            brouillon: {
                variant: "outline" as const,
                className: "bg-gray-100 text-gray-800 border-gray-200",
                icon: <FileText className="w-3 h-3 mr-1" />
            },
            calcule: {
                variant: "secondary" as const,
                className: "bg-blue-100 text-blue-800 border-blue-200",
                icon: <Calculator className="w-3 h-3 mr-1" />
            },
            declare: {
                variant: "default" as const,
                className: "bg-yellow-100 text-yellow-800 border-yellow-200",
                icon: <FileCheck className="w-3 h-3 mr-1" />
            },
            paye: {
                variant: "default" as const,
                className: "bg-green-100 text-green-800 border-green-200",
                icon: <CheckCircle className="w-3 h-3 mr-1" />
            },
            annule: {
                variant: "destructive" as const,
                className: "bg-red-100 text-red-800 border-red-200",
                icon: <XCircle className="w-3 h-3 mr-1" />
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

    const getRetardBadge = (estEnRetard: boolean) => {
        if (!estEnRetard) return null;

        return (
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                <Clock className="w-3 h-3 mr-1" />
                En retard
            </Badge>
        );
    };

    const formatMontant = (montant: string | number | undefined | null, devise?: Devise): string => {
        if (montant === undefined || montant === null || montant === "") {
            return "0,00";
        }

        const montantNum = typeof montant === 'string' ? parseFloat(montant) : montant;

        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(montantNum);

        return `${formatted} ${devise?.symbole || 'CFA'}`;
    };

    const formatNumber = (num: number | string | undefined | null): string => {
        if (num === undefined || num === null || num === "") return "0,00";

        const numValue = typeof num === 'string' ? parseFloat(num) : num;

        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numValue);
    };

    const getNumeroAffiliation = (charge: ChargeSociale): string => {
        return charge.numero_affiliation || charge.numeroAffiliation || "Non spécifié";
    };

    const getDateEcheance = (charge: ChargeSociale): string | null => {
        return charge.date_echeance || charge.dateEcheance || null;
    };

    const getEstEnRetard = (charge: ChargeSociale): boolean => {
        return charge.est_en_retard || charge.estEnRetard || false;
    };

    const getMontantTotal = (charge: ChargeSociale): number => {
        return charge.montant_total_num || charge.montantTotal ||
            (parseFloat(charge.montantBase || "0") +
                parseFloat(charge.majorations || "0") +
                parseFloat(charge.penalites || "0"));
    };

    const getMontantBase = (charge: ChargeSociale): number => {
        return charge.montant_base_num || parseFloat(charge.montantBase || "0");
    };

    const getBaseCalcul = (charge: ChargeSociale): number | null => {
        return charge.base_calcul || (charge.baseCalcul ? parseFloat(charge.baseCalcul) : null);
    };

    useEffect(() => {
        fetchData();
        fetchReferences();
    }, [pagination.page, searchTerm, filterOrganisme, filterType, filterStatut,
        filterPeriode, filterEnRetard, dateFrom, dateTo]);

    useEffect(() => {
        if (societe?.deviseParDefaut) {
            setFormData(prev => {
                if (!prev.id && !prev.deviseId) {
                    return {
                        ...prev,
                        deviseId: societe.deviseParDefaut.id
                    };
                }
                return prev;
            });
        }
    }, [societe]);

    const fetchReferences = async () => {
        try {
            try {
                const data = await fetchJson(api("societes/actives"), {}, navigate);

                if (data.success && data.data && data.data.length > 0) {
                    const societeData = data.data[0];
                    const societeInfo: Societe = {
                        id: societeData.id,
                        raisonSociale: societeData.raisonSociale,
                        code: societeData.code || "",
                        deviseParDefaut: societeData.deviseParDefaut,
                        planComptable: societeData.planComptable,
                        forme: societeData.forme,
                        activites: societeData.activites,
                        registreCommerce: societeData.registreCommerce,
                        compteContribuable: societeData.compteContribuable,
                        telephone: societeData.telephone,
                        anneeDebutActivite: societeData.anneeDebutActivite,
                        adresse: societeData.adresse,
                        siegeSocial: societeData.siegeSocial,
                        capitalSocial: societeData.capitalSocial,
                        gerant: societeData.gerant,
                        statut: societeData.statut,
                        emailContact: societeData.emailContact,
                        createdAt: societeData.createdAt,
                        updatedAt: societeData.updatedAt,
                        estActive: societeData.estActive,
                        formeLibelleComplet: societeData.formeLibelleComplet
                    };

                    setSociete(societeInfo);

                    if (societeData.deviseParDefaut) {
                        setFormData(prev => ({
                            ...prev,
                            deviseId: societeData.deviseParDefaut.id
                        }));
                    }
                }
            } catch (error) {
                console.error("Erreur récupération société:", error);
            }

            try {
                const data = await fetchJson(
                    api("plan-comptables?statut=ACTIF&limit=100"),
                    {},
                    navigate
                );

                if (data.success) {
                    const comptesFiltres = (data.data || []).filter((compte: any) =>
                        compte.codeCompte.startsWith('64') ||
                        compte.codeCompte.startsWith('63')
                    );
                    setComptes(comptesFiltres);
                }
            } catch (error) {
                console.error("Erreur chargement comptes:", error);
            }

            try {
                const data = await fetchJson(api("devises?statut=ACTIF"), {}, navigate);
                if (data.success) {
                    setDevises(data.data || []);
                }
            } catch (error) {
                console.error("Erreur chargement devises:", error);
            }

            try {
                const data = await fetchJson(
                    api("ordre-paiement?limit=50&sortBy=createdAt&sortOrder=DESC"),
                    {},
                    navigate
                );

                if (data.success) {
                    const ordresActifs = (data.data || []).filter((ordre: any) =>
                        ordre.statut !== 'annule' && ordre.statut !== 'rejete'
                    );
                    setOrdresPaiement(ordresActifs);
                }
            } catch (error) {
                console.error("Erreur chargement ordres paiement:", error);
            }

        } catch (error) {
            console.error("Erreur chargement références:", error);
        }
    };

    // CORRECTION PRINCIPALE : Amélioration de fetchData pour gérer correctement les filtres
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });

            if (searchTerm) params.append('search', searchTerm);
            if (filterOrganisme !== 'all') params.append('organisme', filterOrganisme);
            if (filterType !== 'all') params.append('typeCharge', filterType);
            if (filterStatut !== 'all') params.append('statut', filterStatut);
            if (filterPeriode !== 'all') params.append('periode', filterPeriode);

            if (filterEnRetard === 'true') params.append('enRetard', 'true');
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const url = api(`charges-sociales?${params.toString()}`);
            console.log('🔍 URL appelée avec filtres:', url);

            const data = await fetchJson(url, {}, navigate);
            console.log('📥 Données API reçues:', data);

            if (data.success) {
                setCharges(data.data || []);
                setPagination(data.meta || pagination);
            } else {
                throw new Error(data.message || "Erreur inconnue");
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
            setError(errorMessage);
            console.error('❌ Erreur fetchData:', error);

            toast({
                title: "Erreur",
                description: "Impossible de charger les charges sociales",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = useCallback((field: keyof ChargeSociale, value: any) => {
        if ((field === 'compteId' || field === 'deviseId' || field === 'ordrePaiementId') && value === "0") {
            setFormData(prev => ({
                ...prev,
                [field]: undefined
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (field === 'modeCalcul') {
            if (value === 'taux') {
                setFormData(prev => ({
                    ...prev,
                    montantBase: undefined,
                    baseCalcul: prev.baseCalcul || "0.00",
                    taux: prev.taux || "0.00"
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    baseCalcul: undefined,
                    taux: undefined,
                    montantBase: prev.montantBase || "0.00"
                }));
            }
        }
    }, []);

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!formData.organisme) {
            errors.push("L'organisme est obligatoire");
        }

        if (!formData.typeCharge) {
            errors.push("Le type de charge est obligatoire");
        }

        if (!formData.periode) {
            errors.push("La période est obligatoire");
        }

        if (!formData.compteId) {
            errors.push("Le compte comptable est obligatoire");
        }

        if (!formData.deviseId) {
            errors.push("La devise est obligatoire");
        }

        if (formData.modeCalcul === 'taux') {
            if (!formData.baseCalcul || parseFloat(formData.baseCalcul || "0") <= 0) {
                errors.push("La base de calcul est obligatoire en mode taux");
            }
            if (!formData.taux || parseFloat(formData.taux || "0") < 0 || parseFloat(formData.taux || "0") > 100) {
                errors.push("Le taux doit être entre 0 et 100%");
            }
        } else {
            if (!formData.montantBase || parseFloat(formData.montantBase || "0") <= 0) {
                errors.push("Le montant de base est obligatoire en mode montant fixe");
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
                ? `${API_BASE_URL}/charges-sociales/${formData.id}`
                : `${API_BASE_URL}/charges-sociales`;

            const method = editMode ? "PUT" : "POST";

            const toUpperCaseSafe = (value: string | undefined | null, defaultValue: string): string => {
                if (!value || typeof value !== 'string') return defaultValue;
                return value.toUpperCase();
            };

            const requestData: any = {
                organisme: toUpperCaseSafe(formData.organisme, 'CNSS'),
                typeCharge: toUpperCaseSafe(formData.typeCharge, 'CONTRIBUTION_PATRONALE'),
                periode: toUpperCaseSafe(formData.periode, 'MENSUELLE'),
                modeCalcul: toUpperCaseSafe(formData.modeCalcul, 'MONTANT_FIXE'),
                statut: toUpperCaseSafe(formData.statut, 'BROUILLON'),
                regulier: formData.regulier,
                compteId: formData.compteId,
                deviseId: formData.deviseId,
            };

            if (formData.numeroAffiliation) requestData.numeroAffiliation = formData.numeroAffiliation;
            if (formData.reference) requestData.reference = formData.reference;
            if (formData.ordrePaiementId) requestData.ordrePaiementId = formData.ordrePaiementId;
            if (formData.dateDeclaration) requestData.dateDeclaration = formData.dateDeclaration;
            if (formData.dateEcheance) requestData.dateEcheance = formData.dateEcheance;

            if (requestData.modeCalcul === 'TAUX') {
                if (formData.baseCalcul) requestData.baseCalcul = formData.baseCalcul;
                if (formData.taux) requestData.taux = formData.taux;
                if (formData.montantBase) requestData.montantBase = formData.montantBase;
            } else {
                if (formData.montantBase) requestData.montantBase = formData.montantBase;
            }

            if (formData.majorations) requestData.majorations = formData.majorations;
            if (formData.penalites) requestData.penalites = formData.penalites;

            console.log('Données envoyées:', requestData);

            const responseData = await fetchJson(url, {
                method,
                body: JSON.stringify(requestData),
            }, navigate);

            console.log('Réponse serveur:', responseData);

            toast({
                title: "Succès",
                description: responseData.message || (editMode ? "Charge sociale mise à jour" : "Charge sociale créée"),
            });

            setTimeout(() => {
                fetchData();
            }, 500);

            resetForm();

        } catch (error: any) {
            console.error('Erreur soumission:', error);
            
            if (error.status === 400 && error.data?.errors) {
                const firstError = Object.entries(error.data.errors)[0];
                if (firstError) {
                    const [field, message] = firstError;
                    toast({
                        title: "Erreur de validation",
                        description: `${field}: ${message}`,
                        variant: "destructive",
                    });
                }
            } else {
                const errorMessage = error?.data?.message || error.message || "Erreur inconnue";
                setError(errorMessage);

                toast({
                    title: "Erreur",
                    description: errorMessage || "Une erreur est survenue lors de l'enregistrement",
                    variant: "destructive",
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const resetFilters = () => {
        setSearchTerm("");
        setFilterOrganisme("all");
        setFilterType("all");
        setFilterStatut("all");
        setFilterPeriode("all");
        setFilterEnRetard("all");
        setDateFrom("");
        setDateTo("");
        setPagination(prev => ({ ...prev, page: 1 }));

        toast({
            title: "Filtres réinitialisés",
            description: "Tous les filtres ont été réinitialisés",
        });
    };

    const handleEdit = (charge: ChargeSociale) => {
        const organismeRaw = charge.organisme || "cnss";
        const organismeValue = organismeRaw.split(' ')[0].toLowerCase();

        setFormData({
            id: charge.id,
            organisme: organismeValue,
            numeroAffiliation: charge.numeroAffiliation || charge.numero_affiliation || undefined,
            typeCharge: charge.typeCharge.toLowerCase(),
            modeCalcul: charge.modeCalcul ? charge.modeCalcul.toLowerCase() : 'montant_fixe',
            periode: charge.periode.toLowerCase(),
            reference: charge.reference || undefined,
            dateDeclaration: charge.dateDeclaration || undefined,
            dateEcheance: charge.dateEcheance || charge.date_echeance || undefined,
            montantBase: charge.montantBase || charge.montant_base_num?.toString() || undefined,
            majorations: charge.majorations || undefined,
            penalites: charge.penalites || undefined,
            baseCalcul: charge.baseCalcul || charge.base_calcul?.toString() || undefined,
            taux: charge.taux || undefined,
            statut: charge.statut.toLowerCase(),
            regulier: charge.regulier,
            compteId: charge.compte?.id,
            deviseId: charge.devise?.id,
            ordrePaiementId: charge.ordrePaiement?.id,
        });
        setEditMode(true);
        setShowForm(true);
    };

    const handleViewDetail = (charge: ChargeSociale) => {
        setSelectedCharge(charge);
        setShowDetail(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement cette charge sociale ? Cette action est irréversible.")) {
            return;
        }

        try {
            const data = await fetchJson(api(`charges-sociales/${id}`), {
                method: "DELETE",
            }, navigate);

            toast({
                title: "Succès",
                description: "Charge sociale supprimée avec succès",
            });

            // Mettre à jour la liste localement
            setCharges(prev => prev.filter(c => c.id !== id));

        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error?.data?.message || error.message || "Erreur lors de la suppression",
                variant: "destructive",
            });
        }
    };

    const handleChangerStatut = async (id: number, nouveauStatut: string) => {
        try {
            const requestData: any = { statut: nouveauStatut };

            if (nouveauStatut === 'declare') {
                requestData.dateDeclaration = new Date().toISOString().split('T')[0];
            }

            const data = await fetchJson(api(`charges-sociales/${id}/changer-statut`), {
                method: "POST",
                body: JSON.stringify(requestData),
            }, navigate);

            toast({
                title: "Succès",
                description: "Statut mis à jour avec succès",
            });

            fetchData();
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error?.data?.message || error.message || "Erreur lors du changement de statut",
                variant: "destructive",
            });
        }
    };

    const handleAssocierOrdre = async (chargeId: number, ordreId: number) => {
        try {
            const data = await fetchJson(api(`charges-sociales/${chargeId}/associer-ordre/${ordreId}`), {
                method: "POST",
            }, navigate);

            toast({
                title: "Succès",
                description: "Charge sociale associée à l'ordre de paiement",
            });

            fetchData();
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error?.data?.message || error.message || "Erreur lors de l'association",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setFormData({
            organisme: "cnss",
            typeCharge: "contribution_patronale",
            modeCalcul: "montant_fixe",
            periode: "mensuelle",
            statut: "brouillon",
            regulier: true,
            deviseId: societe?.deviseParDefaut?.id
        });
        setEditMode(false);
        setShowForm(false);
        setError(null);
        setSelectedCharge(null);
        setShowDetail(false);
    };

    const handlePageChange = (page: number) => {
        setPagination(prev => ({ ...prev, page }));
    };

    const handleExportCsv = async () => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(api("charges-sociales/export/csv"), { headers });

            if (!response.ok) {
                throw new Error("Erreur lors de l'export");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `charges_sociales_${new Date().toISOString().split('T')[0]}.csv`;
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

    const handleAfficherStatistiques = async () => {
        try {
            const data = await fetchJson(api("charges-sociales/statistiques"), {}, navigate);

            if (data.success) {
                const stats = data.data;
                toast({
                    title: "Statistiques des charges sociales",
                    description: (
                        <div className="space-y-1">
                            <div>Total: {stats.total || 0} charges</div>
                            <div>Montant total: {stats.montantTotal || 0} €</div>
                            <div>En retard: {data.enRetard || 0} charges</div>
                        </div>
                    ),
                });
            }
        } catch (error) {
            // Ignorer l'erreur
        }
    };

    const calculerMontant = () => {
        if (formData.modeCalcul === 'taux' && formData.baseCalcul && formData.taux) {
            const base = parseFloat(formData.baseCalcul);
            const taux = parseFloat(formData.taux);
            const montant = (base * taux) / 100;
            setFormData(prev => ({
                ...prev,
                montantBase: montant.toFixed(2)
            }));

            toast({
                title: "Montant calculé",
                description: `Montant: ${formatMontant(montant, devises.find(d => d.id === formData.deviseId))}`,
            });
        }
    };

    if (loading && charges.length === 0) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Chargement des charges sociales...</p>
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
                        <h1 className="text-3xl font-bold text-foreground">Gestion des Charges Sociales</h1>
                        <p className="text-muted-foreground">
                            Déclaration et suivi des charges sociales et contributions
                            {societe && ` - ${societe.raisonSociale}`}
                        </p>
                        {societe?.deviseParDefaut && (
                            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Devise par défaut: {societe.deviseParDefaut.code} ({societe.deviseParDefaut.symbole})
                            </div>
                        )}
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
                        <Button onClick={handleAfficherStatistiques} variant="outline" className="gap-2">
                            <Calculator className="w-4 h-4" />
                            Statistiques
                        </Button>
                        <Button onClick={handleExportCsv} variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            Exporter
                        </Button>
                        <Button onClick={() => setShowForm(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nouvelle charge
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">Recherche</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Référence, organisme..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filterOrganisme">Organisme</Label>
                                <Select value={filterOrganisme} onValueChange={setFilterOrganisme}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les organismes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les organismes</SelectItem>
                                        {Object.entries(ORGANISMES).map(([value, label]) => (
                                            <SelectItem key={value} value={value.toLowerCase()}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filterType">Type de charge</Label>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les types</SelectItem>
                                        {Object.entries(TYPES_CHARGE).map(([value, label]) => (
                                            <SelectItem key={value} value={value.toLowerCase()}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filterPeriode">Période</Label>
                                <Select value={filterPeriode} onValueChange={setFilterPeriode}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Toutes périodes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Toutes périodes</SelectItem>
                                        {Object.entries(PERIODES).map(([value, label]) => (
                                            <SelectItem key={value} value={value.toLowerCase()}>
                                                {label}
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
                                <Label htmlFor="dateFrom">Date à partir du</Label>
                                <Input
                                    id="dateFrom"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateTo">Date jusqu'au</Label>
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
                        <CardTitle>Liste des charges sociales</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {pagination.total} charge{pagination.total !== 1 ? "s" : ""} trouvée
                            {pagination.total !== 1 ? "s" : ""} - Page {pagination.page} sur {pagination.pages}
                        </p>
                    </CardHeader>
                    <CardContent>
                        {charges.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {searchTerm || filterOrganisme !== 'all' || filterType !== 'all' ||
                                filterStatut !== 'all' || filterPeriode !== 'all'
                                    ? "Aucune charge sociale ne correspond aux critères de recherche"
                                    : "Aucune charge sociale trouvée. Créez-en une nouvelle !"}

                            </div>
                        ) : (
                            <>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Référence</TableHead>
                                                <TableHead>Organisme</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Période</TableHead>
                                                <TableHead>Montant</TableHead>
                                                <TableHead>Échéance</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {charges.map((charge) => {
                                                const devise = charge.devise || devises.find(d => d.id === charge.deviseId);
                                                const montantTotal = getMontantTotal(charge);
                                                const montantBase = getMontantBase(charge);
                                                const dateEcheance = getDateEcheance(charge);
                                                const estEnRetard = getEstEnRetard(charge);
                                                const baseCalcul = getBaseCalcul(charge);
                                                const numeroAffiliation = getNumeroAffiliation(charge);

                                                return (
                                                    <TableRow key={charge.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex flex-col">
                                                                <span>{charge.reference || "N/A"}</span>
                                                                {charge.numeroOrdrePaiement && (
                                                                    <Badge variant="outline" className="w-fit mt-1">
                                                                        <Link className="w-3 h-3 mr-1" />
                                                                        {charge.numeroOrdrePaiement}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-xs truncate">
                                                                {charge.organismeLibelle || ORGANISMES[charge.organisme as keyof typeof ORGANISMES] || charge.organisme}
                                                            </div>
                                                            {numeroAffiliation !== "Non spécifié" && (
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    N°: {numeroAffiliation}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {charge.typeChargeLibelle || TYPES_CHARGE[charge.typeCharge as keyof typeof TYPES_CHARGE] || charge.typeCharge}
                                                        </TableCell>
                                                        <TableCell>
                                                            {charge.periodeLibelle || PERIODES[charge.periode as keyof typeof PERIODES] || charge.periode}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">
                                                                {charge.montantTotalFormate || formatMontant(montantTotal, devise)}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground space-y-1">
                                                                <div>
                                                                    Base: {charge.montantBaseFormate || formatMontant(montantBase, devise)}
                                                                </div>
                                                                {charge.majorations && parseFloat(charge.majorations || "0") > 0 && (
                                                                    <div>+ Maj: {formatMontant(charge.majorations, devise)}</div>
                                                                )}
                                                                {charge.penalites && parseFloat(charge.penalites || "0") > 0 && (
                                                                    <div>+ Pén: {formatMontant(charge.penalites, devise)}</div>
                                                                )}
                                                                {baseCalcul !== null && charge.modeCalcul === 'taux' && (
                                                                    <div className="mt-2 pt-2 border-t">
                                                                        <div>Base calcul: {formatNumber(baseCalcul)}</div>
                                                                        {charge.taux && <div>Taux: {charge.taux}%</div>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span>{dateEcheance ?
                                                                    new Date(dateEcheance).toLocaleDateString('fr-FR') :
                                                                    "Non définie"}</span>
                                                                {getRetardBadge(estEnRetard)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1">
                                                                {getStatutBadge(charge.statut)}
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    {charge.regulier ? (
                                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                            Régulière
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                                            Exceptionnelle
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
                                                                    onClick={() => handleViewDetail(charge)}
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

                                                                        <DropdownMenuItem onClick={() => handleEdit(charge)}>
                                                                            <Edit className="w-4 h-4 mr-2" />
                                                                            Modifier
                                                                        </DropdownMenuItem>

                                                                        {charge.statut === 'brouillon' && (
                                                                            <DropdownMenuItem onClick={() => handleChangerStatut(charge.id!, 'calcule')}>
                                                                                <Calculator className="w-4 h-4 mr-2" />
                                                                                Calculer
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        {charge.statut === 'calcule' && (
                                                                            <DropdownMenuItem onClick={() => handleChangerStatut(charge.id!, 'declare')}>
                                                                                <FileCheck className="w-4 h-4 mr-2" />
                                                                                Déclarer
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        {charge.statut === 'declare' && (
                                                                            <DropdownMenuItem onClick={() => handleChangerStatut(charge.id!, 'paye')}>
                                                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                                                Marquer comme payé
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        <DropdownMenuItem onClick={() => {
                                                                            if (charge.ordrePaiementId && ordresPaiement.length > 0) {
                                                                                if (confirm("Dissocier de l'ordre de paiement ?")) {
                                                                                    handleAssocierOrdre(charge.id!, 0);
                                                                                }
                                                                            } else if (ordresPaiement.length > 0) {
                                                                                const ordreId = parseInt(prompt("ID de l'ordre de paiement à associer :") || "0");
                                                                                if (ordreId > 0) {
                                                                                    handleAssocierOrdre(charge.id!, ordreId);
                                                                                }
                                                                            }
                                                                        }}>
                                                                            {charge.ordrePaiementId ? (
                                                                                <>
                                                                                    <Unlink className="w-4 h-4 mr-2" />
                                                                                    Dissocier l'ordre
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Link className="w-4 h-4 mr-2" />
                                                                                    Associer un ordre
                                                                                </>
                                                                            )}
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuItem
                                                                            onClick={() => handleDelete(charge.id!)}
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
                                                );
                                            })}
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
                                {editMode ? "Modifier la charge sociale" : "Nouvelle charge sociale"}
                            </DialogTitle>
                            <DialogDescription>
                                {editMode
                                    ? "Modifiez les informations de la charge sociale"
                                    : "Remplissez les informations pour créer une nouvelle charge sociale"}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Tabs defaultValue="informations" className="w-full">
                                <TabsList className="grid grid-cols-3">
                                    <TabsTrigger value="informations">Informations</TabsTrigger>
                                    <TabsTrigger value="calcul">Calcul</TabsTrigger>
                                    <TabsTrigger value="suivi">Suivi</TabsTrigger>
                                </TabsList>

                                <TabsContent value="informations" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="organisme">
                                                Organisme <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.organisme}
                                                onValueChange={(value) => handleFormChange("organisme", value)}
                                                disabled={submitting}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un organisme" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(ORGANISMES).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="numeroAffiliation">Numéro d'affiliation</Label>
                                            <Input
                                                id="numeroAffiliation"
                                                value={formData.numeroAffiliation || ""}
                                                onChange={(e) => handleFormChange("numeroAffiliation", e.target.value)}
                                                placeholder="Numéro d'affiliation"
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="typeCharge">
                                                Type de charge <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.typeCharge}
                                                onValueChange={(value) => handleFormChange("typeCharge", value)}
                                                disabled={submitting}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(TYPES_CHARGE).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="periode">
                                                Période <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.periode}
                                                onValueChange={(value) => handleFormChange("periode", value)}
                                                disabled={submitting}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner une période" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(PERIODES).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="reference">Référence</Label>
                                            <Input
                                                id="reference"
                                                value={formData.reference || ""}
                                                onChange={(e) => handleFormChange("reference", e.target.value)}
                                                placeholder="Générée automatiquement"
                                                disabled={submitting}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="ordrePaiementId">Ordre de paiement</Label>
                                            <Select
                                                value={formData.ordrePaiementId?.toString() || "0"}
                                                onValueChange={(value) => handleFormChange("ordrePaiementId", value)}
                                                disabled={submitting}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Associer à un ordre" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Aucun</SelectItem>
                                                    {ordresPaiement.map((op) => (
                                                        <SelectItem key={op.id} value={op.id.toString()}>
                                                            {op.numeroOrdre} - {op.montantTotal} €
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="calcul" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="modeCalcul">
                                                Mode de calcul <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.modeCalcul}
                                                onValueChange={(value) => handleFormChange("modeCalcul", value)}
                                                disabled={submitting}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un mode" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(MODES_CALCUL).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="compteId">
                                                Compte comptable <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.compteId?.toString() || "0"}
                                                onValueChange={(value) => handleFormChange("compteId", value)}
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
                                    </div>

                                    {formData.modeCalcul === 'taux' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="baseCalcul">
                                                    Base de calcul <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="baseCalcul"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={formData.baseCalcul || ""}
                                                    onChange={(e) => handleFormChange("baseCalcul", e.target.value)}
                                                    placeholder="0.00"
                                                    disabled={submitting}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="taux">
                                                    Taux (%) <span className="text-red-500">*</span>
                                                </Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="taux"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                        value={formData.taux || ""}
                                                        onChange={(e) => handleFormChange("taux", e.target.value)}
                                                        placeholder="0.00"
                                                        disabled={submitting}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={calculerMontant}
                                                        disabled={!formData.baseCalcul || !formData.taux}
                                                    >
                                                        <Calculator className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label htmlFor="montantBase">
                                                Montant de base <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="montantBase"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.montantBase || ""}
                                                onChange={(e) => handleFormChange("montantBase", e.target.value)}
                                                placeholder="0.00"
                                                disabled={submitting}
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="majorations">Majorations</Label>
                                            <Input
                                                id="majorations"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.majorations || ""}
                                                onChange={(e) => handleFormChange("majorations", e.target.value)}
                                                placeholder="0.00"
                                                disabled={submitting}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="penalites">Pénalités</Label>
                                            <Input
                                                id="penalites"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.penalites || ""}
                                                onChange={(e) => handleFormChange("penalites", e.target.value)}
                                                placeholder="0.00"
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="deviseId">
                                                Devise <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={formData.deviseId?.toString() || (societe?.deviseParDefaut?.id.toString() || "0")}
                                                onValueChange={(value) => handleFormChange("deviseId", value)}
                                                disabled={submitting}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner une devise">
                                                        {formData.deviseId ? (
                                                            devises.find(d => d.id === formData.deviseId) ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span>
                                                                        {devises.find(d => d.id === formData.deviseId)?.code}
                                                                        ({devises.find(d => d.id === formData.deviseId)?.symbole})
                                                                    </span>
                                                                    {societe?.deviseParDefaut?.id === formData.deviseId && (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            Par défaut
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                "Sélectionner une devise"
                                                            )
                                                        ) : societe?.deviseParDefaut ? (
                                                            <div className="flex items-center gap-2">
                                                                <span>
                                                                    {societe.deviseParDefaut.code} ({societe.deviseParDefaut.symbole})
                                                                </span>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Par défaut
                                                                </Badge>
                                                            </div>
                                                        ) : (
                                                            "Sélectionner une devise"
                                                        )}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">Sélectionner une devise</SelectItem>
                                                    {devises.map((devise) => (
                                                        <SelectItem key={devise.id} value={devise.id.toString()}>
                                                            <div className="flex items-center justify-between">
                                                                <span>{devise.code} ({devise.symbole})</span>
                                                                {societe?.deviseParDefaut?.id === devise.id && (
                                                                    <Badge variant="secondary" className="ml-2 text-xs">
                                                                        Par défaut
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {societe?.deviseParDefaut && !formData.deviseId && (
                                                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    <span>La devise par défaut de votre société sera utilisée</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-6">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="regulier">Charge régulière</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Détermine si la charge est récurrente ou exceptionnelle
                                                </p>
                                            </div>
                                            <Switch
                                                id="regulier"
                                                checked={formData.regulier}
                                                onCheckedChange={(checked) => handleFormChange("regulier", checked)}
                                                disabled={submitting}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="suivi" className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="dateDeclaration">Date de déclaration</Label>
                                            <Popover open={dateDeclarationOpen} onOpenChange={setDateDeclarationOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !formData.dateDeclaration && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {formData.dateDeclaration ? (
                                                            format(new Date(formData.dateDeclaration), "PPP", { locale: fr })
                                                        ) : (
                                                            <span>Sélectionner une date</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <CalendarComponent
                                                        mode="single"
                                                        selected={formData.dateDeclaration ? new Date(formData.dateDeclaration) : undefined}
                                                        onSelect={(date) => {
                                                            handleFormChange("dateDeclaration", date?.toISOString().split('T')[0]);
                                                            setDateDeclarationOpen(false);
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    </div>

                                    {societe && (
                                        <Alert>
                                            <Building className="h-4 w-4" />
                                            <AlertTitle>Société</AlertTitle>
                                            <AlertDescription>
                                                <div className="space-y-1">
                                                    <div>Cette charge sociale sera associée à la société : {societe.raisonSociale}</div>
                                                    {societe.deviseParDefaut && (
                                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <DollarSign className="w-3 h-3" />
                                                            <span>Devise par défaut: {societe.deviseParDefaut.code} ({societe.deviseParDefaut.symbole})</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </AlertDescription>
                                        </Alert>
                                    )}
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
                            <DialogTitle>Détails de la charge sociale</DialogTitle>
                            <DialogDescription>
                                Informations complètes de la charge sociale
                            </DialogDescription>
                        </DialogHeader>

                        {selectedCharge && (
                            <div className="space-y-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold">{selectedCharge.reference || "N/A"}</h3>
                                            {getStatutBadge(selectedCharge.statut)}
                                            {getRetardBadge(getEstEnRetard(selectedCharge))}
                                        </div>
                                        <h4 className="text-lg font-semibold text-foreground mt-1">
                                            {selectedCharge.organismeLibelle || ORGANISMES[selectedCharge.organisme as keyof typeof ORGANISMES]}
                                        </h4>
                                        {getNumeroAffiliation(selectedCharge) !== "Non spécifié" && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                N° d'affiliation: {getNumeroAffiliation(selectedCharge)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground text-right">
                                        <div>Créée le: {new Date(selectedCharge.createdAt || '').toLocaleDateString('fr-FR')}</div>
                                        {selectedCharge.updatedAt && (
                                            <div>Modifiée le: {new Date(selectedCharge.updatedAt).toLocaleDateString('fr-FR')}</div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <Tabs defaultValue="general" className="w-full">
                                    <TabsList className="grid grid-cols-3">
                                        <TabsTrigger value="general">Général</TabsTrigger>
                                        <TabsTrigger value="calcul">Calcul</TabsTrigger>
                                        <TabsTrigger value="historique">Historique</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="general" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Organisme</Label>
                                                <p className="font-medium">
                                                    {selectedCharge.organismeLibelle || ORGANISMES[selectedCharge.organisme as keyof typeof ORGANISMES]}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Type de charge</Label>
                                                <p className="font-medium">
                                                    {selectedCharge.typeChargeLibelle || TYPES_CHARGE[selectedCharge.typeCharge as keyof typeof TYPES_CHARGE]}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Période</Label>
                                                <p className="font-medium">
                                                    {selectedCharge.periodeLibelle || PERIODES[selectedCharge.periode as keyof typeof PERIODES]}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Mode de calcul</Label>
                                                <p className="font-medium">
                                                    {selectedCharge.modeCalculLibelle || MODES_CALCUL[selectedCharge.modeCalcul as keyof typeof MODES_CALCUL]}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Numéro d'affiliation</Label>
                                                <p className="font-medium">{getNumeroAffiliation(selectedCharge)}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Statut</Label>
                                                <div className="font-medium">
                                                    {selectedCharge.statut_libelle || STATUTS[selectedCharge.statut as keyof typeof STATUTS] || selectedCharge.statut}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Société</Label>
                                            <p className="font-medium">{selectedCharge.societeRaisonSociale || "Non spécifiée"}</p>
                                        </div>

                                        {selectedCharge.numeroOrdrePaiement && (
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Ordre de paiement associé</Label>
                                                <div className="flex items-center gap-2">
                                                    <Link className="w-4 h-4 text-muted-foreground" />
                                                    <p className="font-medium">{selectedCharge.numeroOrdrePaiement}</p>
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="calcul" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Compte comptable</Label>
                                                {selectedCharge.compte ? (
                                                    <div className="space-y-1">
                                                        <p className="font-medium">{selectedCharge.compte.codeCompte}</p>
                                                        <p className="text-sm text-muted-foreground">{selectedCharge.compte.intitule}</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground">Non spécifié</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Devise</Label>
                                                {selectedCharge.devise ? (
                                                    <div className="space-y-1">
                                                        <p className="font-medium">{selectedCharge.devise.code} ({selectedCharge.devise.symbole})</p>
                                                        {societe?.deviseParDefaut?.id === selectedCharge.devise.id && (
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Badge variant="outline" className="text-xs">
                                                                    Devise par défaut
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground">Non spécifiée</p>
                                                )}
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-4">
                                            <h4 className="font-semibold">Montants</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Montant de base</Label>
                                                    <p className="font-medium">
                                                        {selectedCharge.montantBaseFormate || formatMontant(getMontantBase(selectedCharge), selectedCharge.devise)}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Majorations</Label>
                                                    <p className="font-medium">{formatMontant(selectedCharge.majorations, selectedCharge.devise)}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Pénalités</Label>
                                                    <p className="font-medium">{formatMontant(selectedCharge.penalites, selectedCharge.devise)}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Montant total</Label>
                                                    <p className="font-medium text-lg">
                                                        {selectedCharge.montantTotalFormate || formatMontant(getMontantTotal(selectedCharge), selectedCharge.devise)}
                                                    </p>
                                                </div>
                                            </div>

                                            {selectedCharge.modeCalcul === 'taux' && (
                                                <>
                                                    <Separator />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Base de calcul</Label>
                                                            <p className="font-medium">{formatNumber(getBaseCalcul(selectedCharge))}</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-muted-foreground">Taux</Label>
                                                            <p className="font-medium">{selectedCharge.taux || "0.00"} %</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="historique" className="space-y-4">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Dates importantes</Label>
                                                <div className="space-y-2">
                                                    {selectedCharge.dateDeclaration && (
                                                        <div className="flex items-center gap-2">
                                                            <FileCheck className="w-4 h-4 text-muted-foreground" />
                                                            <span>Déclarée le: {new Date(selectedCharge.dateDeclaration).toLocaleDateString('fr-FR')}</span>
                                                        </div>
                                                    )}
                                                    {getDateEcheance(selectedCharge) && (
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                                            <span>Échéance: {new Date(getDateEcheance(selectedCharge)!).toLocaleDateString('fr-FR')}</span>
                                                            {getEstEnRetard(selectedCharge) && (
                                                                <Badge variant="destructive" className="ml-2">En retard</Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="space-y-2">
                                                <Label className="text-muted-foreground">Création</Label>
                                                <div className="p-3 bg-muted rounded-md">
                                                    <div className="flex items-center justify-between">
                                                        <span>Date: {new Date(selectedCharge.createdAt || '').toLocaleString('fr-FR')}</span>
                                                        {selectedCharge.createdBy && (
                                                            <span className="text-sm text-muted-foreground">
                                                                Par: {selectedCharge.createdBy.firstName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedCharge.updatedAt && (
                                                <div className="space-y-2">
                                                    <Label className="text-muted-foreground">Dernière modification</Label>
                                                    <div className="p-3 bg-muted rounded-md">
                                                        <div className="flex items-center justify-between">
                                                            <span>Date: {new Date(selectedCharge.updatedAt).toLocaleString('fr-FR')}</span>
                                                            {selectedCharge.updatedBy && (
                                                                <span className="text-sm text-muted-foreground">
                                                                    Par: {selectedCharge.updatedBy.firstName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Propriétés</Label>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    {selectedCharge.regulier ? (
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                                                    )}
                                                    <span>Charge {selectedCharge.regulier ? "régulière" : "exceptionnelle"}</span>
                                                </div>
                                            </div>
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
            </div>
        </MainLayout>
    );
};

export default ChargeSocialePage;