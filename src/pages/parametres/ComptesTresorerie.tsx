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
import { Alert, AlertDescription } from "@/components/ui/alert";

// Types pour les données de l'API
interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    typeCompte: string;
    codeFormate: string;
    statut?: string;
}

interface Banque {
    id: number;
    nom: string;
    code: string;
    adresse?: string;
    telephone?: string;
    statut?: string;
}

interface Devise {
    id: number;
    code: string;
    intitule: string;
    symbole: string;
    statut: string;
}

interface CompteTresorerie {
    id?: number;
    nom: string;
    typeCompte: 'BANQUE' | 'CAISSE' | 'COMPTE_COURANT' | 'MOBILE_MONEY' | 'AUTRE';
    numeroCompteComptable: string;
    planComptableId: number;
    banqueId?: number;
    numeroCompteBancaire?: string;
    deviseId: number;
    soldeOuverture: number;
    soldeActuel: number;
    estPrincipal: boolean;
    statut: 'ACTIF' | 'INACTIF';
    description?: string;
}

// Type pour les résultats de test API
interface ApiTestResult {
    name: string;
    url: string;
    status: number;
    ok: boolean;
    error?: unknown;
}

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Fonction utilitaire pour récupérer les headers d'authentification
const getAuthHeaders = (contentType: string | null = 'application/json'): HeadersInit => {
    // IMPORTANT: Votre login stocke sous 'token', pas 'authToken'
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

// Données de démonstration au cas où l'API serait indisponible
const DEMO_PLAN_COMPTABLES: PlanComptable[] = [
    { id: 1, codeCompte: "512", intitule: "Banques", typeCompte: "BANQUE", codeFormate: "512", statut: "ACTIF" },
    { id: 2, codeCompte: "53", intitule: "Caisse", typeCompte: "CAISSE", codeFormate: "53", statut: "ACTIF" },
    { id: 3, codeCompte: "58", intitule: "Virements internes", typeCompte: "COMPTE_COURANT", codeFormate: "58", statut: "ACTIF" },
];

const DEMO_BANQUES: Banque[] = [
    { id: 1, nom: "BANQUE POPULAIRE", code: "BP", adresse: "Casablanca", telephone: "0522-123456", statut: "ACTIF" },
    { id: 2, nom: "ATTIJARIWAFA BANK", code: "AWB", adresse: "Casablanca", telephone: "0522-654321", statut: "ACTIF" },
    { id: 3, nom: "BANK OF AFRICA", code: "BOA", adresse: "Rabat", telephone: "0537-789012", statut: "ACTIF" },
];

const DEMO_DEVISES: Devise[] = [
    { id: 1, code: "MAD", intitule: "Dirham marocain", symbole: "DH", statut: "ACTIF" },
    { id: 2, code: "EUR", intitule: "Euro", symbole: "€", statut: "ACTIF" },
    { id: 3, code: "USD", intitule: "Dollar américain", symbole: "$", statut: "ACTIF" },
];

const ComptesTresorerie = () => {
    const { toast } = useToast();
    const [compte, setCompte] = useState<CompteTresorerie>({
        nom: '',
        typeCompte: 'BANQUE',
        numeroCompteComptable: '',
        planComptableId: 0,
        banqueId: undefined,
        numeroCompteBancaire: '',
        deviseId: 0,
        soldeOuverture: 0,
        soldeActuel: 0,
        estPrincipal: false,
        statut: 'ACTIF',
        description: ''
    });

    const [planComptables, setPlanComptables] = useState<PlanComptable[]>([]);
    const [banques, setBanques] = useState<Banque[]>([]);
    const [devises, setDevises] = useState<Devise[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useDemoData, setUseDemoData] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

    // Fonction pour tester la connexion à l'API
    const testApiConnection = async (): Promise<ApiTestResult[]> => {
        const endpoints = [
            { name: 'Plan comptable', url: `${API_BASE_URL}/plan-comptable` },
            { name: 'Banques', url: `${API_BASE_URL}/banques` },
            { name: 'Devises', url: `${API_BASE_URL}/devises` },
            { name: 'Comptes trésorerie', url: `${API_BASE_URL}/comptes-tresorerie` },
        ];

        const results: ApiTestResult[] = [];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint.url, { headers: getAuthHeaders() });
                results.push({
                    name: endpoint.name,
                    url: endpoint.url,
                    status: response.status,
                    ok: response.ok
                });
            } catch (err) {
                results.push({
                    name: endpoint.name,
                    url: endpoint.url,
                    status: 0,
                    ok: false,
                    error: err
                });
            }
        }
        return results;
    };

    const fetchData = async () => {
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
                setDevises(DEMO_DEVISES);

                toast({
                    title: "Non connecté",
                    description: "Veuillez vous reconnecter pour accéder aux données réelles",
                    variant: "destructive"
                });
                return;
            }

            setDebugInfo(`Token trouvé: ${token.substring(0, 20)}...`);

            // Tester la connexion API
            const testResults = await testApiConnection();
            const apiStatus = testResults.filter(r => r.ok).length > 0;

            if (!apiStatus) {
                setDebugInfo('API non accessible, utilisation des données de démonstration');
                setUseDemoData(true);
                setPlanComptables(DEMO_PLAN_COMPTABLES);
                setBanques(DEMO_BANQUES);
                setDevises(DEMO_DEVISES);

                toast({
                    title: "Mode démonstration",
                    description: "L'API n'est pas accessible. Utilisation des données de démonstration.",
                    variant: "default"
                });
                return;
            }

            const headers = getAuthHeaders();

            // 1. Charger les plans comptables ACTIFS
            // CORRECTION: Utiliser l'endpoint correct: /api/plan-comptable (sans 's')
            const planComptableResponse = await fetch(`${API_BASE_URL}/plan-comptable/actifs`, { headers });

            if (!planComptableResponse.ok) {
                // Essayer sans le chemin /actifs
                const planComptableResponse2 = await fetch(`${API_BASE_URL}/plan-comptable`, { headers });
                if (!planComptableResponse2.ok) {
                    throw new Error(`Erreur ${planComptableResponse2.status} lors du chargement des comptes comptables`);
                }
                const planComptableData2 = await planComptableResponse2.json();
                // Filtrer les actifs côté client si nécessaire
                const filteredData = Array.isArray(planComptableData2)
                    ? planComptableData2.filter((p: PlanComptable) => !p.statut || p.statut === 'ACTIF')
                    : (planComptableData2.data || []).filter((p: PlanComptable) => !p.statut || p.statut === 'ACTIF');
                setPlanComptables(filteredData);
            } else {
                const planComptableData = await planComptableResponse.json();
                const dataArray = Array.isArray(planComptableData)
                    ? planComptableData
                    : (planComptableData.data || []);
                setPlanComptables(dataArray);
            }

            // 2. Charger les banques ACTIVES
            const banqueResponse = await fetch(`${API_BASE_URL}/banques`, { headers });
            if (banqueResponse.ok) {
                const banqueData = await banqueResponse.json();
                const banquesArray = Array.isArray(banqueData) ? banqueData : (banqueData.data || []);
                // Filtrer les banques actives si la propriété statut existe
                const activeBanques = banquesArray.filter((b: Banque) => !b.statut || b.statut === 'ACTIF');
                setBanques(activeBanques);
            }

            // 3. Charger les devises ACTIVES
            const deviseResponse = await fetch(`${API_BASE_URL}/devises/actives`, { headers });
            if (deviseResponse.ok) {
                const deviseData = await deviseResponse.json();
                const devisesArray = Array.isArray(deviseData) ? deviseData : (deviseData.data || []);
                setDevises(devisesArray);
            } else {
                // Essayer l'endpoint standard
                const deviseResponse2 = await fetch(`${API_BASE_URL}/devises`, { headers });
                if (deviseResponse2.ok) {
                    const deviseData2 = await deviseResponse2.json();
                    const devisesArray = Array.isArray(deviseData2) ? deviseData2 : (deviseData2.data || []);
                    const activeDevises = devisesArray.filter((d: Devise) => d.statut === 'ACTIF');
                    setDevises(activeDevises);
                }
            }

            // Définir les valeurs par défaut
            const currentPlanComptables = planComptables.length > 0 ? planComptables : DEMO_PLAN_COMPTABLES;
            const currentDevises = devises.length > 0 ? devises : DEMO_DEVISES;

            if (currentPlanComptables.length > 0 && currentDevises.length > 0) {
                setCompte(prev => ({
                    ...prev,
                    planComptableId: currentPlanComptables[0].id,
                    deviseId: currentDevises[0].id
                }));
            }

            setDebugInfo('Données chargées avec succès');

        } catch (error) {
            console.error('Erreur détaillée lors du chargement des données:', error);
            const errorMessage = error instanceof Error ? error.message : 'Impossible de charger les données nécessaires.';
            setError(errorMessage);
            setDebugInfo(`Erreur: ${errorMessage}`);

            // Basculer en mode démonstration
            setUseDemoData(true);
            setPlanComptables(DEMO_PLAN_COMPTABLES);
            setBanques(DEMO_BANQUES);
            setDevises(DEMO_DEVISES);

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

        if (field === 'typeCompte' && value !== 'BANQUE') {
            setCompte(prev => ({
                ...prev,
                banqueId: undefined,
                numeroCompteBancaire: ''
            }));
        }

        if (field === 'soldeOuverture') {
            const newValue = parseFloat(value) || 0;
            setCompte(prev => ({
                ...prev,
                soldeActuel: newValue
            }));
        }
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!compte.nom.trim()) {
            errors.push("Le nom du compte est obligatoire");
        }

        if (!compte.numeroCompteComptable.trim()) {
            errors.push("Le numéro de compte comptable est obligatoire");
        }

        if (!compte.planComptableId) {
            errors.push("Le compte comptable associé est obligatoire");
        }

        if (!compte.deviseId) {
            errors.push("La devise est obligatoire");
        }

        if (compte.typeCompte === 'BANQUE') {
            if (!compte.banqueId) {
                errors.push("La banque est obligatoire pour un compte de type BANQUE");
            }
            if (!compte.numeroCompteBancaire?.trim()) {
                errors.push("Le numéro de compte bancaire est obligatoire pour un compte de type BANQUE");
            }
        }

        if (compte.soldeOuverture < 0) {
            errors.push("Le solde d'ouverture ne peut pas être négatif");
        }

        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (useDemoData) {
            toast({
                title: "Mode démonstration",
                description: "En mode démonstration, les données ne sont pas enregistrées dans l'API",
                variant: "default"
            });

            // Simuler un enregistrement réussi
            setTimeout(() => {
                toast({
                    title: "Succès (démo)",
                    description: "Le compte de trésorerie a été créé avec succès (mode démonstration)",
                });

                // Réinitialiser le formulaire
                resetForm();
            }, 1000);

            return;
        }

        const validationErrors = validateForm();
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
            // Vérifier à nouveau le token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }

            // Préparer les données pour l'API
            const compteData = {
                ...compte,
                numeroCompteBancaire: compte.numeroCompteBancaire?.trim() || null,
                description: compte.description?.trim() || null,
                soldeOuverture: parseFloat(compte.soldeOuverture.toString()),
                soldeActuel: parseFloat(compte.soldeActuel.toString())
            };

            console.log('Envoi des données à l\'API:', compteData);

            const response = await fetch(`${API_BASE_URL}/comptes-tresorerie`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(compteData),
            });

            const responseText = await response.text();
            let responseData;
            try {
                responseData = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error('Erreur parsing JSON:', e);
                responseData = {};
            }

            console.log('Réponse API:', response.status, responseData);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Session expirée. Veuillez vous reconnecter.');
                }

                if (response.status === 400 && responseData.errors) {
                    Object.entries(responseData.errors).forEach(([field, message]) => {
                        toast({
                            title: "Erreur de validation",
                            description: `${field}: ${message}`,
                            variant: "destructive"
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
                description: responseData.message || "Le compte de trésorerie a été créé avec succès."
            });

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
        const currentPlanComptables = planComptables.length > 0 ? planComptables : DEMO_PLAN_COMPTABLES;
        const currentDevises = devises.length > 0 ? devises : DEMO_DEVISES;

        setCompte({
            nom: '',
            typeCompte: 'BANQUE',
            numeroCompteComptable: '',
            planComptableId: currentPlanComptables[0]?.id || 0,
            banqueId: undefined,
            numeroCompteBancaire: '',
            deviseId: currentDevises[0]?.id || 0,
            soldeOuverture: 0,
            soldeActuel: 0,
            estPrincipal: false,
            statut: 'ACTIF',
            description: ''
        });
        setError(null);
    };

    const handleRefresh = () => {
        fetchData();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Chargement des données...</p>
                    {debugInfo && <p className="text-xs text-muted-foreground">{debugInfo}</p>}
                </div>
            </div>
        );
    }

    return (
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
                        disabled={submitting}
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
                            <h3 className="text-lg font-semibold">Informations de base</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nom">
                                        Nom du compte <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="nom"
                                        value={compte.nom}
                                        onChange={(e) => handleChange('nom', e.target.value)}
                                        placeholder="Ex: Compte principal Banque Populaire"
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
                                            <SelectItem value="BANQUE">Banque</SelectItem>
                                            <SelectItem value="CAISSE">Caisse</SelectItem>
                                            <SelectItem value="COMPTE_COURANT">Compte courant</SelectItem>
                                            <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                                            <SelectItem value="AUTRE">Autre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm text-muted-foreground">
                                        Type de compte de trésorerie
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="numeroCompteComptable">
                                        Numéro de compte comptable <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="numeroCompteComptable"
                                        value={compte.numeroCompteComptable}
                                        onChange={(e) => handleChange('numeroCompteComptable', e.target.value)}
                                        placeholder="Ex: 512100"
                                        required
                                        disabled={submitting}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Numéro unique du compte comptable
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="planComptable">
                                        Compte comptable associé <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={compte.planComptableId.toString()}
                                        onValueChange={(value) => handleChange('planComptableId', parseInt(value))}
                                        disabled={submitting || (planComptables.length === 0 && !useDemoData)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un compte" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(planComptables.length > 0 ? planComptables : DEMO_PLAN_COMPTABLES).map((pc) => (
                                                <SelectItem key={pc.id} value={pc.id.toString()}>
                                                    {pc.codeFormate || pc.codeCompte} - {pc.intitule}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {planComptables.length === 0 && !useDemoData && (
                                        <p className="text-sm text-destructive">
                                            Aucun compte comptable actif disponible
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {compte.typeCompte === 'BANQUE' && (
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="text-lg font-semibold">Informations bancaires</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="banque">
                                            Banque <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={compte.banqueId?.toString() || ''}
                                            onValueChange={(value) => handleChange('banqueId', parseInt(value))}
                                            disabled={submitting || (banques.length === 0 && !useDemoData)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une banque" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(banques.length > 0 ? banques : DEMO_BANQUES).map((banque) => (
                                                    <SelectItem key={banque.id} value={banque.id.toString()}>
                                                        {banque.nom} ({banque.code})
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
                                        <Label htmlFor="numeroCompteBancaire">
                                            Numéro de compte bancaire <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="numeroCompteBancaire"
                                            value={compte.numeroCompteBancaire || ''}
                                            onChange={(e) => handleChange('numeroCompteBancaire', e.target.value)}
                                            placeholder="Ex: 123456789012"
                                            required={compte.typeCompte === 'BANQUE'}
                                            disabled={submitting}
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Numéro du compte bancaire
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-semibold">Devise et soldes</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="devise">
                                        Devise <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={compte.deviseId.toString()}
                                        onValueChange={(value) => handleChange('deviseId', parseInt(value))}
                                        disabled={submitting || (devises.length === 0 && !useDemoData)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner une devise" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(devises.length > 0 ? devises : DEMO_DEVISES).map((devise) => (
                                                <SelectItem key={devise.id} value={devise.id.toString()}>
                                                    {devise.code} - {devise.intitule} ({devise.symbole})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {devises.length === 0 && !useDemoData && (
                                        <p className="text-sm text-destructive">
                                            Aucune devise active disponible
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="soldeOuverture">
                                        Solde d'ouverture (DH) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="soldeOuverture"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={compte.soldeOuverture}
                                        onChange={(e) => handleChange('soldeOuverture', e.target.value)}
                                        placeholder="0.00"
                                        required
                                        disabled={submitting}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Solde initial du compte
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="soldeActuel">Solde actuel (DH)</Label>
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
                            <h3 className="text-lg font-semibold">Paramètres</h3>

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
                                            Activer ou désactiver le compte
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
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={compte.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder="Description du compte (facultatif)"
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
    );
};

export default ComptesTresorerie;