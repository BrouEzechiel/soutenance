import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Save, Send, DollarSign, Plus, Trash2, Calendar, Calculator, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface OrdrePaiementFormData {
    id?: number;
    numeroOrdre: string;
    date: string;
    emetteur: string;
    typeOperation: string;
    societeId: number;
    comptePaiementId: number;
    deviseId: number;
    tiersId?: number;
    codeTiers?: string;
    nomTiers?: string;
    compteComptableId?: number;
    description?: string;
    montant: number;
    statut: string;
    modePaiement: string;
    referencePaiement?: string;
    banqueBeneficiaireId?: number;
    iban?: string;
    bic?: string;
    factureIds?: number[];
}

interface Facture {
    id: number;
    numero: string;
    dateEmission: string;
    montantTotal: number;
    solde: number;
    statut: string;
    tiers: {
        id: number;
        code: string;
        intitule: string;
    };
}

interface Tiers {
    id: number;
    code: string;
    intitule: string;
    type: string;
    raisonSociale?: string;
}

interface PlanComptable {
    id: number;
    codeCompte: string;
    intitule: string;
    type: string;
}

interface Devise {
    id: number;
    code: string;
    nom: string;
    symbole: string;
}

interface ChargeSocialeFormData {
    organisme: string;
    typeCharge: string;
    modeCalcul: string;
    periode: string;
    reference?: string;
    numeroAffiliation?: string;
    montantBase?: number;
    majorations?: number;
    penalites?: number;
    baseCalcul?: number;
    taux?: number;
    dateDeclaration?: string;
    dateEcheance?: string;
    regulier: boolean;
    active: boolean;
    statut: string;
    deviseId: number;
    compteId: number;
}

// Nouveaux interfaces pour les autres types de paiements
interface AutrePaiementFormData {
    beneficiaire: string;
    date: string;
    objet?: string;
    categorie: string;
    montant: number;
    deviseId: number;
    compteComptableId: number;
    compteTVAId?: number;
    compteTiersId?: number;
    numeroFacture?: string;
    datePiece?: string;
    tva?: number;
    tiersId?: number;
    statut: string;
}

interface AvanceSalaireFormData {
    salarieId: number;
    beneficiaire: string;
    matricule: string;
    typeAvance: string;
    montantAvance: number;
    modeRemboursement: string;
    nombreEcheances?: number;
    dateDemande: string;
    motif?: string;
    description?: string;
    service?: string;
    periode?: string;
    referenceDocument?: string;
    observations?: string;
    urgence: boolean;
    deviseId: number;
    compteAvanceId: number;
    compteTiersId?: number;
    statut: string;
}

interface ImpotTaxeFormData {
    natureTaxe: string;
    beneficiaire: string;
    periode: string;
    reference?: string;
    numeroDeclaration?: string;
    dateDeclaration?: string;
    dateEcheance?: string;
    description?: string;
    montantBase: number;
    majorations?: number;
    penalites?: number;
    interets?: number;
    observations?: string;
    deductible: boolean;
    taux?: number;
    deviseId: number;
    compteComptableId: number;
    statut: string;
}

interface NoteFraisFormData {
    beneficiaireTiersId: number;
    beneficiaire: string;
    typeFrais: string;
    categorieFrais: string;
    dateDepense: string;
    objetMission?: string;
    lieuMission?: string;
    description?: string;
    libelleDetail?: string;
    montant: number;
    montantRembourse?: number;
    quantite?: number;
    prixUnitaire?: number;
    numeroFacture?: string;
    fichierJustificatif?: string;
    justificatifFourni: boolean;
    observations?: string;
    distanceKm?: number;
    tauxKilometrique?: number;
    deviseId: number;
    compteComptableId: number;
    statut: string;
}

interface PaieFormData {
    salarieId: number;
    beneficiaire: string;
    matricule: string;
    referenceSalaire: string;
    periode: string;
    typePaie: string;
    dateDebutPeriode: string;
    dateFinPeriode: string;
    datePaiement: string;
    montantNet: number;
    salaireBrut: number;
    chargesSalariales?: number;
    chargesPatronales?: number;
    impotRevenu?: number;
    salaireBase?: number;
    heuresSupplementaires?: number;
    primes?: number;
    indemnites?: number;
    avantages?: number;
    observations?: string;
    nombreHeures?: number;
    nombreHeuresSupplementaires?: number;
    tauxHoraire?: number;
    deviseId: number;
    compteChargesId: number;
    compteTiersId?: number;
    compteOrganismesSociauxId?: number;
    statut: string;
}

interface PerDiemFormData {
    beneficiaireTiersId: number;
    beneficiaire: string;
    typeMission: string;
    destination?: string;
    objetMission?: string;
    dateDebut: string;
    dateFin: string;
    tauxJournalier: number;
    deviseId: number;
    compteComptableId: number;
    statut: string;
}

const OrdrePaiement = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");
    const [showDialog, setShowDialog] = useState(false);
    const [dialogType, setDialogType] = useState<"facture" | "autre" | "avance" | "impot" | "note" | "paie" | "diem" | "charge">("facture");
    const [initialLoading, setInitialLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);

    const [ordre, setOrdre] = useState<OrdrePaiementFormData>({
        numeroOrdre: "",
        date: new Date().toISOString().split('T')[0],
        emetteur: "",
        typeOperation: "",
        societeId: 0,
        comptePaiementId: 0,
        deviseId: 0,
        montant: 0,
        statut: "brouillon",
        modePaiement: "virement",
    });

    const [chargeSociale, setChargeSociale] = useState<ChargeSocialeFormData>({
        organisme: "cnss",
        typeCharge: "contribution_patronale",
        modeCalcul: "montant_fixe",
        periode: "mensuelle",
        regulier: true,
        active: true,
        statut: "brouillon",
        deviseId: 0,
        compteId: 0,
    });

    // Nouveaux états pour les autres types de paiements
    const [autrePaiement, setAutrePaiement] = useState<AutrePaiementFormData>({
        beneficiaire: "",
        date: new Date().toISOString().split('T')[0],
        categorie: "divers",
        montant: 0,
        deviseId: 0,
        compteComptableId: 0,
        statut: "brouillon",
    });

    const [avanceSalaire, setAvanceSalaire] = useState<AvanceSalaireFormData>({
        salarieId: 0,
        beneficiaire: "",
        matricule: "",
        typeAvance: "ponctuelle",
        montantAvance: 0,
        modeRemboursement: "mensuel",
        dateDemande: new Date().toISOString().split('T')[0],
        urgence: false,
        deviseId: 0,
        compteAvanceId: 0,
        statut: "brouillon",
    });

    const [impotTaxe, setImpotTaxe] = useState<ImpotTaxeFormData>({
        natureTaxe: "tva",
        beneficiaire: "",
        periode: "mensuelle",
        montantBase: 0,
        deductible: false,
        deviseId: 0,
        compteComptableId: 0,
        statut: "brouillon",
    });

    const [noteFrais, setNoteFrais] = useState<NoteFraisFormData>({
        beneficiaireTiersId: 0,
        beneficiaire: "",
        typeFrais: "mission",
        categorieFrais: "deplacement",
        dateDepense: new Date().toISOString().split('T')[0],
        montant: 0,
        justificatifFourni: false,
        deviseId: 0,
        compteComptableId: 0,
        statut: "brouillon",
    });

    const [paie, setPaie] = useState<PaieFormData>({
        salarieId: 0,
        beneficiaire: "",
        matricule: "",
        referenceSalaire: "",
        periode: "mensuelle",
        typePaie: "salaire",
        dateDebutPeriode: new Date().toISOString().split('T')[0],
        dateFinPeriode: new Date().toISOString().split('T')[0],
        datePaiement: new Date().toISOString().split('T')[0],
        montantNet: 0,
        salaireBrut: 0,
        deviseId: 0,
        compteChargesId: 0,
        statut: "brouillon",
    });

    const [perDiem, setPerDiem] = useState<PerDiemFormData>({
        beneficiaireTiersId: 0,
        beneficiaire: "",
        typeMission: "interne",
        dateDebut: new Date().toISOString().split('T')[0],
        dateFin: new Date().toISOString().split('T')[0],
        tauxJournalier: 0,
        deviseId: 0,
        compteComptableId: 0,
        statut: "brouillon",
    });

    const [societes, setSocietes] = useState<any[]>([]);
    const [comptesTresorerie, setComptesTresorerie] = useState<any[]>([]);
    const [devises, setDevises] = useState<Devise[]>([]);
    const [tiers, setTiers] = useState<Tiers[]>([]);
    const [planComptable, setPlanComptable] = useState<PlanComptable[]>([]);
    const [banques, setBanques] = useState<any[]>([]);
    const [factures, setFactures] = useState<Facture[]>([]);
    const [selectedFactures, setSelectedFactures] = useState<Facture[]>([]);
    const [montantTotal, setMontantTotal] = useState<number>(0);
    const [existingCharges, setExistingCharges] = useState<any[]>([]);
    const [existingItems, setExistingItems] = useState<any[]>([]);

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = (): Record<string, string> => {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };

        // Essayez de récupérer le token depuis différents endroits
        const token = localStorage.getItem("auth_token") ||
            localStorage.getItem("token") ||
            sessionStorage.getItem("auth_token") ||
            sessionStorage.getItem("token");

        if (token && token !== "null" && token !== "undefined") {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return headers;
    };

    // Fonction pour vérifier si une réponse est un JSON valide
    const isJsonResponse = async (response: Response): Promise<boolean> => {
        const contentType = response.headers.get("content-type");
        return contentType ? contentType.includes("application/json") : false;
    };

    // Fonction pour gérer les erreurs API
    const handleApiError = async (response: Response, endpoint: string): Promise<never> => {
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;

        try {
            if (await isJsonResponse(response)) {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;

                if (response.status === 401) {
                    // Rediriger vers la page de login si non authentifié
                    toast({
                        title: "Session expirée",
                        description: "Veuillez vous reconnecter",
                        variant: "destructive",
                    });
                    // Vous pouvez ajouter une redirection ici si nécessaire
                    // window.location.href = "/login";
                }
            } else {
                const text = await response.text();
                if (text.includes("<!DOCTYPE")) {
                    errorMessage = "Serveur a retourné une page HTML au lieu de JSON. Vérifiez l'authentification.";
                } else {
                    errorMessage = `Réponse non-JSON: ${text.substring(0, 100)}...`;
                }
            }
        } catch (e) {
            console.error("Erreur lors de la lecture de la réponse:", e);
        }

        throw new Error(`API Error (${endpoint}): ${errorMessage}`);
    };

    // Charger les données initiales
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setInitialLoading(true);
            setApiError(null);

            const headers = getAuthHeaders();
            const baseUrl = "/api"; // Vous pouvez ajuster cette URL si nécessaire

            // Fonction pour faire un appel API avec gestion d'erreurs
            const fetchWithErrorHandling = async (endpoint: string) => {
                const response = await fetch(`${baseUrl}${endpoint}`, { headers });

                if (!response.ok) {
                    await handleApiError(response, endpoint);
                }

                if (!await isJsonResponse(response)) {
                    throw new Error(`Réponse non-JSON de ${endpoint}`);
                }

                return await response.json();
            };

            // Récupérer les sociétés
            try {
                const societesData = await fetchWithErrorHandling('/societes');
                setSocietes(societesData);
            } catch (error) {
                console.warn('Erreur lors du chargement des sociétés:', error);
            }

            // Récupérer les comptes de trésorerie
            try {
                const comptesData = await fetchWithErrorHandling('/comptes-tresorerie');
                setComptesTresorerie(comptesData);
            } catch (error) {
                console.warn('Erreur lors du chargement des comptes:', error);
            }

            // Récupérer les devises
            try {
                const devisesData = await fetchWithErrorHandling('/devises');
                setDevises(devisesData);
                if (devisesData.length > 0) {
                    setOrdre(prev => ({ ...prev, deviseId: devisesData[0].id }));
                    setChargeSociale(prev => ({ ...prev, deviseId: devisesData[0].id }));
                    setAutrePaiement(prev => ({ ...prev, deviseId: devisesData[0].id }));
                    setAvanceSalaire(prev => ({ ...prev, deviseId: devisesData[0].id }));
                    setImpotTaxe(prev => ({ ...prev, deviseId: devisesData[0].id }));
                    setNoteFrais(prev => ({ ...prev, deviseId: devisesData[0].id }));
                    setPaie(prev => ({ ...prev, deviseId: devisesData[0].id }));
                    setPerDiem(prev => ({ ...prev, deviseId: devisesData[0].id }));
                }
            } catch (error) {
                console.warn('Erreur lors du chargement des devises:', error);
            }

            // Récupérer les tiers
            try {
                const tiersData = await fetchWithErrorHandling('/tiers');
                setTiers(tiersData);
            } catch (error) {
                console.warn('Erreur lors du chargement des tiers:', error);
            }

            // Récupérer le plan comptable
            try {
                const planData = await fetchWithErrorHandling('/plan-comptables?actifs=true');
                setPlanComptable(planData);
            } catch (error) {
                console.warn('Erreur lors du chargement du plan comptable:', error);
            }

            // Récupérer les banques
            try {
                const banquesData = await fetchWithErrorHandling('/banques');
                setBanques(banquesData);
            } catch (error) {
                console.warn('Erreur lors du chargement des banques:', error);
            }

            // Récupérer les factures
            try {
                const facturesData = await fetchWithErrorHandling('/factures');
                setFactures(facturesData);
            } catch (error) {
                console.warn('Erreur lors du chargement des factures:', error);
            }

            // Récupérer les charges sociales existantes
            try {
                const chargesData = await fetchWithErrorHandling('/charges-sociales/actives');
                setExistingCharges(chargesData.data || chargesData || []);
            } catch (error) {
                console.warn('Erreur lors du chargement des charges sociales:', error);
            }

        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            setApiError(error instanceof Error ? error.message : "Erreur inconnue");

            toast({
                title: "Erreur de chargement",
                description: "Impossible de charger les données initiales. Vérifiez votre connexion et votre authentification.",
                variant: "destructive",
            });
        } finally {
            setInitialLoading(false);
        }
    };

    const handleInputChange = (field: keyof OrdrePaiementFormData, value: any) => {
        setOrdre(prev => ({ ...prev, [field]: value }));
    };

    const handleChargeSocialeChange = (field: keyof ChargeSocialeFormData, value: any) => {
        setChargeSociale(prev => ({ ...prev, [field]: value }));
    };

    // Handlers pour les autres types de paiements
    const handleAutrePaiementChange = (field: keyof AutrePaiementFormData, value: any) => {
        setAutrePaiement(prev => ({ ...prev, [field]: value }));
    };

    const handleAvanceSalaireChange = (field: keyof AvanceSalaireFormData, value: any) => {
        setAvanceSalaire(prev => ({ ...prev, [field]: value }));
    };

    const handleImpotTaxeChange = (field: keyof ImpotTaxeFormData, value: any) => {
        setImpotTaxe(prev => ({ ...prev, [field]: value }));
    };

    const handleNoteFraisChange = (field: keyof NoteFraisFormData, value: any) => {
        setNoteFrais(prev => ({ ...prev, [field]: value }));
    };

    const handlePaieChange = (field: keyof PaieFormData, value: any) => {
        setPaie(prev => ({ ...prev, [field]: value }));
    };

    const handlePerDiemChange = (field: keyof PerDiemFormData, value: any) => {
        setPerDiem(prev => ({ ...prev, [field]: value }));
    };

    const handleTiersChange = (tiersId: number) => {
        const selectedTier = tiers.find(t => t.id === tiersId);
        if (selectedTier) {
            setOrdre(prev => ({
                ...prev,
                tiersId,
                codeTiers: selectedTier.code,
                nomTiers: selectedTier.intitule || selectedTier.raisonSociale
            }));
        }
    };

    const handleFactureSelection = (facture: Facture, checked: boolean) => {
        let newSelectedFactures;
        if (checked) {
            newSelectedFactures = [...selectedFactures, facture];
        } else {
            newSelectedFactures = selectedFactures.filter(f => f.id !== facture.id);
        }
        setSelectedFactures(newSelectedFactures);

        const total = newSelectedFactures.reduce((sum, f) => sum + f.montantTotal, 0);

        setMontantTotal(total);
        handleInputChange('montant', total);
        handleInputChange('factureIds', newSelectedFactures.map(f => f.id));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const dataToSend = {
                ...ordre,
                date: ordre.date,
                emetteur: ordre.emetteur,
                typeOperation: ordre.typeOperation,
                societe: `/api/societes/${ordre.societeId}`,
                comptePaiement: `/api/comptes-tresorerie/${ordre.comptePaiementId}`,
                devise: `/api/devises/${ordre.deviseId}`,
                montant: ordre.montant.toString(),
                statut: ordre.statut,
                modePaiement: ordre.modePaiement,
                referencePaiement: ordre.referencePaiement,
                banqueBeneficiaire: ordre.banqueBeneficiaireId ? `/api/banques/${ordre.banqueBeneficiaireId}` : null,
                iban: ordre.iban,
                bic: ordre.bic,
                tiers: ordre.tiersId ? `/api/tiers/${ordre.tiersId}` : null,
                codeTiers: ordre.codeTiers,
                nomTiers: ordre.nomTiers,
                compteComptable: ordre.compteComptableId ? `/api/plan-comptables/${ordre.compteComptableId}` : null,
                description: ordre.description,
                factures: selectedFactures.map(f => `/api/factures/${f.id}`)
            };

            const headers = getAuthHeaders();
            const response = await fetch('/api/ordre-paiement', {
                method: 'POST',
                headers,
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                await handleApiError(response, '/api/ordre-paiement');
            }

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Succès",
                    description: "Ordre de paiement créé avec succès",
                });

                setOrdre(prev => ({ ...prev, id: result.data.id }));
                setSelectedFactures([]);
                setMontantTotal(0);
            } else {
                toast({
                    title: "Erreur",
                    description: result.message || "Erreur lors de la création",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de l'enregistrement",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Fonctions de création pour chaque type
    const handleCreateItem = async (type: string, data: any) => {
        if (!ordre.id) {
            toast({
                title: "Erreur",
                description: "Veuillez d'abord enregistrer l'ordre de paiement",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const dataToSend = {
                ...data,
                ordrePaiementId: ordre.id,
            };

            let endpoint = '';
            switch (type) {
                case 'charge': endpoint = '/api/charges-sociales'; break;
                case 'autre': endpoint = '/api/autres-paiements'; break;
                case 'avance': endpoint = '/api/avances-salaire'; break;
                case 'impot': endpoint = '/api/impots-taxes'; break;
                case 'note': endpoint = '/api/notes-frais'; break;
                case 'paie': endpoint = '/api/paies'; break;
                case 'diem': endpoint = '/api/per-diems'; break;
                default: return;
            }

            const headers = getAuthHeaders();
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                await handleApiError(response, endpoint);
            }

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Succès",
                    description: `${type === 'charge' ? 'Charge sociale' :
                        type === 'autre' ? 'Autre paiement' :
                            type === 'avance' ? 'Avance sur salaire' :
                                type === 'impot' ? 'Impôt/taxe' :
                                    type === 'note' ? 'Note de frais' :
                                        type === 'paie' ? 'Paie' :
                                            'Per diem'} créé(e) avec succès`,
                });

                // Rafraîchir la liste des éléments existants
                await loadExistingItems(ordre.typeOperation);

                // Réinitialiser les formulaires
                resetForms();
                setShowDialog(false);
            } else {
                toast({
                    title: "Erreur",
                    description: result.message || "Erreur lors de la création",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(`Erreur lors de la création ${dialogType}:`, error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de la création",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChargeSociale = () => handleCreateItem('charge', chargeSociale);
    const handleCreateAutrePaiement = () => handleCreateItem('autre', autrePaiement);
    const handleCreateAvanceSalaire = () => handleCreateItem('avance', avanceSalaire);
    const handleCreateImpotTaxe = () => handleCreateItem('impot', impotTaxe);
    const handleCreateNoteFrais = () => handleCreateItem('note', noteFrais);
    const handleCreatePaie = () => handleCreateItem('paie', paie);
    const handleCreatePerDiem = () => handleCreateItem('diem', perDiem);

    const loadExistingItems = async (type: string) => {
        if (!ordre.id) return;

        let endpoint = '';
        switch (type) {
            case 'charge_sociale': endpoint = '/api/charges-sociales'; break;
            case 'autre': endpoint = '/api/autres-paiements'; break;
            case 'avance': endpoint = '/api/avances-salaire'; break;
            case 'impot': endpoint = '/api/impots-taxes'; break;
            case 'note_frais': endpoint = '/api/notes-frais'; break;
            case 'salaire': endpoint = '/api/paies'; break;
            case 'per_diem': endpoint = '/api/per-diems'; break;
            default: return;
        }

        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${endpoint}?ordrePaiementId=${ordre.id}`, { headers });

            if (response.ok && await isJsonResponse(response)) {
                const result = await response.json();
                if (result.success) {
                    setExistingItems(result.data || []);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des éléments:', error);
        }
    };

    const resetForms = () => {
        setChargeSociale({
            organisme: "cnss",
            typeCharge: "contribution_patronale",
            modeCalcul: "montant_fixe",
            periode: "mensuelle",
            regulier: true,
            active: true,
            statut: "brouillon",
            deviseId: chargeSociale.deviseId,
            compteId: 0,
        });
        setAutrePaiement({
            beneficiaire: "",
            date: new Date().toISOString().split('T')[0],
            categorie: "divers",
            montant: 0,
            deviseId: autrePaiement.deviseId,
            compteComptableId: 0,
            statut: "brouillon",
        });
        // Réinitialiser les autres formulaires...
    };

    const handleSoumettre = async () => {
        if (!ordre.id) {
            toast({
                title: "Erreur",
                description: "Veuillez d'abord enregistrer l'ordre",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`/api/ordre-paiement/${ordre.id}/soumettre`, {
                method: 'POST',
                headers,
            });

            if (!response.ok) {
                await handleApiError(response, `/api/ordre-paiement/${ordre.id}/soumettre`);
            }

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Succès",
                    description: "Ordre de paiement soumis avec succès",
                });
                setOrdre(prev => ({ ...prev, statut: 'soumis' }));
            } else {
                toast({
                    title: "Erreur",
                    description: result.message || "Erreur lors de la soumission",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Erreur lors de la soumission:', error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de la soumission",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAjouterFacture = () => {
        setDialogType("facture");
        setShowDialog(true);
    };

    const handleCreateAutrePaiementDialog = () => {
        setDialogType("autre");
        setShowDialog(true);
    };

    const handleCreateAvanceSalaireDialog = () => {
        setDialogType("avance");
        setShowDialog(true);
    };

    const handleCreateImpotTaxeDialog = () => {
        setDialogType("impot");
        setShowDialog(true);
    };

    const handleCreateNoteFraisDialog = () => {
        setDialogType("note");
        setShowDialog(true);
    };

    const handleCreatePaieDialog = () => {
        setDialogType("paie");
        setShowDialog(true);
    };

    const handleCreatePerDiemDialog = () => {
        setDialogType("diem");
        setShowDialog(true);
    };

    const handleCreateChargeSocialeDialog = () => {
        setDialogType("charge");
        setShowDialog(true);
    };

    const handleAssocierItem = async (itemId: number, type: string) => {
        if (!ordre.id) return;

        try {
            let endpoint = '';
            switch (type) {
                case 'charge': endpoint = `/api/charges-sociales/${itemId}/associer-ordre/${ordre.id}`; break;
                case 'autre': endpoint = `/api/autres-paiements/${itemId}`; break;
                // Ajouter les autres endpoints...
            }

            const headers = getAuthHeaders();
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ ordrePaiementId: ordre.id }),
            });

            if (!response.ok) {
                await handleApiError(response, endpoint);
            }

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Succès",
                    description: "Élément associé à l'ordre avec succès",
                });
                await loadExistingItems(ordre.typeOperation);
            } else {
                toast({
                    title: "Erreur",
                    description: result.message || "Erreur lors de l'association",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Erreur lors de l\'association:', error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Erreur lors de l'association",
                variant: "destructive",
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const renderDialogContent = () => {
        switch (dialogType) {
            case "facture":
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Ajouter des factures</h3>
                        <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                            {factures.length === 0 ? (
                                <p className="text-muted-foreground text-sm">Aucune facture disponible</p>
                            ) : (
                                factures.map((facture) => (
                                    <div key={facture.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedFactures.some(f => f.id === facture.id)}
                                                onChange={(e) => handleFactureSelection(facture, e.target.checked)}
                                                className="h-4 w-4"
                                            />
                                            <div>
                                                <p className="font-medium">{facture.numero}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {facture.tiers?.intitule} -
                                                    {new Date(facture.dateEmission).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {facture.montantTotal.toLocaleString()} €
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            facture.statut === 'emise' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                            {facture.statut}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );

            case "charge":
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Créer une charge sociale</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="organisme">Organisme</Label>
                                <Select
                                    value={chargeSociale.organisme}
                                    onValueChange={(value) => handleChargeSocialeChange('organisme', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un organisme" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cnss">CNSS</SelectItem>
                                        <SelectItem value="cnrps">CNRPS</SelectItem>
                                        <SelectItem value="cnas">CNAS</SelectItem>
                                        <SelectItem value="caisse_retraite">Caisse de retraite</SelectItem>
                                        <SelectItem value="caisse_maladie">Caisse de maladie</SelectItem>
                                        <SelectItem value="autre">Autre organisme</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="typeCharge">Type de charge</Label>
                                <Select
                                    value={chargeSociale.typeCharge}
                                    onValueChange={(value) => handleChargeSocialeChange('typeCharge', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="contribution_patronale">Contribution patronale</SelectItem>
                                        <SelectItem value="contribution_salariale">Contribution salariale</SelectItem>
                                        <SelectItem value="cotisation_syndicale">Cotisation syndicale</SelectItem>
                                        <SelectItem value="assurance_maladie">Assurance maladie</SelectItem>
                                        <SelectItem value="assurance_vie">Assurance vie</SelectItem>
                                        <SelectItem value="autre">Autre charge</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="modeCalcul">Mode de calcul</Label>
                                <Select
                                    value={chargeSociale.modeCalcul}
                                    onValueChange={(value) => {
                                        handleChargeSocialeChange('modeCalcul', value);
                                        if (value === 'montant_fixe') {
                                            handleChargeSocialeChange('baseCalcul', undefined);
                                            handleChargeSocialeChange('taux', undefined);
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="montant_fixe">Montant fixe</SelectItem>
                                        <SelectItem value="taux">Calcul par taux</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="periode">Période</Label>
                                <Select
                                    value={chargeSociale.periode}
                                    onValueChange={(value) => handleChargeSocialeChange('periode', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une période" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mensuelle">Mensuelle</SelectItem>
                                        <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                                        <SelectItem value="semestrielle">Semestrielle</SelectItem>
                                        <SelectItem value="annuelle">Annuelle</SelectItem>
                                        <SelectItem value="exceptionnelle">Exceptionnelle</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {chargeSociale.modeCalcul === 'montant_fixe' && (
                                <div className="space-y-2">
                                    <Label htmlFor="montantBase">Montant de base</Label>
                                    <Input
                                        id="montantBase"
                                        type="number"
                                        step="0.01"
                                        value={chargeSociale.montantBase || ''}
                                        onChange={(e) => handleChargeSocialeChange('montantBase', parseFloat(e.target.value))}
                                        placeholder="0.00"
                                    />
                                </div>
                            )}

                            {chargeSociale.modeCalcul === 'taux' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="baseCalcul">Base de calcul</Label>
                                        <Input
                                            id="baseCalcul"
                                            type="number"
                                            step="0.01"
                                            value={chargeSociale.baseCalcul || ''}
                                            onChange={(e) => handleChargeSocialeChange('baseCalcul', parseFloat(e.target.value))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="taux">Taux (%)</Label>
                                        <Input
                                            id="taux"
                                            type="number"
                                            step="0.01"
                                            value={chargeSociale.taux || ''}
                                            onChange={(e) => handleChargeSocialeChange('taux', parseFloat(e.target.value))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="majorations">Majorations</Label>
                                <Input
                                    id="majorations"
                                    type="number"
                                    step="0.01"
                                    value={chargeSociale.majorations || ''}
                                    onChange={(e) => handleChargeSocialeChange('majorations', parseFloat(e.target.value))}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="penalites">Pénalités</Label>
                                <Input
                                    id="penalites"
                                    type="number"
                                    step="0.01"
                                    value={chargeSociale.penalites || ''}
                                    onChange={(e) => handleChargeSocialeChange('penalites', parseFloat(e.target.value))}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dateEcheance">Date d'échéance</Label>
                                <Input
                                    id="dateEcheance"
                                    type="date"
                                    value={chargeSociale.dateEcheance || ''}
                                    onChange={(e) => handleChargeSocialeChange('dateEcheance', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="devise">Devise</Label>
                                <Select
                                    value={chargeSociale.deviseId?.toString() || ''}
                                    onValueChange={(value) => handleChargeSocialeChange('deviseId', parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une devise" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {devises.map((devise) => (
                                            <SelectItem key={devise.id} value={devise.id.toString()}>
                                                {devise.code} - {devise.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="compteId">Compte comptable</Label>
                                <Select
                                    value={chargeSociale.compteId?.toString() || ''}
                                    onValueChange={(value) => handleChargeSocialeChange('compteId', parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un compte" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {planComptable
                                            .filter(pc => pc.codeCompte?.startsWith('64') || pc.codeCompte?.startsWith('63'))
                                            .map((compte) => (
                                                <SelectItem key={compte.id} value={compte.id.toString()}>
                                                    {compte.codeCompte} - {compte.intitule}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="reference">Référence</Label>
                                <Input
                                    id="reference"
                                    value={chargeSociale.reference || ''}
                                    onChange={(e) => handleChargeSocialeChange('reference', e.target.value)}
                                    placeholder="Référence interne"
                                />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="numeroAffiliation">Numéro d'affiliation</Label>
                                <Input
                                    id="numeroAffiliation"
                                    value={chargeSociale.numeroAffiliation || ''}
                                    onChange={(e) => handleChargeSocialeChange('numeroAffiliation', e.target.value)}
                                    placeholder="Numéro d'affiliation à l'organisme"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="regulier"
                                        checked={chargeSociale.regulier}
                                        onCheckedChange={(checked) => handleChargeSocialeChange('regulier', checked)}
                                    />
                                    <Label htmlFor="regulier">Régulier</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="active"
                                        checked={chargeSociale.active}
                                        onCheckedChange={(checked) => handleChargeSocialeChange('active', checked)}
                                    />
                                    <Label htmlFor="active">Actif</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "autre":
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Créer un autre paiement</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="autre-beneficiaire">Bénéficiaire</Label>
                                <Input
                                    id="autre-beneficiaire"
                                    value={autrePaiement.beneficiaire}
                                    onChange={(e) => handleAutrePaiementChange('beneficiaire', e.target.value)}
                                    placeholder="Nom du bénéficiaire"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="autre-date">Date</Label>
                                <Input
                                    id="autre-date"
                                    type="date"
                                    value={autrePaiement.date}
                                    onChange={(e) => handleAutrePaiementChange('date', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="autre-categorie">Catégorie</Label>
                                <Select
                                    value={autrePaiement.categorie}
                                    onValueChange={(value) => handleAutrePaiementChange('categorie', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une catégorie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="divers">Divers</SelectItem>
                                        <SelectItem value="location">Location</SelectItem>
                                        <SelectItem value="abonnement">Abonnement</SelectItem>
                                        <SelectItem value="fourniture">Fournitures</SelectItem>
                                        <SelectItem value="service">Services</SelectItem>
                                        <SelectItem value="autre">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="autre-montant">Montant</Label>
                                <Input
                                    id="autre-montant"
                                    type="number"
                                    step="0.01"
                                    value={autrePaiement.montant || ''}
                                    onChange={(e) => handleAutrePaiementChange('montant', parseFloat(e.target.value))}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="autre-objet">Objet</Label>
                                <Input
                                    id="autre-objet"
                                    value={autrePaiement.objet || ''}
                                    onChange={(e) => handleAutrePaiementChange('objet', e.target.value)}
                                    placeholder="Objet du paiement"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="autre-devise">Devise</Label>
                                <Select
                                    value={autrePaiement.deviseId?.toString() || ''}
                                    onValueChange={(value) => handleAutrePaiementChange('deviseId', parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une devise" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {devises.map((devise) => (
                                            <SelectItem key={devise.id} value={devise.id.toString()}>
                                                {devise.code} - {devise.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="autre-compte">Compte comptable</Label>
                                <Select
                                    value={autrePaiement.compteComptableId?.toString() || ''}
                                    onValueChange={(value) => handleAutrePaiementChange('compteComptableId', parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un compte" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {planComptable.map((compte) => (
                                            <SelectItem key={compte.id} value={compte.id.toString()}>
                                                {compte.codeCompte} - {compte.intitule}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                );

            // Ajouter les autres cas pour avance, impot, note, paie, diem...

            default:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Formulaire {dialogType}</h3>
                        <Alert>
                            <AlertDescription>
                                Le formulaire pour {dialogType} est en cours de développement.
                            </AlertDescription>
                        </Alert>
                    </div>
                );
        }
    };

    const renderOperationSpecificSection = () => {
        switch (ordre.typeOperation) {
            case "facture":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Factures à régler</span>
                                <Button size="sm" onClick={handleAjouterFacture} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Ajouter des factures
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedFactures.length === 0 ? (
                                <Alert>
                                    <AlertDescription>
                                        Aucune facture sélectionnée. Cliquez sur "Ajouter des factures" pour en sélectionner.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <div className="space-y-4">
                                    <div className="border rounded-lg">
                                        <div className="grid grid-cols-5 gap-4 p-4 bg-muted font-medium">
                                            <div>Numéro</div>
                                            <div>Tiers</div>
                                            <div>Date</div>
                                            <div>Montant</div>
                                            <div>Action</div>
                                        </div>
                                        {selectedFactures.map((facture) => (
                                            <div key={facture.id} className="grid grid-cols-5 gap-4 p-4 border-t">
                                                <div className="font-medium">{facture.numero}</div>
                                                <div>{facture.tiers?.intitule}</div>
                                                <div>{new Date(facture.dateEmission).toLocaleDateString()}</div>
                                                <div>{facture.montantTotal.toLocaleString()} €</div>
                                                <div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleFactureSelection(facture, false)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Alert>
                                        <AlertDescription className="flex justify-between items-center">
                                            <span>Montant total des factures sélectionnées:</span>
                                            <span className="font-bold text-lg">{montantTotal.toLocaleString()} €</span>
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );

            case "charge_sociale":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Charges sociales</span>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => loadExistingItems('charge_sociale')}>
                                        Actualiser
                                    </Button>
                                    <Button size="sm" onClick={handleCreateChargeSocialeDialog} className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Ajouter une charge
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {existingItems.length === 0 ? (
                                <Alert>
                                    <AlertDescription>
                                        Aucune charge sociale associée. Cliquez sur "Ajouter une charge" pour en créer une.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <div className="space-y-4">
                                    <div className="border rounded-lg">
                                        <div className="grid grid-cols-7 gap-4 p-4 bg-muted font-medium">
                                            <div>Organisme</div>
                                            <div>Type</div>
                                            <div>Référence</div>
                                            <div>Période</div>
                                            <div>Montant</div>
                                            <div>Statut</div>
                                            <div>Actions</div>
                                        </div>
                                        {existingItems.map((item) => (
                                            <div key={item.id} className="grid grid-cols-7 gap-4 p-4 border-t">
                                                <div>{item.organismeLibelle || item.organisme}</div>
                                                <div>{item.typeChargeLibelle || item.typeCharge}</div>
                                                <div>{item.reference || '-'}</div>
                                                <div>{item.periodeLibelle || item.periode}</div>
                                                <div>{item.montantTotalFormate || `${item.montantBase} €`}</div>
                                                <div>
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        item.statut === 'brouillon' ? 'bg-gray-100 text-gray-800' :
                                                            item.statut === 'calcule' ? 'bg-blue-100 text-blue-800' :
                                                                item.statut === 'declare' ? 'bg-yellow-100 text-yellow-800' :
                                                                    item.statut === 'paye' ? 'bg-green-100 text-green-800' :
                                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {item.statutLibelle || item.statut}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleAssocierItem(item.id, 'charge')}
                                                    >
                                                        Associer
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );

            case "salaire":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Paiement de salaires</span>
                                <Button size="sm" onClick={handleCreatePaieDialog} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Ajouter une paie
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertDescription>
                                    Utilisez le bouton "Ajouter une paie" pour créer les bulletins de salaire.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                );

            case "avance":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Avances sur salaire</span>
                                <Button size="sm" onClick={handleCreateAvanceSalaireDialog} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Ajouter une avance
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertDescription>
                                    Utilisez le bouton "Ajouter une avance" pour créer une avance sur salaire.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                );

            case "impot":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Impôts et taxes</span>
                                <Button size="sm" onClick={handleCreateImpotTaxeDialog} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Ajouter un impôt/taxe
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertDescription>
                                    Utilisez le bouton "Ajouter un impôt/taxe" pour déclarer un impôt ou une taxe à payer.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                );

            case "note_frais":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Notes de frais</span>
                                <Button size="sm" onClick={handleCreateNoteFraisDialog} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Ajouter une note de frais
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertDescription>
                                    Utilisez le bouton "Ajouter une note de frais" pour créer une note de frais à rembourser.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                );

            case "per_diem":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Per diems</span>
                                <Button size="sm" onClick={handleCreatePerDiemDialog} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Ajouter un per diem
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertDescription>
                                    Utilisez le bouton "Ajouter un per diem" pour créer une indemnité de mission.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                );

            case "autre":
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Autres paiements</span>
                                <Button size="sm" onClick={handleCreateAutrePaiementDialog} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Ajouter un autre paiement
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertDescription>
                                    Utilisez le bouton "Ajouter un autre paiement" pour créer des paiements divers.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                );

            default:
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Détails de l'opération</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertDescription>
                                    Sélectionnez un type d'opération dans les informations générales pour afficher les détails.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                );
        }
    };

    const renderModePaiementFields = () => {
        switch (ordre.modePaiement) {
            case "virement":
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="iban">IBAN</Label>
                            <Input
                                id="iban"
                                value={ordre.iban || ''}
                                onChange={(e) => handleInputChange('iban', e.target.value)}
                                placeholder="FR76 XXXX XXXX XXXX XXXX XXX"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bic">BIC</Label>
                            <Input
                                id="bic"
                                value={ordre.bic || ''}
                                onChange={(e) => handleInputChange('bic', e.target.value)}
                                placeholder="XXXXXXXXXXX"
                            />
                        </div>
                    </div>
                );

            case "cheque":
                return (
                    <div className="space-y-2">
                        <Label htmlFor="beneficiaireCheque">Bénéficiaire du chèque</Label>
                        <Input
                            id="beneficiaireCheque"
                            value={ordre.nomTiers || ''}
                            onChange={(e) => handleInputChange('nomTiers', e.target.value)}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    const handleDialogSubmit = () => {
        switch (dialogType) {
            case "charge":
                handleCreateChargeSociale();
                break;
            case "autre":
                handleCreateAutrePaiement();
                break;
            case "avance":
                handleCreateAvanceSalaire();
                break;
            case "impot":
                handleCreateImpotTaxe();
                break;
            case "note":
                handleCreateNoteFrais();
                break;
            case "paie":
                handleCreatePaie();
                break;
            case "diem":
                handleCreatePerDiem();
                break;
            case "facture":
                setShowDialog(false);
                break;
            default:
                setShowDialog(false);
        }
    };

    // Afficher un état de chargement pendant l'initialisation
    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Chargement des données...</p>
                </div>
            </div>
        );
    }

    // Afficher une erreur si le chargement a échoué
    if (apiError) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Ordre de Paiement</h1>
                        <p className="text-muted-foreground">Création et gestion des ordres de paiement</p>
                    </div>
                </div>

                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <div className="space-y-2">
                            <p>Erreur lors du chargement des données : {apiError}</p>
                            <p className="text-sm">Veuillez vérifier :</p>
                            <ul className="text-sm list-disc list-inside ml-2">
                                <li>Votre connexion internet</li>
                                <li>Votre authentification (token JWT valide)</li>
                                <li>Que les endpoints API sont corrects</li>
                            </ul>
                            <Button
                                onClick={fetchInitialData}
                                variant="outline"
                                size="sm"
                                className="mt-2"
                            >
                                Réessayer
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Ordre de Paiement</h1>
                    <p className="text-muted-foreground">Création et gestion des ordres de paiement</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" />
                        Imprimer
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                    {ordre.id && ordre.statut === "brouillon" && (
                        <Button onClick={handleSoumettre} variant="secondary" disabled={loading} className="gap-2">
                            <Send className="w-4 h-4" />
                            Soumettre
                        </Button>
                    )}
                </div>
            </div>

            {/* Statut */}
            {ordre.id && (
                <div className="flex items-center gap-2">
                    <span className="font-medium">Statut:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        ordre.statut === 'brouillon' ? 'bg-gray-100 text-gray-800' :
                            ordre.statut === 'soumis' ? 'bg-blue-100 text-blue-800' :
                                ordre.statut === 'valide' ? 'bg-green-100 text-green-800' :
                                    ordre.statut === 'paye' ? 'bg-purple-100 text-purple-800' :
                                        ordre.statut === 'rejete' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                    }`}>
                        {ordre.statut.toUpperCase()}
                    </span>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">Informations générales</TabsTrigger>
                    <TabsTrigger value="operation">Détails de l'opération</TabsTrigger>
                    <TabsTrigger value="paiement">Informations de paiement</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations générales</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="numeroOrdre">N° Ordre</Label>
                                    <Input
                                        id="numeroOrdre"
                                        value={ordre.numeroOrdre}
                                        onChange={(e) => handleInputChange('numeroOrdre', e.target.value)}
                                        placeholder="Généré automatiquement"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={ordre.date}
                                        onChange={(e) => handleInputChange('date', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="emetteur">Émetteur</Label>
                                    <Input
                                        id="emetteur"
                                        value={ordre.emetteur}
                                        onChange={(e) => handleInputChange('emetteur', e.target.value)}
                                        placeholder="Nom de l'émetteur"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="societe">Société</Label>
                                    <Select
                                        value={ordre.societeId?.toString() || ''}
                                        onValueChange={(value) => handleInputChange('societeId', parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner une société" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {societes.map((societe) => (
                                                <SelectItem key={societe.id} value={societe.id.toString()}>
                                                    {societe.raisonSociale}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="typeOperation">Type d'opération</Label>
                                    <Select
                                        value={ordre.typeOperation}
                                        onValueChange={(value) => handleInputChange('typeOperation', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner le type d'opération" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="facture">Règlement Facture</SelectItem>
                                            <SelectItem value="salaire">Paie Salaires</SelectItem>
                                            <SelectItem value="avance">Avances sur salaire</SelectItem>
                                            <SelectItem value="impot">Impôts et taxes</SelectItem>
                                            <SelectItem value="charge_sociale">Charges sociales</SelectItem>
                                            <SelectItem value="note_frais">Note de frais</SelectItem>
                                            <SelectItem value="per_diem">Per diem</SelectItem>
                                            <SelectItem value="autre">Autres paiements</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="comptePaiement">Compte de paiement</Label>
                                    <Select
                                        value={ordre.comptePaiementId?.toString() || ''}
                                        onValueChange={(value) => handleInputChange('comptePaiementId', parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un compte" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {comptesTresorerie.map((compte) => (
                                                <SelectItem key={compte.id} value={compte.id.toString()}>
                                                    {compte.intitule} ({compte.numeroCompte})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="devise">Devise</Label>
                                    <Select
                                        value={ordre.deviseId?.toString() || ''}
                                        onValueChange={(value) => handleInputChange('deviseId', parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner une devise" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {devises.map((devise) => (
                                                <SelectItem key={devise.id} value={devise.id.toString()}>
                                                    {devise.code} - {devise.nom}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="montant">Montant</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="montant"
                                            type="number"
                                            step="0.01"
                                            value={ordre.montant || ''}
                                            onChange={(e) => handleInputChange('montant', parseFloat(e.target.value) || 0)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="operation">
                    {ordre.typeOperation ? (
                        renderOperationSpecificSection()
                    ) : (
                        <Alert>
                            <AlertDescription>
                                Sélectionnez d'abord un type d'opération dans les informations générales.
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                <TabsContent value="paiement">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations de paiement</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="modePaiement">Mode de paiement</Label>
                                    <Select
                                        value={ordre.modePaiement}
                                        onValueChange={(value) => handleInputChange('modePaiement', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un mode de paiement" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="virement">Virement bancaire</SelectItem>
                                            <SelectItem value="cheque">Chèque</SelectItem>
                                            <SelectItem value="especes">Espèces</SelectItem>
                                            <SelectItem value="mobile_money">Mobile Money</SelectItem>
                                            <SelectItem value="carte">Carte bancaire</SelectItem>
                                            <SelectItem value="prelevement">Prélèvement</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {ordre.modePaiement === "virement" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="banqueBeneficiaire">Banque bénéficiaire</Label>
                                        <Select
                                            value={ordre.banqueBeneficiaireId?.toString() || ''}
                                            onValueChange={(value) => handleInputChange('banqueBeneficiaireId', parseInt(value))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une banque" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {banques.map((banque) => (
                                                    <SelectItem key={banque.id} value={banque.id.toString()}>
                                                        {banque.nom}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {renderModePaiementFields()}

                            <div className="space-y-2">
                                <Label htmlFor="referencePaiement">Référence paiement</Label>
                                <Input
                                    id="referencePaiement"
                                    value={ordre.referencePaiement || ''}
                                    onChange={(e) => handleInputChange('referencePaiement', e.target.value)}
                                    placeholder="Numéro de référence"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description / Notes</Label>
                                <Textarea
                                    id="description"
                                    value={ordre.description || ''}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder="Description complémentaire du paiement"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === "facture" && "Ajouter des factures"}
                            {dialogType === "autre" && "Créer un autre paiement"}
                            {dialogType === "avance" && "Créer une avance sur salaire"}
                            {dialogType === "impot" && "Créer un impôt/taxe"}
                            {dialogType === "note" && "Créer une note de frais"}
                            {dialogType === "paie" && "Créer une paie"}
                            {dialogType === "diem" && "Créer un per diem"}
                            {dialogType === "charge" && "Créer une charge sociale"}
                        </DialogTitle>
                    </DialogHeader>
                    {renderDialogContent()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleDialogSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Création...
                                </>
                            ) : dialogType === "facture" ? "Fermer" : "Valider"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OrdrePaiement;