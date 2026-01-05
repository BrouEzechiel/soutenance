import { useState, useEffect, useCallback } from "react";
import { useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Printer, Plus, Trash2, Save, Send, CheckCircle, XCircle, Download, Eye, Search, Filter, Loader2, AlertCircle, Building, FileText, Calendar, RefreshCw, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import MainLayout from "@/components/layout/MainLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

// Configuration API
const API_BASE_URL = 'http://localhost:8000/api';

// IMPORTANT: Correction des endpoints selon votre backend
const API_ENDPOINTS = {
    TIERS: `${API_BASE_URL}/tiers`,
    COMPTES_TRESORERIE: `${API_BASE_URL}/comptes-tresorerie`,
    PLAN_COMPTABLE: `${API_BASE_URL}/plan-comptables`,
    DEVISES: `${API_BASE_URL}/devises`,
    FACTURES: `${API_BASE_URL}/factures`,
    FEUILLES_ENCAISSEMENT: `${API_BASE_URL}/feuilles-encaissement`,
    ORDRE_PAIEMENT: `${API_BASE_URL}/ordre-paiement`,
    SOCIETES_ACTIVES: `${API_BASE_URL}/societes/actives`,
    SOCIETES: `${API_BASE_URL}/societes`,
    JOURNAUX_TRESORERIE: `${API_BASE_URL}/journaux-tresorerie`
};

// Helper pour construire les URLs d'API
const api = (path: string) => path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

// Helper pour parser les réponses JSON de manière sécurisée
const safeJson = async (res: Response) => {
    try {
        const txt = await res.text();
        const trimmed = txt.trim();
        // preview removed for production

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
    // basic response info not logged here
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

// Types basés sur vos entités et contrôleurs
interface Facture {
    id: number;
    numero: string;
    montantTotal: number;
    montant?: number; // Pour compatibilité
    dateEmission: string;
    dateEcheance: string;
    solde: number;
    statut: string;
    tiers?: Tiers;
    tiersNom?: string;
    tiersCode?: string;
    statutLibelle?: string;
    montantTotalFormate?: string;
    soldeFormate?: string;
    description?: string;
    bonCommande?: string;
    bonLivraison?: string;
    contrat?: string;
    tauxTva?: number;
    montantTva?: number;
}

interface Tiers {
    id: number;
    code: string;
    intitule: string;
    typeTiers: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    compteComptable?: PlanComptable;
}

interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    typeCompte: string;
    statut: string;
    compteVerrouille?: boolean;
    classeOhada?: string;
    description?: string;
    devise?: Devise;
    societe?: {
        id: number;
        raisonSociale: string;
    };

    

    
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
    estUtilisable?: boolean;
    estCompteTiers?: boolean;
    estCompteTresorerie?: boolean;
    niveauDetail?: number;
    codeFormate?: string;
}

interface CompteTresorerie {
    id: number;
    intitule: string;
    nom?: string;
    numeroCompte: string;
    typeCompte: string;
    iban?: string;
    bic?: string;
    soldeActuel: number;
    devise: Devise;
    banque?: {
        id: number;
        nom: string;
        code: string;
    };
    journalTresorerie?: any;
    planComptable?: PlanComptable;
    gestionnaire?: any;
    estPrincipal?: boolean;
    statut?: string;
    description?: string;
}

interface Devise {
    id: number;
    code: string;
    intitule: string;
    symbole?: string;
    tauxChange: string;
    deviseReference: boolean;
    statut: string;
    utilisable?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface Societe {
    id: number;
    raisonSociale: string;
    deviseParDefaut: Devise;
    forme?: string;
    activites?: string;
    registreCommerce?: string;
    compteContribuable?: string;
    telephone?: string;
    anneeDebutActivite?: number;
    adresse?: string;
    siegeSocial?: string;
    capitalSocial?: number;
    gerant?: string;
    statut?: string;
    emailContact?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface FeuilleEncaissement {
    id?: number;
    numeroFeuille: string;
    dateEncaissement: string;
    typeClient: 'client' | 'particulier' | 'institution' | 'autre';
    codeClient: string;
    nomClient: string;
    tiers?: Tiers | null;
    compteClient: PlanComptable;
    referenceCheque?: string | null;
    referenceVirement?: string | null;
    referenceAutre?: string | null;
    modePaiement: 'cheque' | 'virement' | 'especes' | 'mobile_money' | 'carte' | 'prelevement' | 'autre';
    typePaiement: 'avance' | 'acompte' | 'facture';
    numeroOrdre?: string | null;
    factures: Facture[];
    referenceBonCommande?: string | null;
    descriptionOperation?: string | null;
    montantPaye: number;
    solde?: number | null;
    compteTresorerie: CompteTresorerie;
    devise: Devise;
    statut: 'brouillon' | 'attente_validation' | 'valide' | 'rejete' | 'annule' | 'pointe';
    motifRejet?: string | null;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: any;
    updatedBy?: any;
    operationTresorerie?: any;
    validatedAt?: string;
    validatedBy?: any;
}

// Interface pour la création de facture
interface NewFacture {
    numero: string;
    dateEmission: string;
    dateEcheance?: string;
    montantTotal: number;
    solde: number;
    statut: string;
    tiersId: number;
    description?: string;
    bonCommande?: string;
    bonLivraison?: string;
    contrat?: string;
    tauxTva?: number;
    montantTva?: number;
}

// Fonction utilitaire pour récupérer les headers d'authentification
const getAuthHeaders = (contentType: string | null = 'application/json'): HeadersInit => {
    const token = localStorage.getItem('token');

    const headers: HeadersInit = {
        'Accept': 'application/json',
    };

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

// Fonction utilitaire pour formater la date pour l'input HTML date
const formatDateForInput = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    // Si la date est déjà au format yyyy-MM-dd, la retourner
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    // Sinon, extraire la partie date d'un format ISO (YYYY-MM-DDTHH:MM:SS)
    const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
};

// Fonction pour formater la date au format ISO 8601 que Symfony attend
const formatDateForSymfony = (dateString: string): string => {
    if (!dateString) return '';
    // Si la date est déjà au format complet, la retourner telle quelle
    if (dateString.includes('T')) {
        return dateString;
    }
    // Sinon, ajouter le temps (minuit)
    return `${dateString}T00:00:00`;
};

const FeuilleEncaissementPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { id: routeId } = useParams<{ id?: string }>();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    // États pour les données
    const [societe, setSociete] = useState<Societe | null>(null);
    const [feuille, setFeuille] = useState<FeuilleEncaissement>({
        numeroFeuille: '',
        dateEncaissement: formatDateForInput(new Date().toISOString()), // Utilisation du formateur
        typeClient: 'client',
        codeClient: '',
        nomClient: '',
        compteClient: {
            id: 0,
            codeCompte: '',
            intitule: '',
            typeCompte: '',
            statut: 'ACTIF'
        },
        modePaiement: 'cheque',
        typePaiement: 'facture',
        factures: [],
        montantPaye: 0,
        compteTresorerie: {
            id: 0,
            intitule: '',
            numeroCompte: '',
            typeCompte: '',
            soldeActuel: 0,
            devise: {
                id: 0,
                code: 'XOF',
                intitule: 'Franc CFA',
                tauxChange: '1.000000',
                deviseReference: true,
                statut: 'ACTIF'
            }
        },
        devise: {
            id: 0,
            code: 'XOF',
            intitule: 'Franc CFA',
            tauxChange: '1.000000',
            deviseReference: true,
            statut: 'ACTIF'
        },
        statut: 'brouillon'
    });

    // États pour les listes déroulantes
    const [tiersList, setTiersList] = useState<Tiers[]>([]);
    const [comptesTresorerie, setComptesTresorerie] = useState<CompteTresorerie[]>([]);
    const [planComptable, setPlanComptable] = useState<PlanComptable[]>([]);
    const [facturesDisponibles, setFacturesDisponibles] = useState<Facture[]>([]);
    const [devisesDisponibles, setDevisesDisponibles] = useState<Devise[]>([]);
    const [deviseSociete, setDeviseSociete] = useState<Devise | null>(null);

    // États pour les modals
    const [showFacturesModal, setShowFacturesModal] = useState(false);
    const [showTiersModal, setShowTiersModal] = useState(false);
    const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
    const [selectedTiers, setSelectedTiers] = useState<Tiers | null>(null);
    const [showRejetModal, setShowRejetModal] = useState(false);
    const [motifRejet, setMotifRejet] = useState('');

    // Nouveaux états pour la création de facture
    const [showCreateFactureModal, setShowCreateFactureModal] = useState(false);
    const [newFacture, setNewFacture] = useState<NewFacture>({
        numero: '',
        dateEmission: formatDateForInput(new Date().toISOString()), // Utilisation du formateur
        dateEcheance: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()), // Utilisation du formateur
        montantTotal: 0,
        solde: 0,
        statut: 'emise',
        tiersId: 0,
        description: '',
        bonCommande: '',
        bonLivraison: '',
        contrat: '',
        tauxTva: 20,
    });

    // États pour la recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTiersType, setSelectedTiersType] = useState<string | undefined>(undefined);

    // États pour le chargement
    const [isLoadingTiers, setIsLoadingTiers] = useState(false);
    const [isLoadingComptes, setIsLoadingComptes] = useState(false);
    const [isLoadingPlanComptable, setIsLoadingPlanComptable] = useState(false);
    const [isLoadingFactures, setIsLoadingFactures] = useState(false);
    const [isLoadingSociete, setIsLoadingSociete] = useState(false);
    const [isLoadingDevises, setIsLoadingDevises] = useState(false);
    const [isCreatingFacture, setIsCreatingFacture] = useState(false);
    
    // Fonction pour générer un numéro de facture automatiquement
    const handleGenererNumeroFacture = () => {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const numero = `FACT-${year}${month}-${random}`;

        setNewFacture(prev => ({
            ...prev,
            numero
        }));

        toast({
            title: "Numéro généré",
            description: `Numéro: ${numero}`,
        });
    };

    // Historique des actions pour la feuille
    const [historique, setHistorique] = useState<any[]>([]);
    const [isLoadingHistorique, setIsLoadingHistorique] = useState(false);

    // États pour la gestion des erreurs
    const [error, setError] = useState<string | null>(null);
    const [useDemoData, setUseDemoData] = useState<boolean>(false);

    // Constantes basées sur votre entité
    const TYPES_CLIENT = {
        client: 'Client',
        particulier: 'Particulier',
        institution: 'Institution',
        autre: 'Autre'
    };

    const MODES_PAIEMENT = {
        cheque: 'Chèque',
        virement: 'Virement',
        especes: 'Espèces',
        mobile_money: 'Mobile Money',
        carte: 'Carte bancaire',
        prelevement: 'Prélèvement',
        autre: 'Autre'
    };

    const TYPES_PAIEMENT = {
        avance: 'Avance',
        acompte: 'Acompte',
        facture: 'Paiement facture'
    };

    const STATUTS = {
        brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
        attente_validation: { label: 'En attente de validation', color: 'bg-yellow-100 text-yellow-800' },
        valide: { label: 'Validé', color: 'bg-green-100 text-green-800' },
        rejete: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
        annule: { label: 'Annulé', color: 'bg-gray-100 text-gray-800' },
        pointe: { label: 'Pointé', color: 'bg-blue-100 text-blue-800' }
    };

    // Charger les données initiales
    useEffect(() => {
        fetchInitialData();
        fetchUserRoles();
    }, []);

    // Rafraîchir la feuille lorsqu'on a un ID
    useEffect(() => {
        if (feuille.id) {
            refreshFeuille();
        }
    }, [feuille.id]);

    // CORRECTION IMPORTANTE : Charger l'historique quand la feuille est chargée
    useEffect(() => {
        const loadHistorique = async () => {
            if (feuille.id) {
                await fetchHistorique();
            }
        };
                const timer = setTimeout(() => {
            loadHistorique();
        }, 500);
        return () => clearTimeout(timer);
    }, [feuille.id]);

    // Si une id est présente dans l'URL, initialiser la feuille.id pour forcer le chargement
    useEffect(() => {
        if (routeId) {
            const num = Number(routeId);
            if (!isNaN(num) && num > 0) {
                setFeuille(prev => ({ ...(prev as any), id: num }));
            }
        }
    }, [routeId]);

    // Fallback: tenter d'extraire un ID numérique depuis l'URL si useParams n'a rien fourni
    useEffect(() => {
        if ((feuille as any)?.id) return; // déjà défini
        try {
            const url = typeof window !== 'undefined' ? window.location.href : null;
            if (!url) return;

            // Chercher query param 'id'
            const search = typeof window !== 'undefined' ? window.location.search : '';
            const params = new URLSearchParams(search);
            const qid = params.get('id');
            if (qid && !isNaN(Number(qid))) {
                setFeuille(prev => ({ ...(prev as any), id: Number(qid) }));
                return;
            }

            // Sinon, tenter le dernier segment numérique du path
            const path = typeof window !== 'undefined' ? window.location.pathname : '';
            const parts = path.split('/').filter(Boolean);
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                const n = Number(p);
                if (!isNaN(n) && n > 0) {
                    setFeuille(prev => ({ ...(prev as any), id: n }));
                    return;
                }
            }
        } catch (e) {
            // fallback extraction failed
        }
    }, []);

    useEffect(() => {}, [(feuille as any)?.id]);

    const fetchUserRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            // Décoder le token JWT pour extraire les rôles
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            setUserRoles(payload.roles || []);
        } catch (error) {
            console.error('Erreur lors du décodage du token:', error);
        }
    };

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Vous n\'êtes pas connecté. Veuillez vous reconnecter.');
                setUseDemoData(true);
                toast({
                    title: "Non connecté",
                    description: "Veuillez vous reconnecter pour accéder aux données réelles",
                    variant: "destructive"
                });
                return;
            }

            await fetchSociete();
            await Promise.all([
                fetchTiers(),
                fetchComptesTresorerie(),
                fetchPlanComptable(),
                fetchFactures(),
                fetchAllDevises()
            ]);
        } catch (error) {
            console.error('Erreur lors du chargement des données initiales:', error);
            setError('Erreur lors du chargement des données initiales');
        }
    };

    // Fonction pour rafraîchir les données de la feuille
    const refreshFeuille = async () => {
        if (!feuille.id) return;

        setRefreshing(true);
        try {
            const response = await fetchJson(`${API_ENDPOINTS.FEUILLES_ENCAISSEMENT}/${feuille.id}`, {}, navigate);

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setFeuille(prev => ({
                        ...prev,
                        ...result.data,
                        statut: result.data.statut,
                        dateEncaissement: formatDateForInput(result.data.dateEncaissement)
                    }));
                    // Charger l'historique si disponible
                    try {
                        const fid = result.data.id || feuille.id;
                        await fetchHistorique();
                    } catch (e) {
                        // ignore historique errors
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors du rafraîchissement:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // Récupérer la société de l'utilisateur connecté
    const fetchSociete = async () => {
        setIsLoadingSociete(true);
        try {
            const response = await fetchJson(API_ENDPOINTS.SOCIETES_ACTIVES, {}, navigate);

            if (!response.ok) {
                const fallbackResponse = await fetchJson(API_ENDPOINTS.SOCIETES, {}, navigate);

                if (!fallbackResponse.ok) {
                    throw new Error('Impossible de récupérer les informations de la société');
                }

                const fallbackData = await fallbackResponse.json();
                const societeData = Array.isArray(fallbackData.data) ? fallbackData.data[0] : fallbackData.data || fallbackData;
                setSociete(societeData);

                if (societeData.deviseParDefaut) {
                    setDeviseSociete(societeData.deviseParDefaut);
                    setFeuille(prev => ({
                        ...prev,
                        devise: societeData.deviseParDefaut
                    }));
                }
                return;
            }

            const data = await response.json();

            let societeData;
            if (Array.isArray(data.data) && data.data.length > 0) {
                societeData = data.data[0];
            } else if (Array.isArray(data) && data.length > 0) {
                societeData = data[0];
            } else {
                societeData = data.data || data;
            }

            if (!societeData) {
                throw new Error('Aucune société trouvée pour cet utilisateur');
            }

            setSociete(societeData);

            if (societeData.deviseParDefaut) {
                setDeviseSociete(societeData.deviseParDefaut);
                setFeuille(prev => ({
                    ...prev,
                    devise: societeData.deviseParDefaut
                }));

                toast({
                    title: "Devise chargée",
                    description: `La devise de votre société (${societeData.deviseParDefaut.code}) a été appliquée`,
                    variant: "default",
                });
            } else {
                throw new Error('Aucune devise par défaut configurée pour cette société');
            }

        } catch (error) {
            console.error('Erreur lors du chargement de la société:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

            toast({
                title: "Attention",
                description: `Impossible de charger la devise de la société: ${errorMessage}`,
                variant: "destructive",
            });
        } finally {
            setIsLoadingSociete(false);
        }
    };

    // Récupérer toutes les devises
    const fetchAllDevises = async () => {
        setIsLoadingDevises(true);
        try {
            const response = await fetchJson(API_ENDPOINTS.DEVISES, {}, navigate);

            if (response.ok) {
                const data = await response.json();
                const devisesData = data.data || data || [];
                setDevisesDisponibles(devisesData);
            }
        } catch (error) {
            console.warn('Impossible de charger toutes les devises:', error);
        } finally {
            setIsLoadingDevises(false);
        }
    };

    const fetchTiers = async () => {
        setIsLoadingTiers(true);
        try {
            const response = await fetchJson(`${API_ENDPOINTS.TIERS}?limit=100`, {}, navigate);

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Session expirée. Veuillez vous reconnecter.');
                    throw new Error('Session expirée');
                }
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setTiersList(data.data || data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des tiers:', error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les tiers",
                variant: "destructive",
            });
        } finally {
            setIsLoadingTiers(false);
        }
    };

    const fetchComptesTresorerie = async () => {
        setIsLoadingComptes(true);
        try {
            const response = await fetchJson(API_ENDPOINTS.COMPTES_TRESORERIE, {}, navigate);

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Session expirée. Veuillez vous reconnecter.');
                    throw new Error('Session expirée');
                }
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const comptesData = data.data || data || [];

            let comptesFiltres = comptesData;
            if (deviseSociete) {
                comptesFiltres = comptesData.filter((compte: CompteTresorerie) =>
                    compte.devise && compte.devise.code === deviseSociete.code
                );
            }

            setComptesTresorerie(comptesFiltres);

            if (deviseSociete && comptesFiltres.length === 0 && comptesData.length > 0) {
                toast({
                    title: "Attention",
                    description: `Aucun compte de trésorerie trouvé en ${deviseSociete.code}. Utilisez les comptes disponibles dans d'autres devises.`,
                    variant: "destructive",
                });
                setComptesTresorerie(comptesData);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des comptes de trésorerie:', error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les comptes de trésorerie",
                variant: "destructive",
            });
        } finally {
            setIsLoadingComptes(false);
        }
    };

    const fetchPlanComptable = async () => {
        setIsLoadingPlanComptable(true);
        try {
            const response = await fetchJson(`${API_ENDPOINTS.PLAN_COMPTABLE}?limit=100`, {}, navigate);

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Session expirée. Veuillez vous reconnecter.');
                    throw new Error('Session expirée');
                }
                throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setPlanComptable(data.data || data || []);
        } catch (error) {
            console.error('Erreur lors du chargement du plan comptable:', error);
            toast({
                title: "Erreur",
                description: "Impossible de charger le plan comptable",
                variant: "destructive",
            });
        } finally {
            setIsLoadingPlanComptable(false);
        }
    };

    const fetchFactures = async () => {
        setIsLoadingFactures(true);
        try {
            // CORRECTION : D'abord essayer les factures impayées
            let response = await fetchJson(`${API_ENDPOINTS.FACTURES}/impayees`, {}, navigate);

            if (!response.ok || response.status === 404) {
                // CORRECTION : Essayer sans filtre statut
                response = await fetchJson(`${API_ENDPOINTS.FACTURES}?limit=100`, {}, navigate);
            }

            if (response.ok) {
                const data = await response.json();

                // CORRECTION : Gérer la structure de réponse différente
                let facturesData: any[] = [];
                if (data.success && data.data) {
                    facturesData = Array.isArray(data.data) ? data.data : [data.data];
                } else if (Array.isArray(data)) {
                    facturesData = data;
                } else if (data.data && Array.isArray(data.data)) {
                    facturesData = data.data;
                } else if (data.items && Array.isArray(data.items)) {
                    facturesData = data.items;
                } else if (data) {
                    facturesData = [data];
                }

                // CORRECTION : Filtrer avec type any et convertir ensuite
                const facturesFiltrees = facturesData.filter((facture: any) => {
                    const statut = facture.statut?.toString().toLowerCase();
                    return statut === 'emise' ||
                        statut === 'impayee' ||
                        statut === 'impayée' ||
                        statut === 'impayé' ||
                        statut === 'partiellement_payee' ||
                        statut === 'partiellement payée' ||
                        facture.solde > 0;
                }).map((facture: any) => {
                    // Normaliser les données
                    return {
                        id: facture.id,
                        numero: facture.numero,
                        montantTotal: facture.montantTotal || facture.montant || 0,
                        montant: facture.montant || facture.montantTotal || 0,
                        dateEmission: facture.dateEmission,
                        dateEcheance: facture.dateEcheance,
                        solde: facture.solde || facture.montantTotal || facture.montant || 0,
                        statut: facture.statut,
                        tiers: facture.tiers,
                        tiersNom: facture.tiersNom || facture.tiers?.intitule,
                        tiersCode: facture.tiersCode || facture.tiers?.code,
                        statutLibelle: facture.statutLibelle,
                        montantTotalFormate: facture.montantTotalFormate,
                        soldeFormate: facture.soldeFormate,
                        description: facture.description,
                        bonCommande: facture.bonCommande,
                        bonLivraison: facture.bonLivraison,
                        contrat: facture.contrat,
                        tauxTva: facture.tauxTva,
                        montantTva: facture.montantTva
                    } as Facture;
                });

                setFacturesDisponibles(facturesFiltrees);
            } else {
                console.warn('Impossible de charger les factures');
                setFacturesDisponibles([]);
            }
        } catch (error) {
            console.warn('Impossible de charger les factures:', error);
            setFacturesDisponibles([]);
        } finally {
            setIsLoadingFactures(false);
        }
    };

    // Charger l'historique : tenter spécifique à la feuille si possible, sinon global
    // forceReload: when true adds a cache-busting query param to force fresh DB read
    const fetchHistorique = async (forceReload: boolean = false) => {
        setIsLoadingHistorique(true);
        try {
            // si on a une feuille en contexte, essayer l'historique par-feuille d'abord
            if (feuille?.id) {
                let url = `${API_ENDPOINTS.FEUILLES_ENCAISSEMENT}/${feuille.id}/historique`;
                if (forceReload) {
                    const sep = url.includes('?') ? '&' : '?';
                    url = `${url}${sep}_ts=${Date.now()}`;
                }
                const response = await fetchJson(url, {}, navigate);
                if (response) {
                    const data = await safeJson(response);
                    let items: any[] = [];
                    if (Array.isArray(data)) items = data;
                    else if (data?.data) items = Array.isArray(data.data) ? data.data : [data.data];
                    else if (Array.isArray((data as any)?.items)) items = (data as any).items;

                    // fallback to global if nothing for this feuille
                    if (items.length === 0) {
                        await fetchHistoriqueGlobal(forceReload);
                        return;
                    }

                    setHistorique(items);
                    return;
                }
            }

            // default: fetch global
            await fetchHistoriqueGlobal(forceReload);
        } catch (e) {
            setHistorique([]);
        } finally {
            setIsLoadingHistorique(false);
        }
    };

    // Fonction pour charger l'historique global (toutes les feuilles)
    const fetchHistoriqueGlobal = async (forceReload: boolean = false) => {
        setIsLoadingHistorique(true);
        try {
            let url = `${API_ENDPOINTS.FEUILLES_ENCAISSEMENT}/historique`;
            if (forceReload) {
                const sep = url.includes('?') ? '&' : '?';
                url = `${url}${sep}_ts=${Date.now()}`;
            }
            const response = await fetchJson(url, {}, navigate);

            if (!response) {
                setHistorique([]);
                return;
            }

            // Même si success=false côté API, on tente d'extraire les données
            const data = await safeJson(response);
            let items: any[] = [];

            if (Array.isArray(data)) {
                items = data;
            } else if (data?.data) {
                items = Array.isArray(data.data) ? data.data : [data.data];
            } else if (Array.isArray((data as any)?.items)) {
                items = (data as any).items;
            } else if (Array.isArray((data as any)?.historique)) {
                items = (data as any).historique;
            }

            console.debug('[Historique] fetchHistoriqueGlobal -> items count', items?.length, items?.slice?.(0,3));
            setHistorique(items);
        } catch (e) {
            // Ne pas remonter l'erreur en console, juste vider l'historique
            setHistorique([]);
        } finally {
            setIsLoadingHistorique(false);
        }
    };

    // Gestion du changement de mode de paiement
    const handleModePaiementChange = (value: string) => {
        setFeuille({
            ...feuille,
            modePaiement: value as any,
            referenceCheque: value === 'cheque' ? feuille.referenceCheque : null,
            referenceVirement: value === 'virement' ? feuille.referenceVirement : null,
            referenceAutre: value === 'autre' ? feuille.referenceAutre : null
        });
    };

    const handleTypePaiementChange = (value: string) => {
        setFeuille({
            ...feuille,
            typePaiement: value as any
        });
    };

    // Gestion du changement de tiers
    const handleTiersSelect = (tiers: Tiers) => {
        setSelectedTiers(tiers);
        setFeuille({
            ...feuille,
            tiers: tiers,
            codeClient: tiers.code,
            nomClient: tiers.intitule,
            compteClient: tiers.compteComptable || feuille.compteClient
        });
        setShowTiersModal(false);
    };

    // Ajouter une facture
    const handleAddFacture = () => {
        if (selectedFacture) {
            // Empêcher l'ajout de factures déjà payées ou à solde nul
            const statut = (selectedFacture.statut || '').toString().toLowerCase();
            if (statut === 'payee' || selectedFacture.solde <= 0) {
                toast({ title: 'Facture invalide', description: 'Cette facture est déjà payée ou n\'a pas de solde à encaisser', variant: 'destructive' });
                setShowFacturesModal(false);
                setSelectedFacture(null);
                return;
            }

            if (!feuille.factures.some(f => f.id === selectedFacture.id)) {
                const nouvellesFactures = [...feuille.factures, selectedFacture];
                const totalFactures = nouvellesFactures.reduce((total, facture) => total + (facture.montantTotal || facture.montant || 0), 0);

                setFeuille({
                    ...feuille,
                    factures: nouvellesFactures,
                    montantPaye: Math.min(totalFactures, feuille.montantPaye || 0)
                });
                setSelectedFacture(null);
            }
            setShowFacturesModal(false);
        }
    };

    // Retirer une facture
    const handleRemoveFacture = (factureId: number) => {
        const factureToRemove = feuille.factures.find(f => f.id === factureId);
        if (factureToRemove) {
            const nouvellesFactures = feuille.factures.filter(f => f.id !== factureId);
            const totalFactures = nouvellesFactures.reduce((total, facture) => total + (facture.montantTotal || facture.montant || 0), 0);

            setFeuille({
                ...feuille,
                factures: nouvellesFactures,
                montantPaye: Math.min(totalFactures, feuille.montantPaye || 0)
            });
        }
    };

    // Calculer le total des factures
    const calculateTotalFactures = () => {
        return feuille.factures.reduce((total, facture) => total + (facture.montantTotal || facture.montant || 0), 0);
    };

    // Calculer le solde
    const calculateSolde = () => {
        const totalFactures = calculateTotalFactures();
        const montantPaye = feuille.montantPaye || 0;
        return totalFactures - montantPaye;
    };

    // Formater un montant avec la devise de la société
    const formatMontant = (montant: number) => {
        const deviseCode = deviseSociete?.code || feuille.devise?.code || 'XOF';
        const symbole = deviseSociete?.symbole || '';

        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(montant) + ` ${symbole} ${deviseCode}`.trim();
    };

    // Formatage de date
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    };

    // Formater une date et heure
    const formatDateTime = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR');
    };

    // Sauvegarder la feuille - VERSION CORRIGÉE AVEC HISTORIQUE
    const handleSave = async () => {
        if (!isFormValid()) {
            toast({
                title: "Erreur de validation",
                description: "Veuillez remplir tous les champs obligatoires",
                variant: "destructive",
            });
            return;
        }

        // Valider les règles métier
        const businessValidation = validateBusinessRules();
        if (!businessValidation.valid) {
            toast({
                title: "Validation métier",
                description: businessValidation.message,
                variant: "destructive",
            });
            return;
        }

        // Vérifier les permissions si feuille validée
        if (feuille.id && feuille.statut === 'valide' && !canEditValidatedFeuille()) {
            toast({
                title: "Permission refusée",
                description: "Vous n'avez pas les droits pour modifier une feuille validée",
                variant: "destructive",
            });
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            toast({
                title: "Authentification requise",
                description: "Veuillez vous connecter pour sauvegarder",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const url = feuille.id
                ? `${API_ENDPOINTS.FEUILLES_ENCAISSEMENT}/${feuille.id}`
                : API_ENDPOINTS.FEUILLES_ENCAISSEMENT;

            const method = feuille.id ? 'PUT' : 'POST';

            // CORRECTION : Formater la date pour Symfony (ISO 8601)
            const formattedDate = formatDateForSymfony(feuille.dateEncaissement);

            // CORRECTION : Préparer l'objet de données SANS les valeurs null
            const dataToSend: any = {
                dateEncaissement: formattedDate,
                typeClient: feuille.typeClient,
                codeClient: feuille.codeClient,
                nomClient: feuille.nomClient,
                modePaiement: feuille.modePaiement,
                typePaiement: feuille.typePaiement,
                montantPaye: feuille.montantPaye.toString(),
                statut: feuille.statut,
            };

            // CORRECTION : Ajouter les champs seulement s'ils ont une valeur
            if (feuille.compteClient?.id) {
                dataToSend.compteClient = { id: feuille.compteClient.id };
            }

            if (feuille.compteTresorerie?.id) {
                dataToSend.compteTresorerie = { id: feuille.compteTresorerie.id };
            }

            if (deviseSociete?.id) {
                dataToSend.devise = { id: deviseSociete.id };
            }

            // CORRECTION : Envoyer tiers seulement si sélectionné
            if (feuille.tiers?.id) {
                dataToSend.tiers = { id: feuille.tiers.id };
            }

            // CORRECTION : Ajouter les références seulement si elles ont une valeur
            if (feuille.referenceCheque && feuille.referenceCheque.trim() !== '') {
                dataToSend.referenceCheque = feuille.referenceCheque;
            }

            if (feuille.referenceVirement && feuille.referenceVirement.trim() !== '') {
                dataToSend.referenceVirement = feuille.referenceVirement;
            }

            if (feuille.referenceAutre && feuille.referenceAutre.trim() !== '') {
                dataToSend.referenceAutre = feuille.referenceAutre;
            }

            if (feuille.numeroOrdre && feuille.numeroOrdre.trim() !== '') {
                dataToSend.numeroOrdre = feuille.numeroOrdre;
            }

            if (feuille.referenceBonCommande && feuille.referenceBonCommande.trim() !== '') {
                dataToSend.referenceBonCommande = feuille.referenceBonCommande;
            }

            if (feuille.descriptionOperation && feuille.descriptionOperation.trim() !== '') {
                dataToSend.descriptionOperation = feuille.descriptionOperation;
            }

            // CORRECTION : Ajouter les factures seulement si elles existent
            if (feuille.factures.length > 0) {
                dataToSend.factures = feuille.factures.map(f => f.id);
            }

            // CORRECTION : Vérifier que tous les champs obligatoires sont présents
            const requiredFields = [
                'dateEncaissement',
                'typeClient',
                'codeClient',
                'nomClient',
                'modePaiement',
                'montantPaye',
                'compteClient',
                'compteTresorerie',
                'devise',
                'statut'
            ];

            const missingFields = requiredFields.filter(field => !dataToSend[field]);

            if (missingFields.length > 0) {
                throw new Error(`Champs obligatoires manquants: ${missingFields.join(', ')}`);
            }

            console.log('Données envoyées au serveur:', dataToSend);
            console.log('État actuel de feuille:', feuille);
            console.log('Devise société:', deviseSociete);

            const response = await fetchJson(url, {
                method,
                body: JSON.stringify(dataToSend)
            }, navigate);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Session expirée. Veuillez vous reconnecter.');
                }

                if (response.status === 403) {
                    throw new Error('Vous n\'avez pas les permissions nécessaires pour effectuer cette action.');
                }

                const errorText = await response.text();
                console.error('Erreur serveur:', errorText);

                let errorMessage = `Erreur ${response.status}: ${response.statusText}`;

                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                    
                    // Messages spécifiques pour certaines erreurs backend
                    if (errorMessage.includes('journal')) {
                        errorMessage = 'Aucun journal de trésorerie disponible. Veuillez configurer un journal avant de valider.';
                    }
                    
                    // Si il y a des erreurs de validation détaillées
                    if (errorData.errors) {
                        const validationErrors = Object.entries(errorData.errors)
                            .map(([field, message]) => `${field}: ${message}`)
                            .join(', ');
                        errorMessage = `Erreurs de validation: ${validationErrors}`;
                    }
                    
                    // Afficher les factures invalides si présentes
                    if (errorData.invalid_facture_ids) {
                        errorMessage += ` (Factures invalides: ${errorData.invalid_facture_ids.join(', ')})`;
                    }
                } catch {
                    errorMessage = errorText || errorMessage;
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('Réponse serveur:', result);

            if (result.success) {
                // Mettre à jour la feuille avec la réponse du serveur
                const updatedFeuille = {
                    ...result.data || result,
                    id: result.data?.id || result.id,
                    numeroFeuille: result.data?.numeroFeuille || result.numeroFeuille || feuille.numeroFeuille,
                    dateEncaissement: formatDateForInput(result.data?.dateEncaissement || result.dateEncaissement || feuille.dateEncaissement),
                };

                setFeuille(updatedFeuille);

                toast({
                    title: "Succès",
                    description: feuille.id ? "Feuille mise à jour" : "Feuille créée",
                    variant: "default",
                });

                // SOLUTION 1 : Rafraîchir l'historique après la sauvegarde réussie
                const feuilleId = result.data?.id || result.id || updatedFeuille.id;
                if (feuilleId) {
                    console.log('[Historique] Rafraîchissement après sauvegarde, ID:', feuilleId);
                    await fetchHistorique();
                }
            } else {
                throw new Error(result.message || "Erreur lors de la sauvegarde");
            }

        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            const errorMessage = error instanceof Error ? error.message : "Impossible de sauvegarder";
            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Soumettre pour validation
    const handleSoumettre = async () => {
        if (!feuille.id) {
            toast({
                title: "Erreur",
                description: "Veuillez d'abord sauvegarder la feuille",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetchJson(`${API_ENDPOINTS.FEUILLES_ENCAISSEMENT}/${feuille.id}/soumettre`, {
                method: 'POST'
            }, navigate);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Session expirée. Veuillez vous reconnecter.');
                }
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            setFeuille(prev => ({
                ...prev,
                ...result.data || result,
                statut: result.data?.statut || result.statut || prev.statut,
                dateEncaissement: formatDateForInput(result.data?.dateEncaissement || result.dateEncaissement || prev.dateEncaissement)
            }));
            
            // Rafraîchir l'historique après soumission
            await fetchHistorique();
            
            toast({
                title: "Succès",
                description: "Feuille soumise pour validation",
                variant: "default",
            });
        } catch (error) {
            console.error('Erreur lors de la soumission:', error);
            const errorMessage = error instanceof Error ? error.message : "Impossible de soumettre";
            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive",
            });
        }
    };

    // Valider la feuille - VERSION AMÉLIORÉE
    const handleValider = async () => {
        if (!feuille.id) return;

        // Vérifier les permissions
        if (!canValidateFeuille()) {
            toast({
                title: 'Permission refusée',
                description: 'Seuls les administrateurs peuvent valider une feuille d\'encaissement.',
                variant: 'destructive'
            });
            return;
        }

        // Vérification client : référence chèque requise si mode chèque
        if (feuille.modePaiement === 'cheque' && (!feuille.referenceCheque || feuille.referenceCheque.trim() === '')) {
            toast({
                title: 'Validation impossible',
                description: 'La référence du chèque est requise pour valider une feuille en mode chèque.',
                variant: 'destructive'
            });
            return;
        }

        // Valider les règles métier
        const businessValidation = validateBusinessRules();
        if (!businessValidation.valid) {
            toast({
                title: "Validation métier",
                description: businessValidation.message,
                variant: "destructive",
            });
            return;
        }

        // VÉRIFIER LE STATUT AVANT D'ESSAYER DE VALIDER
        if (feuille.statut === 'valide') {
            toast({
                title: "Déjà validée",
                description: "Cette feuille est déjà validée",
                variant: "default",
            });
            return;
        }

        if (feuille.statut === 'pointe') {
            toast({
                title: "Déjà pointée",
                description: "Cette feuille est déjà pointée et ne peut plus être modifiée",
                variant: "destructive",
            });
            return;
        }

        if (feuille.statut === 'rejete') {
            toast({
                title: "Rejetée",
                description: "Cette feuille a été rejetée et ne peut plus être validée",
                variant: "destructive",
            });
            return;
        }

        if (feuille.statut === 'annule') {
            toast({
                title: "Annulée",
                description: "Cette feuille a été annulée",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetchJson(`${API_ENDPOINTS.FEUILLES_ENCAISSEMENT}/${feuille.id}/valider`, {
                method: 'POST'
            }, navigate);

            const responseText = await response.text();
            console.log('Réponse brute validation:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Erreur parsing JSON:', e);
                throw new Error(`Réponse invalide du serveur: ${responseText}`);
            }

            if (!response.ok) {
                const errorMessage = result.message || result.error || `Erreur ${response.status}`;

                // Si la feuille est déjà validée, message différent
                if (errorMessage.includes('déjà validée') || errorMessage.includes('already validated')) {
                    toast({
                        title: "Déjà validée",
                        description: "Cette feuille est déjà validée",
                        variant: "default",
                    });
                    // Mettre à jour le statut localement
                    setFeuille(prev => ({
                        ...prev,
                        statut: 'valide'
                    }));
                }
                // Si erreur de journal
                else if (errorMessage.includes('journal') || errorMessage.includes('Journal')) {
                    toast({
                        title: "Configuration requise",
                        description: (
                            <div>
                                <p>{errorMessage}</p>
                                <p className="mt-2 text-sm">
                                    Compte de trésorerie : {result.debug?.compte_tresorerie_nom || 'Non spécifié'}
                                </p>
                            </div>
                        ),
                        variant: "destructive",
                        duration: 10000,
                    });
                }
                else {
                    toast({
                        title: "Erreur de validation",
                        description: errorMessage,
                        variant: "destructive",
                    });
                }

                return;
            }

            // Succès
            if (result.success) {
                setFeuille(prev => ({
                    ...prev,
                    ...result.data || result,
                    statut: result.data?.statut || 'valide'
                }));

                toast({
                    title: "Succès",
                    description: result.message || "Feuille validée avec succès",
                    variant: "default",
                });
                // Rafraîchir l'historique après validation
                await fetchHistorique();
            } else {
                throw new Error(result.message || "Erreur lors de la validation");
            }
        } catch (error) {
            console.error('Erreur lors de la validation:', error);
            const errorMessage = error instanceof Error ? error.message : "Impossible de valider";
            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive",
            });
        }
    };

    // Rejeter la feuille
    const handleRejeter = async () => {
        if (!feuille.id) return;

        if (!motifRejet.trim()) {
            toast({
                title: "Erreur",
                description: "Veuillez indiquer un motif de rejet",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetchJson(`${API_ENDPOINTS.FEUILLES_ENCAISSEMENT}/${feuille.id}/rejeter`, {
                method: 'POST',
                body: JSON.stringify({ motif: motifRejet })
            }, navigate);

            const responseText = await response.text();
            console.log('Réponse brute rejet:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Réponse invalide du serveur: ${responseText}`);
            }

            if (!response.ok) {
                const errorMessage = result.message || result.error || `Erreur ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            setFeuille(prev => ({
                ...prev,
                ...result.data || result,
                statut: result.data?.statut || 'rejete',
                motifRejet: result.data?.motifRejet || result.motifRejet || motifRejet,
                dateEncaissement: formatDateForInput(result.data?.dateEncaissement || result.dateEncaissement || prev.dateEncaissement)
            }));
            setShowRejetModal(false);
            setMotifRejet('');
            
            // Rafraîchir l'historique après rejet
            await fetchHistorique();
            
            toast({
                title: "Succès",
                description: "Feuille rejetée",
                variant: "default",
            });
        } catch (error) {
            console.error('Erreur lors du rejet:', error);
            const errorMessage = error instanceof Error ? error.message : "Impossible de rejeter";
            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive",
            });
        }
    };

    // Créer une nouvelle facture
    const handleCreateFacture = async () => {
        if (!newFacture.numero || newFacture.montantTotal <= 0 || !newFacture.tiersId) {
            toast({
                title: "Erreur de validation",
                description: "Veuillez remplir les champs obligatoires (Numéro, Montant, Tiers)",
                variant: "destructive",
            });
            return;
        }

        setIsCreatingFacture(true);
        try {
            const factureData = {
                numero: newFacture.numero,
                dateEmission: formatDateForSymfony(newFacture.dateEmission), // Formater pour Symfony
                dateEcheance: newFacture.dateEcheance ? formatDateForSymfony(newFacture.dateEcheance) : null,
                montantTotal: newFacture.montantTotal.toString(),
                solde: newFacture.montantTotal.toString(),
                statut: newFacture.statut,
                tiersId: newFacture.tiersId,
                description: newFacture.description,
                bonCommande: newFacture.bonCommande,
                bonLivraison: newFacture.bonLivraison,
                contrat: newFacture.contrat,
                tauxTva: newFacture.tauxTva?.toString(),
            };

            console.log("Données envoyées pour création de facture:", factureData);

            const response = await fetchJson(API_ENDPOINTS.FACTURES, {
                method: 'POST',
                body: JSON.stringify(factureData)
            }, navigate);

            const responseText = await response.text();
            console.log("Réponse brute:", responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Réponse invalide du serveur: ${responseText}`);
            }

            if (!response.ok) {
                const errorMessage = result.message || result.error || `Erreur ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            if (result.success) {
                const factureCreee = result.data;
                if (factureCreee) {
                    const nouvellesFactures = [...feuille.factures, factureCreee];
                    const totalFactures = nouvellesFactures.reduce((total, facture) => total + (facture.montantTotal || facture.montant || 0), 0);

                    setFeuille({
                        ...feuille,
                        factures: nouvellesFactures,
                        montantPaye: Math.min(totalFactures, feuille.montantPaye || 0)
                    });

                    toast({
                        title: "Succès",
                        description: "Facture créée et ajoutée à la feuille",
                        variant: "default",
                    });

                    setNewFacture({
                        numero: '',
                        dateEmission: formatDateForInput(new Date().toISOString()), // Utilisation du formateur
                        dateEcheance: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()), // Utilisation du formateur
                        montantTotal: 0,
                        solde: 0,
                        statut: 'emise',
                        tiersId: 0,
                        description: '',
                        bonCommande: '',
                        bonLivraison: '',
                        contrat: '',
                        tauxTva: 20,
                    });

                    setShowCreateFactureModal(false);
                    fetchFactures();
                }
            } else {
                throw new Error(result.message || "Erreur lors de la création");
            }
        } catch (error) {
            console.error('Erreur création facture:', error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible de créer la facture",
                variant: "destructive",
            });
        } finally {
            setIsCreatingFacture(false);
        }
    };

    // Exporter en PDF
    const handleExportPDF = () => {
        toast({
            title: "Export PDF",
            description: "Fonctionnalité en cours de développement",
            variant: "default",
        });
    };

    // Vérifier si l'utilisateur peut éditer une feuille validée
    const canEditValidatedFeuille = () => {
        return userRoles.includes('ROLE_ADMINISTRATEUR') || userRoles.includes('ROLE_SUPER_ADMIN');
    };

    // Vérifier si l'utilisateur peut valider
    const canValidateFeuille = () => {
        return userRoles.includes('ROLE_ADMINISTRATEUR') || userRoles.includes('ROLE_SUPER_ADMIN');
    };

    // Déterminer si le formulaire est valide
    const isFormValid = () => {
        return (
            feuille.dateEncaissement.trim() !== '' &&
            feuille.nomClient.trim() !== '' &&
            feuille.codeClient.trim() !== '' &&
            feuille.montantPaye > 0 &&
            feuille.compteTresorerie?.id > 0 &&
            feuille.compteClient?.id > 0
        );
    };

    // Valider les règles métier avant soumission
    const validateBusinessRules = (): { valid: boolean; message?: string } => {
        const totalFactures = calculateTotalFactures();
        const montantPaye = feuille.montantPaye || 0;
        const typePaiement = feuille.typePaiement;

        // Avance : pas de factures requises
        if (typePaiement === 'avance') {
            if (feuille.factures.length > 0) {
                return {
                    valid: false,
                    message: 'Une avance ne doit pas être liée à des factures'
                };
            }
            return { valid: true };
        }

        // Acompte : montant < total factures
        if (typePaiement === 'acompte') {
            if (feuille.factures.length === 0) {
                return {
                    valid: false,
                    message: 'Un acompte nécessite au moins une facture liée'
                };
            }
            if (montantPaye >= totalFactures) {
                return {
                    valid: false,
                    message: 'Pour un acompte, le montant doit être inférieur au total des factures'
                };
            }
            return { valid: true };
        }

        // Paiement facture : montant = total factures
        if (typePaiement === 'facture') {
            if (feuille.factures.length === 0) {
                return {
                    valid: false,
                    message: 'Un paiement de facture nécessite au moins une facture liée'
                };
            }
            if (Math.abs(montantPaye - totalFactures) > 0.01) {
                return {
                    valid: false,
                    message: `Pour un paiement de facture, le montant doit être égal au total des factures (${formatMontant(totalFactures)})`
                };
            }
            return { valid: true };
        }

        return { valid: true };
    };

    // Afficher l'information de la société et de la devise
    const renderSocieteInfo = () => {
        if (!societe) return null;

        return (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-blue-600" />
                        <div>
                            <div className="text-sm font-medium text-blue-800">
                                Société : <span className="font-bold">{societe.raisonSociale}</span>
                            </div>
                            <div className="text-sm text-blue-600">
                                Devise :
                                <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-300">
                                    {deviseSociete?.code} - {deviseSociete?.intitule}
                                    {deviseSociete?.deviseReference && " (Référence)"}
                                </Badge>
                                {deviseSociete?.symbole && ` (${deviseSociete.symbole})`}
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-blue-500">
                        Devise appliquée automatiquement
                    </div>
                </div>
            </div>
        );
    };

    // Afficher les informations de validation
    const renderValidationInfo = () => {
        if (feuille.statut !== 'valide' && feuille.statut !== 'pointe' && feuille.statut !== 'rejete') {
            return null;
        }

        return (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">
                            {feuille.statut === 'valide' && 'Validée le'}
                            {feuille.statut === 'pointe' && 'Pointée le'}
                            {feuille.statut === 'rejete' && 'Rejetée le'}
                            {feuille.validatedAt && (
                                <span className="font-bold ml-2">{formatDateTime(feuille.validatedAt)}</span>
                            )}
                        </div>
                        {feuille.motifRejet && (
                            <div className="mt-2 text-sm text-red-600">
                                <span className="font-medium">Motif du rejet :</span> {feuille.motifRejet}
                            </div>
                        )}
                        {feuille.operationTresorerie && (
                            <div className="mt-2 space-y-1">
                                <div className="text-sm text-green-600">
                                    <strong>✓</strong> Opération de trésorerie créée
                                </div>
                                {feuille.operationTresorerie.journal && (
                                    <div className="text-xs text-gray-500">
                                        Journal : {feuille.operationTresorerie.journal.intitule || feuille.operationTresorerie.journal.code}
                                    </div>
                                )}
                            </div>
                        )}
                        {feuille.factures.length > 0 && feuille.statut === 'valide' && (
                            <div className="mt-2 text-xs text-gray-500">
                                <strong>Allocation :</strong> Montant réparti sur {feuille.factures.length} facture(s)
                            </div>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={refreshFeuille}
                        disabled={refreshing}
                        className="gap-2"
                    >
                        {refreshing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Rafraîchir
                    </Button>
                </div>
            </div>
        );
    };

    // Mettre à jour la feuille lorsque la devise société change
    useEffect(() => {
        if (deviseSociete) {
            setFeuille(prev => ({
                ...prev,
                devise: deviseSociete
            }));
        }
    }, [deviseSociete]);

    // Mettre à jour la liste des comptes lorsque la devise société change
    useEffect(() => {
        if (deviseSociete) {
            fetchComptesTresorerie();
        }
    }, [deviseSociete]);

    // Rendu du contenu de l'historique
    const renderHistoriqueContent = () => {
        const isGlobalView = true;
        
        if (isLoadingHistorique) {
            return (
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" />
                    <p className="text-gray-500">Chargement de l'historique...</p>
                </div>
            );
        }
        
        if (historique.length === 0) {
            return (
                <div className="text-center py-8">
                    <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-700">Aucun historique disponible</h3>
                    <p className="text-gray-500 mt-2">Aucune action n'a encore été enregistrée.</p>
                    <Button 
                        onClick={() => fetchHistorique()} 
                        variant="outline" 
                        className="mt-4"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Rafraîchir
                    </Button>
                </div>
            );
        }
        
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-500">
                        {historique.length} action(s) enregistrée(s)
                        <span className="ml-2 text-blue-500">(Vue globale)</span>
                    </div>
                    <Button 
                        onClick={() => fetchHistorique()} 
                        variant="outline" 
                        size="sm"
                        disabled={isLoadingHistorique}
                    >
                        {isLoadingHistorique ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Rafraîchir
                    </Button>
                </div>
                
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Feuille</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Utilisateur</TableHead>
                            <TableHead>Détails</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {historique
                            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                            .map((h, index) => (
                            <TableRow key={h.id || index}>
                                <TableCell>
                                    {h.createdAt ? formatDateTime(h.createdAt) : 'Non daté'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">#{h.feuille_id || h.feuille?.id || '?'}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        h.action?.includes('Valid') || h.action?.includes('VALIDER') ? 'default' :
                                        h.action?.includes('Rejet') || h.action?.includes('REJETER') ? 'destructive' :
                                        h.action?.includes('Création') || h.action?.includes('CREER') ? 'secondary' :
                                        'outline'
                                    }>
                                        {h.action || 'Action non spécifiée'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {h.utilisateur?.nom || h.utilisateur?.id || 'Système'}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                    <div className="text-xs">
                                        {(() => {
                                            try {
                                                if (!h.details) return '-';
                                                const details = JSON.parse(h.details);
                                                return Object.entries(details)
                                                    .map(([key, value]) => `${key}: ${value}`)
                                                    .join(', ');
                                            } catch {
                                                return h.details || '-';
                                            }
                                        })()}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    // Rendu du contenu principal
    return (
        <MainLayout>
            <div className="space-y-6 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Feuille d'Encaissement</h1>
                        <div className="text-muted-foreground">Création et gestion des feuilles d'encaissement</div>
                    </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => fetchHistorique(true)}>
                                        Debug Hist
                                    </Button>
                        <Badge className={STATUTS[feuille.statut].color}>
                            {refreshing ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            {STATUTS[feuille.statut].label}
                        </Badge>
                        <Button onClick={handleExportPDF} variant="outline" className="gap-2">
                            <Printer className="w-4 h-4" />
                            Imprimer
                        </Button>
                        {(feuille.statut === 'brouillon' || (feuille.statut === 'valide' && canEditValidatedFeuille())) && (
                            <Button onClick={handleSave} disabled={loading || !isFormValid()} className="gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                            </Button>
                        )}
                    </div>
                </div>

                {useDemoData && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                            <div>
                                Mode démonstration activé. Les données affichées sont des données de test.
                                <Button
                                    variant="link"
                                    className="ml-2 p-0 h-auto text-yellow-800 underline"
                                    onClick={() => window.location.href = '/login'}
                                >
                                    Se connecter
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <div>
                                {error}
                                <Button
                                    variant="link"
                                    className="ml-2 p-0 h-auto text-white underline"
                                    onClick={() => window.location.href = '/login'}
                                >
                                    Se connecter
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Information sur la société et devise */}
                {renderSocieteInfo()}

                {/* Alerte permissions si feuille validée et utilisateur non autorisé */}
                {feuille.statut === 'valide' && !canEditValidatedFeuille() && (
                    <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                            <strong>Lecture seule :</strong> Cette feuille est validée. Seuls les administrateurs peuvent la modifier.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Information sur la validation */}
                {renderValidationInfo()}

                {/* Alerte si règles métier non respectées */}
                {(() => {
                    const validation = validateBusinessRules();
                    if (!validation.valid && feuille.statut === 'brouillon') {
                        return (
                            <Alert className="bg-amber-50 border-amber-200">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-amber-800">
                                    <strong>Règle métier non respectée :</strong> {validation.message}
                                </AlertDescription>
                            </Alert>
                        );
                    }
                    return null;
                })()}

                {/* Avertissement si la devise société n'est pas chargée */}
                {!deviseSociete && !isLoadingSociete && (
                    <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription>
                            La devise de votre société n'a pas pu être chargée. Utilisation de la devise par défaut (XOF).
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue="saisie" className="w-full" onValueChange={(val: any) => {
                    if (val === 'historique') {
                        // Charger l'historique : spécifique à la feuille si ID disponible, sinon global
                        fetchHistorique();
                    }
                }}>
                    <TabsList>
                        <TabsTrigger value="saisie">Saisie</TabsTrigger>
                        <TabsTrigger value="historique">Historique</TabsTrigger>
                    </TabsList>

                    <TabsContent value="saisie" className="space-y-6">
                        <div className="grid grid-cols-3 gap-6">
                            {/* Colonne gauche - Informations générales */}
                            <div className="col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Informations générales</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>N° Feuille</Label>
                                                <Input
                                                    value={feuille.numeroFeuille}
                                                    placeholder="Auto-généré après sauvegarde"
                                                    readOnly
                                                    className="bg-muted"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Date d'encaissement *</Label>
                                                <Input
                                                    type="date"
                                                    value={formatDateForInput(feuille.dateEncaissement)} // Utilisation du formateur
                                                    onChange={(e) => setFeuille({...feuille, dateEncaissement: e.target.value})}
                                                    required
                                                    disabled={feuille.statut !== 'brouillon'}
                                                />
                                                <div className="text-xs text-muted-foreground">
                                                    Format: JJ/MM/AAAA
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tiers *</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={feuille.tiers ? `${feuille.tiers.code} - ${feuille.tiers.intitule}` : ''}
                                                    placeholder="Sélectionnez un tiers"
                                                    readOnly
                                                    className="flex-1"
                                                    disabled={feuille.statut !== 'brouillon'}
                                                />
                                                {feuille.statut === 'brouillon' && (
                                                    <Dialog open={showTiersModal} onOpenChange={setShowTiersModal}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                <Search className="w-4 h-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Sélectionner un tiers</DialogTitle>
                                                                <DialogDescription>
                                                                    Sélectionnez un tiers dans la liste ci-dessous
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        placeholder="Rechercher un tiers..."
                                                                        value={searchQuery}
                                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                                    />
                                                                    <Select value={selectedTiersType} onValueChange={setSelectedTiersType}>
                                                                        <SelectTrigger className="w-32">
                                                                            <SelectValue placeholder="Type" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="CLIENT">Client</SelectItem>
                                                                            <SelectItem value="FOURNISSEUR">Fournisseur</SelectItem>
                                                                            <SelectItem value="AUTRE">Autre</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button onClick={() => setSearchQuery('')}>
                                                                        <Search className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="max-h-60 overflow-y-auto">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Code</TableHead>
                                                                                <TableHead>Intitulé</TableHead>
                                                                                <TableHead>Type</TableHead>
                                                                                <TableHead>Actions</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {isLoadingTiers ? (
                                                                                <TableRow>
                                                                                    <TableCell colSpan={4} className="text-center">
                                                                                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ) : tiersList.length === 0 ? (
                                                                                <TableRow>
                                                                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                                                        Aucun tiers trouvé
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ) : (
                                                                                tiersList.map((tiers) => (
                                                                                    <TableRow key={tiers.id}>
                                                                                        <TableCell>{tiers.code}</TableCell>
                                                                                        <TableCell>{tiers.intitule}</TableCell>
                                                                                        <TableCell>{tiers.typeTiers}</TableCell>
                                                                                        <TableCell>
                                                                                            <Button
                                                                                                size="sm"
                                                                                                onClick={() => handleTiersSelect(tiers)}
                                                                                            >
                                                                                                Sélectionner
                                                                                            </Button>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))
                                                                            )}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Code client *</Label>
                                                <Input
                                                    value={feuille.codeClient}
                                                    onChange={(e) => setFeuille({...feuille, codeClient: e.target.value})}
                                                    placeholder="Code client"
                                                    required
                                                    disabled={feuille.statut !== 'brouillon'}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Nom client *</Label>
                                                <Input
                                                    value={feuille.nomClient}
                                                    onChange={(e) => setFeuille({...feuille, nomClient: e.target.value})}
                                                    placeholder="Nom du client"
                                                    required
                                                    disabled={feuille.statut !== 'brouillon'}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Type de client *</Label>
                                                <Select
                                                    value={feuille.typeClient}
                                                    onValueChange={(value) => setFeuille({...feuille, typeClient: value as any})}
                                                    disabled={feuille.statut !== 'brouillon'}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(TYPES_CLIENT).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>
                                                                {label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Compte client *</Label>
                                                <Select
                                                    value={feuille.compteClient?.id?.toString() || undefined}
                                                    onValueChange={(value) => {
                                                        const compte = planComptable.find(pc => pc.id === parseInt(value));
                                                        if (compte) setFeuille({...feuille, compteClient: compte});
                                                    }}
                                                    disabled={isLoadingPlanComptable || feuille.statut !== 'brouillon'}
                                                >
                                                    <SelectTrigger>
                                                        {isLoadingPlanComptable ? (
                                                            <div className="flex items-center gap-2">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Chargement...
                                                            </div>
                                                        ) : (
                                                            <SelectValue placeholder="Sélectionner un compte" />
                                                        )}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {planComptable
                                                            .filter(pc => pc.typeCompte === 'client' || pc.typeCompte === 'tiers')
                                                            .map((compte) => (
                                                                <SelectItem key={compte.id} value={compte.id.toString()}>
                                                                    {compte.codeCompte} - {compte.intitule}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Moyen de paiement</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Mode de paiement *</Label>
                                            <Select
                                                value={feuille.modePaiement}
                                                onValueChange={handleModePaiementChange}
                                                disabled={feuille.statut !== 'brouillon'}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(MODES_PAIEMENT).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Type de paiement *</Label>
                                            <Select
                                                value={feuille.typePaiement}
                                                onValueChange={handleTypePaiementChange}
                                                disabled={feuille.statut !== 'brouillon'}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(TYPES_PAIEMENT).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Référence selon le mode de paiement */}
                                        {feuille.modePaiement === 'cheque' && (
                                            <div className="space-y-2">
                                                <Label>Référence chèque</Label>
                                                <Input
                                                    value={feuille.referenceCheque || ''}
                                                    onChange={(e) => setFeuille({...feuille, referenceCheque: e.target.value})}
                                                    placeholder="N° chèque"
                                                    disabled={feuille.statut !== 'brouillon'}
                                                />
                                            </div>
                                        )}

                                        {feuille.modePaiement === 'virement' && (
                                            <div className="space-y-2">
                                                <Label>Référence virement</Label>
                                                <Input
                                                    value={feuille.referenceVirement || ''}
                                                    onChange={(e) => setFeuille({...feuille, referenceVirement: e.target.value})}
                                                    placeholder="Référence virement"
                                                    disabled={feuille.statut !== 'brouillon'}
                                                />
                                            </div>
                                        )}

                                        {feuille.modePaiement === 'autre' && (
                                            <div className="space-y-2">
                                                <Label>Référence</Label>
                                                <Input
                                                    value={feuille.referenceAutre || ''}
                                                    onChange={(e) => setFeuille({...feuille, referenceAutre: e.target.value})}
                                                    placeholder="Autre référence"
                                                    disabled={feuille.statut !== 'brouillon'}
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Montant payé *</Label>
                                                <Input
                                                    type="number"
                                                    value={feuille.montantPaye || ''}
                                                    onChange={(e) => setFeuille({...feuille, montantPaye: parseFloat(e.target.value) || 0})}
                                                    placeholder="0"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    disabled={feuille.statut !== 'brouillon'}
                                                />
                                                <div className="text-xs text-muted-foreground">
                                                    Maximum: {formatMontant(calculateTotalFactures())}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Devise *</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={deviseSociete ? `${deviseSociete.code} - ${deviseSociete.intitule}` : 'Chargement...'}
                                                        placeholder="Devise de la société"
                                                        readOnly
                                                        className="flex-1 bg-muted"
                                                    />
                                                    {isLoadingSociete ? (
                                                        <div className="flex items-center px-3 border border-input rounded-md bg-muted">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="px-3 py-2">
                                                            {societe ? "Société" : "Défaut"}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    La devise est automatiquement définie selon votre société
                                                </div>
                                                {deviseSociete && devisesDisponibles.length > 0 && devisesDisponibles.some(d => d.id !== deviseSociete.id) && (
                                                    <div className="text-xs text-amber-600">
                                                        ⚠ Votre société utilise {deviseSociete.code}. {devisesDisponibles.length - 1} autre(s) devise(s) disponible(s).
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Factures associées</CardTitle>
                                        {feuille.statut === 'brouillon' && (
                                            <Dialog open={showFacturesModal} onOpenChange={setShowFacturesModal}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" className="gap-2">
                                                        <Plus className="w-4 h-4" />
                                                        Ajouter une facture
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex justify-between items-center">
                                                            <span>Sélectionner une facture</span>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => setShowCreateFactureModal(true)}
                                                                className="gap-2"
                                                                variant="outline"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                Nouvelle facture
                                                            </Button>
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            Sélectionnez une facture impayée ou créez-en une nouvelle
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div className="max-h-80 overflow-y-auto">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>N° Facture</TableHead>
                                                                        <TableHead>Date</TableHead>
                                                                        <TableHead>Client</TableHead>
                                                                        <TableHead>Montant</TableHead>
                                                                        <TableHead>Solde</TableHead>
                                                                        <TableHead>Actions</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {isLoadingFactures ? (
                                                                        <TableRow>
                                                                            <TableCell colSpan={6} className="text-center">
                                                                                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ) : facturesDisponibles.length === 0 ? (
                                                                        <TableRow>
                                                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                                                Aucune facture/ordre de paiement impayé disponible
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ) : (
                                                                        facturesDisponibles.map((facture) => (
                                                                            <TableRow key={facture.id}>
                                                                                <TableCell>{facture.numero}</TableCell>
                                                                                <TableCell>{formatDate(facture.dateEmission)}</TableCell>
                                                                                <TableCell>{facture.tiersNom || facture.tiers?.intitule || '-'}</TableCell>
                                                                                <TableCell>{facture.montantTotalFormate || formatMontant(facture.montantTotal || facture.montant || 0)}</TableCell>
                                                                                <TableCell>{facture.soldeFormate || formatMontant(facture.solde)}</TableCell>
                                                                                <TableCell>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        onClick={() => {
                                                                                            setSelectedFacture(facture);
                                                                                            handleAddFacture();
                                                                                        }}
                                                                                        variant="outline"
                                                                                    >
                                                                                        Sélectionner
                                                                                    </Button>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>N° Facture</TableHead>
                                                    <TableHead>Date émission</TableHead>
                                                    <TableHead>Montant</TableHead>
                                                    {feuille.statut === 'brouillon' && <TableHead>Actions</TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {feuille.factures.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={feuille.statut === 'brouillon' ? 4 : 3} className="text-center text-muted-foreground">
                                                            Aucune facture associée
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    feuille.factures.map((facture) => (
                                                        <TableRow key={facture.id}>
                                                            <TableCell>{facture.numero}</TableCell>
                                                            <TableCell>{formatDate(facture.dateEmission)}</TableCell>
                                                            <TableCell>{formatMontant(facture.montantTotal || facture.montant || 0)}</TableCell>
                                                            {feuille.statut === 'brouillon' && (
                                                                <TableCell>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleRemoveFacture(facture.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                                    </Button>
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Colonne droite - Informations complémentaires et actions */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Compte de trésorerie *</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Compte</Label>
                                            <Select
                                                value={feuille.compteTresorerie?.id?.toString() || undefined}
                                                onValueChange={(value) => {
                                                    const compte = comptesTresorerie.find(ct => ct.id === parseInt(value));
                                                    if (compte) setFeuille({...feuille, compteTresorerie: compte});
                                                }}
                                                disabled={isLoadingComptes || feuille.statut !== 'brouillon'}
                                            >
                                                <SelectTrigger>
                                                    {isLoadingComptes ? (
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Chargement...
                                                        </div>
                                                    ) : (
                                                        <SelectValue placeholder="Sélectionner un compte" />
                                                    )}
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {comptesTresorerie.map((compte) => (
                                                        <SelectItem key={compte.id} value={compte.id.toString()}>
                                                            {compte.numeroCompte} - {compte.intitule}
                                                            {compte.banque?.nom ? ` (${compte.banque.nom})` : ''}
                                                            {compte.devise && deviseSociete && compte.devise.code !== deviseSociete.code && (
                                                                <span className="text-amber-600"> - Devise: {compte.devise.code}</span>
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {feuille.compteTresorerie?.id > 0 && (
                                            <div className="text-sm text-muted-foreground">
                                                <div>Solde actuel: <span className="font-semibold">{formatMontant(feuille.compteTresorerie.soldeActuel)}</span></div>
                                                {feuille.compteTresorerie.devise && deviseSociete && feuille.compteTresorerie.devise.code !== deviseSociete.code && (
                                                    <div className="text-amber-600">
                                                        ⚠ Attention: Ce compte est en {feuille.compteTresorerie.devise.code},
                                                        alors que votre société utilise {deviseSociete.code}
                                                    </div>
                                                )}
                                                <div>Banque: <span className="font-semibold">{feuille.compteTresorerie.banque?.nom || 'Non spécifiée'}</span></div>
                                            </div>
                                        )}

                                        <Separator />

                                        <div className="space-y-2">
                                            <Label>N° d'ordre</Label>
                                            <Input
                                                value={feuille.numeroOrdre || ''}
                                                onChange={(e) => setFeuille({...feuille, numeroOrdre: e.target.value})}
                                                placeholder="Numéro d'ordre"
                                                disabled={feuille.statut !== 'brouillon'}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Référence bon de commande</Label>
                                            <Input
                                                value={feuille.referenceBonCommande || ''}
                                                onChange={(e) => setFeuille({...feuille, referenceBonCommande: e.target.value})}
                                                placeholder="Référence BC"
                                                disabled={feuille.statut !== 'brouillon'}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Description</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Textarea
                                            value={feuille.descriptionOperation || ''}
                                            onChange={(e) => setFeuille({...feuille, descriptionOperation: e.target.value})}
                                            placeholder="Description de l'opération..."
                                            rows={4}
                                            disabled={feuille.statut !== 'brouillon'}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Résumé</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-muted-foreground">Total factures:</span>
                                                <span className="font-medium">{formatMontant(calculateTotalFactures())}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-muted-foreground">Montant payé:</span>
                                                <span className="font-medium">{formatMontant(feuille.montantPaye || 0)}</span>
                                            </div>
                                            <div className="flex justify-between border-t pt-2">
                                                <span className="text-sm font-medium">Solde:</span>
                                                <span className={`font-bold ${calculateSolde() === 0 ? 'text-green-600' : calculateSolde() > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                                    {formatMontant(calculateSolde())}
                                                </span>
                                            </div>
                                        </div>

                                        {calculateSolde() === 0 && (
                                            <div className="text-sm text-green-600 font-medium text-center">
                                                ✓ Paiement intégral
                                            </div>
                                        )}
                                        {calculateSolde() > 0 && (
                                            <div className="text-sm text-orange-600 font-medium text-center">
                                                ⚠ Acompte partiel
                                            </div>
                                        )}
                                        {calculateSolde() < 0 && (
                                            <div className="text-sm text-red-600 font-medium text-center">
                                                ✗ Paiement en excès
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Actions selon le statut */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Actions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {feuille.statut === 'brouillon' && (
                                            <>
                                                <Button
                                                    className="w-full gap-2"
                                                    onClick={handleSave}
                                                    disabled={loading || !isFormValid()}
                                                >
                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                                                </Button>
                                                <Button
                                                    className="w-full gap-2"
                                                    variant="outline"
                                                    onClick={handleSoumettre}
                                                    disabled={!feuille.id}
                                                >
                                                    <Send className="w-4 h-4" />
                                                    Soumettre pour validation
                                                </Button>
                                            </>
                                        )}

                                        {feuille.statut === 'attente_validation' && (
                                            <>
                                                <Button className="w-full gap-2" onClick={handleValider}>
                                                    <CheckCircle className="w-4 h-4" />
                                                    Valider
                                                </Button>
                                                <Button
                                                    className="w-full gap-2"
                                                    variant="destructive"
                                                    onClick={() => setShowRejetModal(true)}
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Rejeter
                                                </Button>
                                            </>
                                        )}

                                        {feuille.statut === 'valide' && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-md">
                                                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                                    <span className="text-green-800 font-medium">Feuille validée</span>
                                                </div>
                                                <Button
                                                    className="w-full gap-2"
                                                    variant="outline"
                                                    onClick={() => {
                                                        // Optionnel: Voir l'opération de trésorerie
                                                        if (feuille.operationTresorerie) {
                                                            toast({
                                                                title: "Opération de trésorerie",
                                                                description: "Une opération de trésorerie a été créée automatiquement",
                                                                variant: "default",
                                                            });
                                                        } else {
                                                            toast({
                                                                title: "Information",
                                                                description: "Cette feuille est validée",
                                                                variant: "default",
                                                            });
                                                        }
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    {feuille.operationTresorerie ? 'Voir l\'opération' : 'Informations'}
                                                </Button>
                                            </div>
                                        )}

                                        {feuille.statut === 'pointe' && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                                                    <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                                                    <span className="text-blue-800 font-medium">Feuille pointée</span>
                                                </div>
                                                <Button
                                                    className="w-full gap-2"
                                                    variant="outline"
                                                    disabled
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Opération pointée (lecture seule)
                                                </Button>
                                            </div>
                                        )}

                                        {feuille.statut === 'rejete' && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-center p-3 bg-red-50 border border-red-200 rounded-md">
                                                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                                                    <span className="text-red-800 font-medium">Feuille rejetée</span>
                                                </div>
                                                {feuille.motifRejet && (
                                                    <div className="text-sm text-red-600 p-2 bg-red-50 border border-red-100 rounded">
                                                        <span className="font-medium">Motif :</span> {feuille.motifRejet}
                                                    </div>
                                                )}
                                                <Button
                                                    className="w-full gap-2"
                                                    variant="outline"
                                                    onClick={() => {
                                                        // Option: Corriger et resoumettre
                                                        toast({
                                                            title: "Information",
                                                            description: "Pour corriger cette feuille, créez-en une nouvelle",
                                                            variant: "default",
                                                        });
                                                    }}
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Créer une nouvelle feuille
                                                </Button>
                                            </div>
                                        )}

                                        {feuille.id && feuille.statut === 'brouillon' && (
                                            <Button className="w-full gap-2" variant="outline">
                                                <Trash2 className="w-4 h-4" />
                                                Annuler la feuille
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="historique">
                        <Card>
                            <CardHeader>
                                <CardTitle>Historique des actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(!feuille.id && historique.length === 0) ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        L'historique sera disponible après la sauvegarde de la feuille.
                                    </div>
                                ) : (
                                    // Afficher l'historique existant (per-feuille ou global si disponible)
                                    renderHistoriqueContent()
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Onglet statistiques retiré */}
                </Tabs>

                {/* Modal pour créer une nouvelle facture */}
                <Dialog open={showCreateFactureModal} onOpenChange={setShowCreateFactureModal}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Créer une nouvelle facture
                            </DialogTitle>
                            <DialogDescription>
                                Remplissez les informations de la nouvelle facture
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="facture-numero">Numéro de facture *</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="facture-numero"
                                            value={newFacture.numero}
                                            onChange={(e) => setNewFacture(prev => ({ ...prev, numero: e.target.value }))}
                                            placeholder="Ex: FACT-2024-001"
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleGenererNumeroFacture}
                                            disabled={isCreatingFacture}
                                            title="Générer un numéro automatiquement"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facture-dateEmission">Date d'émission *</Label>
                                    <Input
                                        id="facture-dateEmission"
                                        type="date"
                                        value={formatDateForInput(newFacture.dateEmission)} // Utilisation du formateur
                                        onChange={(e) => setNewFacture(prev => ({ ...prev, dateEmission: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facture-dateEcheance">Date d'échéance (optionnel)</Label>
                                    <Input
                                        id="facture-dateEcheance"
                                        type="date"
                                        value={formatDateForInput(newFacture.dateEcheance)} // Utilisation du formateur
                                        onChange={(e) => setNewFacture(prev => ({ ...prev, dateEcheance: e.target.value || undefined }))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facture-montantTotal">Montant total (€) *</Label>
                                    <Input
                                        id="facture-montantTotal"
                                        type="number"
                                        step="0.01"
                                        value={newFacture.montantTotal || ''}
                                        onChange={(e) => setNewFacture(prev => ({
                                            ...prev,
                                            montantTotal: parseFloat(e.target.value) || 0,
                                            solde: parseFloat(e.target.value) || 0
                                        }))}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="facture-tiersId">Tiers *</Label>
                                    <Select
                                        value={newFacture.tiersId?.toString() || undefined}
                                        onValueChange={(value) => setNewFacture(prev => ({ ...prev, tiersId: parseInt(value) }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un tiers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tiersList.map((tier) => (
                                                <SelectItem key={tier.id} value={tier.id.toString()}>
                                                    {tier.code} - {tier.intitule}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facture-statut">Statut</Label>
                                    <Select
                                        value={newFacture.statut}
                                        onValueChange={(value) => setNewFacture(prev => ({ ...prev, statut: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Statut" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="brouillon">Brouillon</SelectItem>
                                            <SelectItem value="emise">Émise</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facture-tauxTva">Taux TVA (%)</Label>
                                    <Input
                                        id="facture-tauxTva"
                                        type="number"
                                        step="0.01"
                                        value={newFacture.tauxTva || ''}
                                        onChange={(e) => setNewFacture(prev => ({ ...prev, tauxTva: parseFloat(e.target.value) }))}
                                        placeholder="20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facture-bonCommande">Bon de commande</Label>
                                    <Input
                                        id="facture-bonCommande"
                                        value={newFacture.bonCommande}
                                        onChange={(e) => setNewFacture(prev => ({ ...prev, bonCommande: e.target.value }))}
                                        placeholder="N° BC"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facture-bonLivraison">Bon de livraison</Label>
                                    <Input
                                        id="facture-bonLivraison"
                                        value={newFacture.bonLivraison}
                                        onChange={(e) => setNewFacture(prev => ({ ...prev, bonLivraison: e.target.value }))}
                                        placeholder="N° BL"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="facture-contrat">Contrat</Label>
                                    <Input
                                        id="facture-contrat"
                                        value={newFacture.contrat}
                                        onChange={(e) => setNewFacture(prev => ({ ...prev, contrat: e.target.value }))}
                                        placeholder="Référence contrat"
                                    />
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="facture-description">Description</Label>
                                    <Textarea
                                        id="facture-description"
                                        value={newFacture.description}
                                        onChange={(e) => setNewFacture(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Description de la facture"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCreateFactureModal(false);
                                    setNewFacture({
                                        numero: '',
                                        dateEmission: formatDateForInput(new Date().toISOString()), // Utilisation du formateur
                                        dateEcheance: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()), // Utilisation du formateur
                                        montantTotal: 0,
                                        solde: 0,
                                        statut: 'emise',
                                        tiersId: 0,
                                        description: '',
                                        bonCommande: '',
                                        bonLivraison: '',
                                        contrat: '',
                                        tauxTva: 20,
                                    });
                                }}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleCreateFacture}
                                disabled={isCreatingFacture || !newFacture.numero || newFacture.montantTotal <= 0 || !newFacture.tiersId}
                                className="gap-2"
                            >
                                {isCreatingFacture ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Création...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Créer la facture
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modal pour le rejet */}
                <AlertDialog open={showRejetModal} onOpenChange={setShowRejetModal}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Rejeter la feuille d'encaissement</AlertDialogTitle>
                            <AlertDialogDescription>
                                Veuillez indiquer le motif du rejet :
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea
                            value={motifRejet}
                            onChange={(e) => setMotifRejet(e.target.value)}
                            placeholder="Motif du rejet..."
                            rows={3}
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRejeter} disabled={!motifRejet.trim()}>
                                Confirmer le rejet
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </MainLayout>
    );
};

export default FeuilleEncaissementPage;