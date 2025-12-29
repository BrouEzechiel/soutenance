import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Allow access to Vite env in this file
declare global {
    interface ImportMetaEnv {
        VITE_API_BASE_URL?: string;
    }
    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

// Types alignés avec l'entité CompteTresorerie
interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    typeCompte: string;
    statut?: string;
    codeFormate?: string;
}

interface Banque {
    id: number;
    nom: string;
    codeBanque?: string;
    adresse?: string;
    telephone?: string;
    statut?: string;
}

interface JournalTresorerie {
    id: number;
    code: string;
    intitule: string;
    type?: string;
    statut?: string;
}

interface Utilisateur {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    statut?: string;
}

interface CompteTresorerie {
    id?: number;
    intitule: string;
    typeCompte: 'courant' | 'epargne' | 'transit' | 'provision' | 'autre';
    numeroCompte: string;
    bic?: string;
    banqueId?: number;
    planComptableId: number;
    journalTresorerieId: number;
    gestionnaireId: number;
    superieurHierarchiqueId?: number;
    soldeOuverture: string;
    soldeActuel: string;
    estPrincipal: boolean;
    statut: 'ACTIF' | 'INACTIF' | 'CLOTURE';
    description?: string;
    contactGestionnaire?: string;
    fonctionGestionnaire?: string;
}

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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

const API_BASE = (import.meta.env as any).VITE_API_BASE_URL ?? API_BASE_URL;
const api = (path: string) => `${API_BASE}/${path.replace(/^\//, '')}`;

async function safeJson(res: Response) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
}

async function fetchJson(url: string, options: RequestInit = {}, navigate?: any) {
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) } as HeadersInit;
    const resp = await fetch(url, { ...options, headers });
    const data = await safeJson(resp);
    if (resp.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.setItem('isAuthenticated', 'false');
        if (navigate) navigate('/login');
        const err: any = new Error('Unauthorized');
        err.status = 401;
        err.data = data;
        throw err;
    }
    if (!resp.ok) {
        const err: any = new Error('Request error');
        err.status = resp.status;
        err.data = data;
        throw err;
    }
    return data;
}

// Données de démonstration
const DEMO_PLAN_COMPTABLES: PlanComptable[] = [
    { id: 1, codeCompte: "512", intitule: "Banques", typeCompte: "BANQUE", statut: "ACTIF", codeFormate: "512" },
    { id: 2, codeCompte: "53", intitule: "Caisse", typeCompte: "CAISSE", statut: "ACTIF", codeFormate: "53" },
    { id: 3, codeCompte: "58", intitule: "Virements internes", typeCompte: "COMPTE_COURANT", statut: "ACTIF", codeFormate: "58" },
];

const DEMO_BANQUES: Banque[] = [
    { id: 1, nom: "BANQUE POPULAIRE", codeBanque: "BP", adresse: "Casablanca", telephone: "0522-123456", statut: "ACTIF" },
    { id: 2, nom: "ATTIJARIWAFA BANK", codeBanque: "AWB", adresse: "Casablanca", telephone: "0522-654321", statut: "ACTIF" },
    { id: 3, nom: "BANK OF AFRICA", codeBanque: "BOA", adresse: "Rabat", telephone: "0537-789012", statut: "ACTIF" },
];

const DEMO_JOURNAUX_TRESORERIE: JournalTresorerie[] = [
    { id: 1, code: "BQ", intitule: "Journal de banque", type: "BANQUE", statut: "ACTIF" },
    { id: 2, code: "CA", intitule: "Journal de caisse", type: "CAISSE", statut: "ACTIF" },
    { id: 3, code: "OD", intitule: "Journal des opérations diverses", type: "DIVERS", statut: "ACTIF" },
];

const DEMO_UTILISATEURS: Utilisateur[] = [
    { id: 1, username: "admin", firstName: "Admin", lastName: "Système", fullName: "Administrateur Système", email: "admin@example.com", statut: "ACTIF" },
    { id: 2, username: "finance", firstName: "Mohamed", lastName: "Finance", fullName: "Mohamed Finance", email: "finance@example.com", statut: "ACTIF" },
    { id: 3, username: "comptable", firstName: "Fatima", lastName: "Comptable", fullName: "Fatima Comptable", email: "comptable@example.com", statut: "ACTIF" },
];

const TYPES_COMPTE = {
    courant: 'Compte courant',
    epargne: 'Compte épargne',
    transit: 'Compte de transit',
    provision: 'Compte de provision',
    autre: 'Autre compte'
};

const ComptesTresorerie = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [compte, setCompte] = useState<CompteTresorerie>({
        intitule: '',
        typeCompte: 'courant',
        numeroCompte: '',
        bic: '',
        banqueId: undefined,
        planComptableId: 0,
        journalTresorerieId: 0,
        gestionnaireId: 0,
        superieurHierarchiqueId: undefined,
        soldeOuverture: '0.00',
        soldeActuel: '0.00',
        estPrincipal: false,
        statut: 'ACTIF',
        description: '',
        contactGestionnaire: '',
        fonctionGestionnaire: ''
    });

    const [planComptables, setPlanComptables] = useState<PlanComptable[]>([]);
    const [banques, setBanques] = useState<Banque[]>([]);
    const [journauxTresorerie, setJournauxTresorerie] = useState<JournalTresorerie[]>([]);
    const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
    const [defaultDeviseId, setDefaultDeviseId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [useDemoData, setUseDemoData] = useState<boolean>(false);
    const [debugInfo, setDebugInfo] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        // Local holders for fetched data to compute defaults synchronously
        let fetchedPlanComptables: PlanComptable[] = [];
        let fetchedBanques: Banque[] = [];
        let fetchedJournaux: JournalTresorerie[] = [];
        let fetchedUtilisateurs: Utilisateur[] = [];

        try {
            setLoading(true);
            setError(null);
            setDebugInfo('Début du chargement des données...');

            // Vérifier le token d'abord
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Vous n\'êtes pas connecté. Veuillez vous reconnecter.');
                setUseDemoData(true);
                setPlanComptables(DEMO_PLAN_COMPTABLES);
                setBanques(DEMO_BANQUES);
                setJournauxTresorerie(DEMO_JOURNAUX_TRESORERIE);
                setUtilisateurs(DEMO_UTILISATEURS);

                toast({
                    title: "Non connecté",
                    description: "Veuillez vous reconnecter pour accéder aux données réelles",
                    variant: "destructive"
                });
                return;
            }

            setDebugInfo(`Token trouvé: ${token.substring(0, 20)}...`);

            // 1. Charger les plans comptables ACTIFS
            try {
                const planComptableData = await fetchJson(api('/plan-comptables/actifs'), {}, navigate);
                const dataArray = planComptableData?.data || planComptableData || [];
                fetchedPlanComptables = dataArray as PlanComptable[];
                setPlanComptables(fetchedPlanComptables);
                setDebugInfo('Plan comptables chargés');
            } catch (err) {
                try {
                    const planComptableData2 = await fetchJson(api('/plan-comptables'), {}, navigate);
                    const dataArray = planComptableData2?.data || planComptableData2 || [];
                    const filteredData = dataArray.filter((p: any) => !p.statut || p.statut === 'ACTIF');
                    setPlanComptables(filteredData as PlanComptable[]);
                } catch (e) {
                    console.error('Erreur chargement plan comptable:', e);
                    setDebugInfo('Échec chargement plan comptables, utilisation démo');
                    setPlanComptables(DEMO_PLAN_COMPTABLES);
                }
            }

            // 2. Charger les banques ACTIVES
            try {
                const banqueData = await fetchJson(api('/banques'), {}, navigate);
                const banquesArray = banqueData?.data || banqueData || [];
                const activeBanques = banquesArray.filter((b: any) => !b.statut || b.statut === 'ACTIF');
                fetchedBanques = activeBanques as Banque[];
                setBanques(fetchedBanques);
                setDebugInfo('Banques chargées');
            } catch (error) {
                console.error('Erreur chargement banques:', error);
                setBanques(DEMO_BANQUES);
            }

            // 3. Charger les journaux de trésorerie
            try {
                const journalData = await fetchJson(api('/journaux-tresorerie'), {}, navigate);
                const journauxArray = journalData?.data || journalData || [];
                fetchedJournaux = journauxArray as JournalTresorerie[];
                setJournauxTresorerie(fetchedJournaux);
                setDebugInfo(`Journaux chargés: ${journauxArray.length}`);
            } catch (error) {
                console.error('Erreur chargement journaux:', error);
                setJournauxTresorerie(DEMO_JOURNAUX_TRESORERIE);
            }

            // 4. Charger les utilisateurs
            try {
                const utilisateurData = await fetchJson(api('/utilisateurs/list'), {}, navigate);
                const utilisateursArray = utilisateurData?.data || utilisateurData || [];

                console.log('Données utilisateurs brutes:', utilisateursArray);

                // Normaliser tous les utilisateurs sans filtre trop strict
                const normalizedUtilisateurs = utilisateursArray.map((u: any) => ({
                    id: u.id,
                    username: u.username || u.userName || u.email || 'Utilisateur',
                    firstName: u.firstName || u.first_name || u.prenom || '',
                    lastName: u.lastName || u.last_name || u.nom || '',
                    fullName: u.fullName || u.full_name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username),
                    email: u.email || '',
                    statut: u.statut || 'ACTIF'
                }));

                if (normalizedUtilisateurs.length > 0) {
                    fetchedUtilisateurs = normalizedUtilisateurs as Utilisateur[];
                    setUtilisateurs(fetchedUtilisateurs);
                    setDebugInfo(`Utilisateurs chargés: ${fetchedUtilisateurs.length}`);
                    console.log('Utilisateurs normalisés:', fetchedUtilisateurs);
                } else {
                    console.warn('Aucun utilisateur trouvé dans la réponse API');
                    // Ne pas écraser avec DEMO ici, laisser vide
                }
            } catch (error) {
                console.warn('Erreur récupération utilisateurs, tentative /me', error);
                try {
                    const currentUser = await fetchJson(api('/me'), {}, navigate);
                    const normalizedUser = {
                        id: currentUser.id,
                        username: currentUser.username || currentUser.email,
                        firstName: currentUser.firstName || currentUser.prenom || '',
                        lastName: currentUser.lastName || currentUser.nom || '',
                        fullName: currentUser.fullName || (currentUser.firstName && currentUser.lastName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.username),
                        email: currentUser.email || '',
                        statut: currentUser.statut || 'ACTIF'
                    };
                    fetchedUtilisateurs = [normalizedUser] as Utilisateur[];
                    setUtilisateurs(fetchedUtilisateurs);
                    setDebugInfo('Utilisateur courant chargé');
                } catch (userError) {
                    console.error('Erreur récupération utilisateur courant:', userError);
                    // Ne pas écraser avec DEMO ici non plus
                }
            }


            // 5. Charger la société courante pour obtenir la devise par défaut
            try {
                const societeData = await fetchJson(api('/societes'), {}, navigate);
                const societe = Array.isArray(societeData?.data) ? societeData.data[0] : (Array.isArray(societeData) ? societeData[0] : null);
                if (societe && societe.deviseParDefaut && societe.deviseParDefaut.id) {
                    setDefaultDeviseId(societe.deviseParDefaut.id as number);
                    setDebugInfo('Devise par défaut de la société chargée');
                } else {
                    setDefaultDeviseId(null);
                    console.warn('Devise par défaut introuvable pour la société');
                }
            } catch (err) {
                console.error('Erreur récupération société:', err);
                setDefaultDeviseId(null);
            }
            // Définir les valeurs par défaut (utiliser uniquement les plans comptables de classe 5)
            const currentPlanComptables = (fetchedPlanComptables.length > 0 ? fetchedPlanComptables : (planComptables.length > 0 ? planComptables : DEMO_PLAN_COMPTABLES)).filter((pc) => {
                const code = (pc.codeFormate || pc.codeCompte || '').toString().trim();
                return code.length > 0 && /^5/.test(code);
            });
            const currentJournaux = (fetchedJournaux.length > 0 ? fetchedJournaux : (journauxTresorerie.length > 0 ? journauxTresorerie : DEMO_JOURNAUX_TRESORERIE));
            const currentUtilisateurs = (fetchedUtilisateurs.length > 0 ? fetchedUtilisateurs : (utilisateurs.length > 0 ? utilisateurs : DEMO_UTILISATEURS));

            // S'assurer que les IDs par défaut sont valides
            const defaultPlanComptableId = currentPlanComptables[0]?.id || 0;
            const defaultJournalId = currentJournaux[0]?.id || 0;
            const defaultUtilisateurId = currentUtilisateurs[0]?.id || 0;

            setCompte(prev => ({
                ...prev,
                planComptableId: defaultPlanComptableId,
                journalTresorerieId: defaultJournalId,
                gestionnaireId: defaultUtilisateurId
            }));

            setDebugInfo('Données chargées avec succès');

        } catch (error) {
            console.error('Erreur détaillée lors du chargement des données:', error);
            const errorMessage = error instanceof Error ? error.message : 'Impossible de charger les données nécessaires.';
            setError(errorMessage);
            setDebugInfo(`Erreur: ${errorMessage}`);

            // Only fall back to demo data for datasets that were not successfully fetched
            setUseDemoData(true);

            if (fetchedPlanComptables.length === 0) {
                setPlanComptables(DEMO_PLAN_COMPTABLES);
            }
            if (fetchedBanques.length === 0) {
                setBanques(DEMO_BANQUES);
            }
            if (fetchedJournaux.length === 0) {
                setJournauxTresorerie(DEMO_JOURNAUX_TRESORERIE);
            }
            if (fetchedUtilisateurs.length === 0) {
                setUtilisateurs(DEMO_UTILISATEURS);
            }

            toast({
                title: "Mode démonstration activé",
                description: errorMessage,
                variant: "default"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof CompteTresorerie, value: any) => {
        setCompte(prev => ({
            ...prev,
            [field]: value
        }));

        if (field === 'typeCompte' && value === 'autre') {
            setCompte(prev => ({
                ...prev,
                banqueId: undefined,
                bic: ''
            }));
        }

        if (field === 'soldeOuverture') {
            const newValue = value || '0.00';
            setCompte(prev => ({
                ...prev,
                soldeActuel: newValue
            }));
        }
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!compte.intitule.trim()) {
            errors.push("L'intitulé du compte est obligatoire");
        }

        if (!compte.numeroCompte.trim()) {
            errors.push("Le numéro de compte est obligatoire");
        }

        if (!compte.planComptableId) {
            errors.push("Le compte comptable associé est obligatoire");
        }

        if (!compte.journalTresorerieId) {
            errors.push("Le journal de trésorerie est obligatoire");
        }

        if (!compte.gestionnaireId) {
            errors.push("Le gestionnaire est obligatoire");
        }

        const typesRequireBanque = ['courant', 'epargne', 'transit', 'provision'];
        if (typesRequireBanque.includes(compte.typeCompte) && !compte.banqueId) {
            errors.push("La banque est obligatoire pour ce type de compte");
        }

        const solde = parseFloat(compte.soldeOuverture);
        if (isNaN(solde)) {
            errors.push("Le solde d'ouverture doit être un nombre valide");
        }

        return errors;
    };

    // Générer les écritures comptables pour un compte de trésorerie donné
    async function generateEcritures(compteId: number) {
        try {
            const data = await fetchJson(api(`/comptes-tresorerie/${compteId}/generer-ecritures`), { method: 'POST' }, navigate);
            toast({
                title: 'Écritures générées',
                description: data?.message || 'Les écritures comptables ont été générées avec succès.'
            });
        } catch (err: any) {
            console.error('Erreur génération écritures:', err);
            if (err?.status === 404) {
                toast({
                    title: 'Génération non disponible',
                    description: 'Le backend ne propose pas la génération automatique d\'écritures pour le moment.',
                    variant: 'default'
                });
                return;
            }
            const message = err?.data?.message || err?.message || 'Impossible de générer les écritures';
            toast({
                title: 'Erreur génération écritures',
                description: message,
                variant: 'destructive'
            });
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (useDemoData) {
            toast({
                title: "Mode démonstration",
                description: "En mode démonstration, les données ne sont pas enregistrées dans l'API",
                variant: "default"
            });

            setTimeout(() => {
                toast({
                    title: "Succès (démo)",
                    description: "Le compte de trésorerie a été créé avec succès (mode démonstration)",
                });

                // Simuler génération des écritures en mode démo
                toast({
                    title: 'Écritures (démo)',
                    description: 'Les écritures comptables ont été simulées (mode démo).'
                });

                resetForm();
            }, 1000);

            return;
        }

        const validationErrors = validateForm();
        if (!defaultDeviseId) {
            validationErrors.push("La devise de la société est introuvable. Veuillez vérifier la configuration.");
        }
        if (validationErrors.length > 0) {
            validationErrors.forEach(error => {
                toast({
                    title: "Erreur de validation",
                    description: error,
                    variant: "destructive"
                });
            });
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }

            const compteData = {
                intitule: compte.intitule.trim(),
                typeCompte: compte.typeCompte,
                numeroCompte: compte.numeroCompte.trim(),
                bic: compte.bic?.trim() || null,
                banqueId: compte.banqueId || null,
                compteComptableId: compte.planComptableId,
                deviseId: defaultDeviseId,
                journalTresorerieId: compte.journalTresorerieId,
                gestionnaireId: compte.gestionnaireId,
                superieurHierarchiqueId: compte.superieurHierarchiqueId || null,
                soldeOuverture: compte.soldeOuverture,
                soldeActuel: compte.soldeActuel,
                estPrincipal: compte.estPrincipal,
                statut: compte.statut,
                description: compte.description?.trim() || null,
                contactGestionnaire: compte.contactGestionnaire?.trim() || null,
                fonctionGestionnaire: compte.fonctionGestionnaire?.trim() || null
            };

            console.log('Envoi des données à l\'API:', compteData);
            let responseData: any = {};
            try {
                responseData = await fetchJson(api('/comptes-tresorerie'), { method: 'POST', body: JSON.stringify(compteData) }, navigate);
            } catch (err: any) {
                if (err?.status === 401) {
                    throw new Error('Session expirée. Veuillez vous reconnecter.');
                }
                if (err?.status === 400 && err?.data?.errors) {
                    Object.entries(err.data.errors).forEach(([field, message]) => {
                        toast({
                            title: "Erreur de validation",
                            description: `${field}: ${message}`,
                            variant: "destructive"
                        });
                    });
                    return;
                }
                if (err?.data?.error) {
                    throw new Error(err.data.error);
                }
                throw err;
            }

            toast({
                title: "Succès",
                description: responseData.message || "Le compte de trésorerie a été créé avec succès."
            });

            // Tenter d'obtenir l'ID créé depuis la réponse pour générer les écritures
            const createdId = responseData?.data?.id || responseData?.id || responseData?.compte?.id || null;

            if (createdId) {
                await generateEcritures(createdId);
            } else {
                // Si l'API ne renvoie pas l'ID, avertir l'utilisateur
                toast({
                    title: 'Info',
                    description: 'Le compte a été créé mais l\'ID n\'a pas été retourné par l\'API : génération automatique non vérifiée.',
                    variant: 'default'
                });
            }

            resetForm();

        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            const errorMessage = error instanceof Error ? error.message : "Une erreur inattendue est survenue";
            setError(errorMessage);

            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        const currentPlanComptables = (planComptables.length > 0 ? planComptables : DEMO_PLAN_COMPTABLES).filter((pc) => {
            const code = (pc.codeFormate || pc.codeCompte || '').toString().trim();
            return code.length > 0 && /^5/.test(code);
        });
        const currentJournaux = journauxTresorerie.length > 0 ? journauxTresorerie : DEMO_JOURNAUX_TRESORERIE;
        const currentUtilisateurs = utilisateurs.length > 0 ? utilisateurs : DEMO_UTILISATEURS;

        setCompte({
            intitule: '',
            typeCompte: 'courant',
            numeroCompte: '',
            bic: '',
            banqueId: undefined,
            planComptableId: currentPlanComptables[0]?.id || 0,
            journalTresorerieId: currentJournaux[0]?.id || 0,
            gestionnaireId: currentUtilisateurs[0]?.id || 0,
            superieurHierarchiqueId: undefined,
            soldeOuverture: '0.00',
            soldeActuel: '0.00',
            estPrincipal: false,
            statut: 'ACTIF',
            description: '',
            contactGestionnaire: '',
            fonctionGestionnaire: ''
        });
        setError(null);
    };

    const handleRefresh = () => {
        fetchData();
    };

    const typesRequireBanque = ['courant', 'epargne', 'transit', 'provision'];

    const getUtilisateurDisplayName = (user: Utilisateur): string => {
        if (user.fullName) return user.fullName;
        if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
        if (user.firstName) return user.firstName;
        return user.username;
    };

    const getPlanComptableDisplayName = (pc: PlanComptable): string => {
        const code = pc.codeFormate || pc.codeCompte;
        return `${code} - ${pc.intitule}`;
    };

    // Filtrer les plans comptables pour ne garder que la classe 5 (comptes financiers)
    const isClasse5 = (pc: PlanComptable) => {
        const code = (pc.codeFormate || pc.codeCompte || '').toString().trim();
        return code.length > 0 && /^5/.test(code);
    };

    const filteredPlanComptables = (planComptables.length > 0 ? planComptables : DEMO_PLAN_COMPTABLES).filter(isClasse5);

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Chargement des données...</p>
                        {debugInfo && <p className="text-xs text-muted-foreground">{debugInfo}</p>}
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Comptes de Trésorerie</h1>
                        <p className="text-muted-foreground">Configuration des comptes de trésorerie</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            className="gap-2"
                            disabled={submitting || loading}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                        </Button>
                        <Button
                            className="gap-2"
                            onClick={resetForm}
                            disabled={submitting}
                        >
                            <Plus className="w-4 h-4" />
                            Nouveau compte
                        </Button>
                    </div>
                </div>

                {useDemoData && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                            Mode démonstration activé. Les données affichées sont des données de test.
                            {debugInfo && <span className="block text-xs mt-1">{debugInfo}</span>}
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {useDemoData ? 'Créer un compte de trésorerie (Mode démo)' : 'Créer un nouveau compte de trésorerie'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Informations générales</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="intitule">
                                            Nom descriptif <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="intitule"
                                            value={compte.intitule}
                                            onChange={(e) => handleChange('intitule', e.target.value)}
                                            placeholder="Ex: Compte courant principal Banque Populaire"
                                            required
                                            disabled={submitting}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Nom descriptif du compte
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="typeCompte">
                                            Type de compte <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={compte.typeCompte}
                                            onValueChange={(value: CompteTresorerie['typeCompte']) =>
                                                handleChange('typeCompte', value)
                                            }
                                            disabled={submitting}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner le type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(TYPES_COMPTE).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-sm text-muted-foreground">
                                            Type de compte de trésorerie
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="numeroCompte">
                                            IBAN <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="numeroCompte"
                                            value={compte.numeroCompte}
                                            onChange={(e) => handleChange('numeroCompte', e.target.value)}
                                            placeholder="Ex: IBAN ou numéro de compte bancaire"
                                            required
                                            disabled={submitting}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Numéro de compte (IBAN, RIB ou identifiant local)
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bic">BIC/SWIFT (Optionnel)</Label>
                                        <Input
                                            id="bic"
                                            value={compte.bic || ''}
                                            onChange={(e) => handleChange('bic', e.target.value)}
                                            placeholder="Ex: BCPAMAMC"
                                            disabled={submitting || compte.typeCompte === 'autre'}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Code BIC/SWIFT de la banque
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <h3 className="text-lg font-semibold">Relations et affectations</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="planComptable">
                                            Compte Comptable <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={compte.planComptableId.toString()}
                                            onValueChange={(value) => handleChange('planComptableId', parseInt(value))}
                                            disabled={submitting || (filteredPlanComptables.length === 0 && !useDemoData)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un compte comptable" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredPlanComptables.map((pc) => (
                                                    <SelectItem key={pc.id} value={pc.id.toString()}>
                                                        {getPlanComptableDisplayName(pc)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {filteredPlanComptables.length === 0 && !useDemoData && (
                                            <p className="text-sm text-destructive">
                                                Aucun compte comptable actif disponible
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="journalTresorerie">
                                            Journal de trésorerie <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={compte.journalTresorerieId.toString()}
                                            onValueChange={(value) => handleChange('journalTresorerieId', parseInt(value))}
                                            disabled={submitting || (journauxTresorerie.length === 0 && !useDemoData)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un journal" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(journauxTresorerie.length > 0 ? journauxTresorerie : DEMO_JOURNAUX_TRESORERIE).map((journal) => (
                                                    <SelectItem key={journal.id} value={journal.id.toString()}>
                                                        {journal.code} - {journal.intitule}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {journauxTresorerie.length === 0 && !useDemoData && (
                                            <p className="text-sm text-destructive">
                                                Aucun journal de trésorerie disponible
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="gestionnaire">
                                            Gestionnaire <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={compte.gestionnaireId.toString()}
                                            onValueChange={(value) => handleChange('gestionnaireId', parseInt(value))}
                                            disabled={submitting || (utilisateurs.length === 0 && !useDemoData)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un gestionnaire" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(utilisateurs.length > 0 ? utilisateurs : DEMO_UTILISATEURS).map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {getUtilisateurDisplayName(user)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {utilisateurs.length === 0 && !useDemoData && (
                                            <p className="text-sm text-destructive">
                                                Aucun utilisateur disponible
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="superieurHierarchique">Supérieur hiérarchique (Optionnel)</Label>
                                        <Select
                                            value={compte.superieurHierarchiqueId?.toString() || 'none'}
                                            onValueChange={(value) => {
                                                if (value === 'none') {
                                                    handleChange('superieurHierarchiqueId', undefined);
                                                } else {
                                                    handleChange('superieurHierarchiqueId', parseInt(value));
                                                }
                                            }}
                                            disabled={submitting || (utilisateurs.length === 0 && !useDemoData)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner un supérieur hiérarchique" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Aucun</SelectItem>
                                                {(utilisateurs.length > 0 ? utilisateurs : DEMO_UTILISATEURS).map((user) => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {getUtilisateurDisplayName(user)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {typesRequireBanque.includes(compte.typeCompte) && (
                                <div className="space-y-4 border-t pt-4">
                                    <h3 className="text-lg font-semibold">Informations bancaires</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="banque">
                                                Banque <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={compte.banqueId?.toString() || 'none'}
                                                onValueChange={(value) => {
                                                    if (value === 'none') {
                                                        handleChange('banqueId', undefined);
                                                    } else {
                                                        handleChange('banqueId', parseInt(value));
                                                    }
                                                }}
                                                disabled={submitting || (banques.length === 0 && !useDemoData)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner une banque" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Sélectionner une banque</SelectItem>
                                                    {(banques.length > 0 ? banques : DEMO_BANQUES).map((banque) => (
                                                        <SelectItem key={banque.id} value={banque.id.toString()}>
                                                            {banque.nom} ({banque.codeBanque})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {banques.length === 0 && !useDemoData && (
                                                <p className="text-sm text-destructive">
                                                    Aucune banque disponible
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="contactGestionnaire">Contact du gestionnaire (Optionnel)</Label>
                                            <Input
                                                id="contactGestionnaire"
                                                value={compte.contactGestionnaire || ''}
                                                onChange={(e) => handleChange('contactGestionnaire', e.target.value)}
                                                placeholder="Ex: Tél: 06-XX-XX-XX-XX"
                                                disabled={submitting}
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                Contact du gestionnaire de compte
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4 border-t pt-4">
                                <h3 className="text-lg font-semibold">Soldes</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="soldeOuverture">
                                            Solde d'ouverture <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="soldeOuverture"
                                            type="number"
                                            step="0.01"
                                            value={compte.soldeOuverture}
                                            onChange={(e) => handleChange('soldeOuverture', e.target.value || '0.00')}
                                            placeholder="0.00"
                                            required
                                            disabled={submitting}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Solde initial du compte
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="soldeActuel">Solde actuel</Label>
                                        <Input
                                            id="soldeActuel"
                                            type="number"
                                            step="0.01"
                                            value={compte.soldeActuel}
                                            readOnly
                                            className="bg-muted"
                                            disabled={submitting}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Égal au solde d'ouverture à la création
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <h3 className="text-lg font-semibold">Paramètres et informations supplémentaires</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="estPrincipal">Compte principal</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Définir ce compte comme le compte principal de trésorerie
                                            </p>
                                        </div>
                                        <Switch
                                            id="estPrincipal"
                                            checked={compte.estPrincipal}
                                            onCheckedChange={(checked) => handleChange('estPrincipal', checked)}
                                            disabled={submitting}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="statut">Statut</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Statut du compte
                                            </p>
                                        </div>
                                        <Select
                                            value={compte.statut}
                                            onValueChange={(value: CompteTresorerie['statut']) =>
                                                handleChange('statut', value)
                                            }
                                            disabled={submitting}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Statut" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACTIF">Actif</SelectItem>
                                                <SelectItem value="INACTIF">Inactif</SelectItem>
                                                <SelectItem value="CLOTURE">Clôturé</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fonctionGestionnaire">Fonction du gestionnaire (Optionnel)</Label>
                                        <Input
                                            id="fonctionGestionnaire"
                                            value={compte.fonctionGestionnaire || ''}
                                            onChange={(e) => handleChange('fonctionGestionnaire', e.target.value)}
                                            placeholder="Ex: Responsable trésorerie"
                                            disabled={submitting}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Fonction du gestionnaire de compte
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optionnel)</Label>
                                    <Textarea
                                        id="description"
                                        value={compte.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Description du compte, informations complémentaires..."
                                        rows={3}
                                        disabled={submitting}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Informations complémentaires sur le compte
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t">
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
                                    className="gap-2"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {useDemoData ? 'Simulation...' : 'Enregistrement...'}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {useDemoData ? 'Créer (Démo)' : 'Enregistrer le compte'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </MainLayout>
    );
};

export default ComptesTresorerie;