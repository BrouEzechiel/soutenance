import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
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
import {
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    CheckCircle,
    XCircle,
    RefreshCw,
    Info,
    DollarSign,
    TrendingUp,
    Download,
    Globe,
    AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://127.0.0.1:8000/api/devises";

interface Devise {
    id: number;
    code: string;
    intitule: string;
    symbole: string | null;
    tauxChange: string | null;
    deviseReference: boolean;
    dateMiseAJourTaux: string | null;
    statut: string;
    createdAt: string;
    updatedAt: string;
    utilisable?: boolean;
}

interface FormState {
    code: string;
    intitule: string;
    symbole: string;
    tauxChange: string;
    deviseReference: boolean;
    statut: string;
}

const GestionDevises = () => {
    const { toast } = useToast();
    const [devises, setDevises] = useState<Devise[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSupportedCurrencies, setLoadingSupportedCurrencies] = useState(true);
    const [updatingRates, setUpdatingRates] = useState(false);
    const [deviseReference, setDeviseReference] = useState<Devise | null>(null);
    const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<FormState>({
        code: "",
        intitule: "",
        symbole: "",
        tauxChange: "",
        deviseReference: false,
        statut: "ACTIF",
    });

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deviseToDelete, setDeviseToDelete] = useState<Devise | null>(null);
    const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
    const [deviseToReference, setDeviseToReference] = useState<Devise | null>(null);
    const [updateRateDialogOpen, setUpdateRateDialogOpen] = useState(false);
    const [deviseToUpdateRate, setDeviseToUpdateRate] = useState<Devise | null>(null);

    const token = localStorage.getItem("token") ?? "";

    // Charger les devises supportées par l'API
    useEffect(() => {
        const fetchSupportedCurrencies = async () => {
            if (!token) return;
            setLoadingSupportedCurrencies(true);
            try {
                const res = await fetch(`${API_URL}/supported-currencies`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                let data: any;
                try {
                    data = await res.json();
                } catch {
                    data = null;
                }

                if (res.ok && data) {
                    if (data.success && Array.isArray(data.devises)) {
                        setSupportedCurrencies(data.devises);
                    } else if (Array.isArray(data)) {
                        setSupportedCurrencies(data);
                    } else if (data.devises && Array.isArray(data.devises)) {
                        setSupportedCurrencies(data.devises);
                    } else {
                        // Fallback si la structure n'est pas reconnue
                        console.warn("Structure de données non reconnue pour les devises supportées:", data);
                        setSupportedCurrencies(['EUR', 'USD', 'XOF', 'MGA', 'GBP', 'JPY']);
                    }
                } else {
                    // En cas d'erreur 404/500, utiliser une liste par défaut
                    console.warn("Erreur chargement devises supportées:", data?.message || `Status ${res.status}`);
                    setSupportedCurrencies(['EUR', 'USD', 'XOF', 'MGA', 'GBP', 'JPY']);
                }
            } catch (err) {
                console.error("Erreur chargement devises supportées:", err);
                // Liste de fallback en cas d'erreur réseau
                setSupportedCurrencies(['EUR', 'USD', 'XOF', 'MGA']);
            } finally {
                setLoadingSupportedCurrencies(false);
            }
        };
        fetchSupportedCurrencies();
    }, [token]);

    const resetForm = () => {
        setEditingId(null);
        setForm({
            code: "",
            intitule: "",
            symbole: "",
            tauxChange: "",
            deviseReference: false,
            statut: "ACTIF",
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
    };

    const fetchDevises = async () => {
        if (!token) return handleUnauthorized();
        try {
            setLoading(true);
            const res = await fetch(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401) return handleUnauthorized();

            // Gérer les réponses non-JSON
            let data: any;
            try {
                data = await res.json();
            } catch (jsonError) {
                console.error("Erreur parsing JSON:", jsonError);
                throw new Error("Réponse serveur invalide");
            }

            if (!res.ok) {
                throw new Error(data?.message || data?.error || `Erreur ${res.status}`);
            }

            // Adapter selon la structure de la réponse
            let devisesData: any[] = [];
            if (Array.isArray(data)) {
                devisesData = data;
            } else if (data.data && Array.isArray(data.data)) {
                devisesData = data.data;
            } else if (data.success && Array.isArray(data.data)) {
                devisesData = data.data;
            }

            const typedData: Devise[] = devisesData.map((d: any) => {
                const deviseRef = d.deviseReference != null
                    ? Boolean(d.deviseReference)
                    : false;

                return {
                    id: d.id,
                    code: d.code || "",
                    intitule: d.intitule || "",
                    symbole: d.symbole ?? null,
                    tauxChange: d.tauxChange ?? null,
                    deviseReference: deviseRef,
                    dateMiseAJourTaux: d.dateMiseAJourTaux ?? null,
                    statut: d.statut || "ACTIF",
                    utilisable: d.utilisable !== undefined ? d.utilisable : true,
                    createdAt: d.createdAt || new Date().toISOString(),
                    updatedAt: d.updatedAt || new Date().toISOString()
                };
            });

            setDevises(typedData);

            const reference = typedData.find((d: Devise) => d.deviseReference);
            setDeviseReference(reference || null);

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de charger les devises.",
                variant: "destructive"
            });
            setDevises([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevises();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;

        if (id === "code") {
            const upperValue = value.toUpperCase().slice(0, 3);
            setForm({ ...form, [id]: upperValue });
            return;
        }

        setForm({ ...form, [id]: value });
    };

    const handleSwitchChange = (checked: boolean) => {
        setForm({
            ...form,
            deviseReference: checked,
            tauxChange: checked ? "1.000000" : form.tauxChange
        });
    };

    const validateForm = (): string[] => {
        const errors: string[] = [];

        if (!form.code || form.code.length !== 3) {
            errors.push("Le code devise doit contenir exactement 3 caractères");
        }

        if (!/^[A-Z]{3}$/.test(form.code)) {
            errors.push("Le code devise doit être en majuscules (ex: EUR, USD)");
        }

        if (!form.intitule.trim()) {
            errors.push("L'intitulé est obligatoire");
        }

        if (!form.deviseReference) {
            if (!form.tauxChange || parseFloat(form.tauxChange) <= 0) {
                errors.push("Le taux de change est obligatoire et doit être supérieur à 0");
            }
        }

        // Vérifier si la devise est supportée par l'API
        if (supportedCurrencies.length > 0 && !supportedCurrencies.includes(form.code)) {
            errors.push(`La devise ${form.code} n'est pas supportée par le service de taux de change`);
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

        const payload = {
            code: form.code,
            intitule: form.intitule,
            symbole: form.symbole || null,
            deviseReference: form.deviseReference,
            statut: form.statut,
            tauxChange: form.deviseReference ? "1.000000" : (form.tauxChange || null)
        };

        try {
            const res = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.status === 401) return handleUnauthorized();

            let data: any;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                const msg = data?.errors
                    ? (Array.isArray(data.errors)
                        ? data.errors.join(" • ")
                        : Object.values(data.errors).flat().join(" • "))
                    : data?.message || data?.error || `Erreur ${res.status}`;
                return toast({
                    title: "Erreur",
                    description: msg,
                    variant: "destructive"
                });
            }

            toast({
                title: editingId ? "Devise modifiée" : "Devise créée",
                description: data?.message || "Opération réussie"
            });

            resetForm();
            setShowForm(false);
            fetchDevises();

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible d'enregistrer",
                variant: "destructive"
            });
        }
    };

    const handleEdit = (devise: Devise) => {
        if (devise.statut === "INACTIF") {
            toast({
                title: "Attention",
                description: "Une devise inactive ne peut être modifiée que pour la réactiver.",
                variant: "default"
            });
        }

        setForm({
            code: devise.code,
            intitule: devise.intitule,
            symbole: devise.symbole || "",
            tauxChange: devise.tauxChange || "",
            deviseReference: devise.deviseReference,
            statut: devise.statut,
        });
        setEditingId(devise.id);
        setShowForm(true);
    };

    const handleSetAsReference = async (devise: Devise) => {
        if (!token) return handleUnauthorized();

        try {
            const res = await fetch(`${API_URL}/${devise.id}/set-reference`, {
                method: "PUT",
                headers: authHeaders()
            });

            if (res.status === 401) return handleUnauthorized();

            let data: any;
            try {
                data = await res.json();
            } catch (err) {
                console.error("Erreur parsing JSON:", err);
                return toast({
                    title: "Erreur serveur",
                    description: "Réponse invalide du serveur",
                    variant: "destructive"
                });
            }

            if (!res.ok) {
                return toast({
                    title: "Erreur",
                    description: data?.message || data?.error || `Erreur ${res.status}`,
                    variant: "destructive"
                });
            }

            toast({
                title: "Devise de référence mise à jour",
                description: `${devise.code} est maintenant la devise de référence`
            });

            fetchDevises();
            setReferenceDialogOpen(false);

        } catch (err) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de modifier la devise de référence",
                variant: "destructive"
            });
        }
    };

    // Mettre à jour tous les taux de change depuis l'API
    const handleUpdateAllRates = async () => {
        if (!token) return handleUnauthorized();

        setUpdatingRates(true);
        try {
            const res = await fetch(`${API_URL}/update-rates`, {
                method: "POST",
                headers: authHeaders()
            });

            if (res.status === 401) return handleUnauthorized();

            let data: any;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                throw new Error(data?.message || data?.error || `Erreur ${res.status}`);
            }

            toast({
                title: "Taux mis à jour",
                description: data?.message || "Les taux de change ont été mis à jour avec succès"
            });

            fetchDevises();

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de mettre à jour les taux",
                variant: "destructive"
            });
        } finally {
            setUpdatingRates(false);
        }
    };

    // Mettre à jour le taux d'une devise spécifique
    const handleUpdateSingleRate = async (devise: Devise) => {
        if (!token) return handleUnauthorized();

        try {
            const res = await fetch(`${API_URL}/${devise.id}/update-rate`, {
                method: "PUT",
                headers: authHeaders()
            });

            if (res.status === 401) return handleUnauthorized();

            let data: any;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                throw new Error(data?.message || data?.error || `Erreur ${res.status}`);
            }

            toast({
                title: "Taux mis à jour",
                description: data?.message || `Le taux de ${devise.code} a été mis à jour`
            });

            fetchDevises();
            setUpdateRateDialogOpen(false);

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de mettre à jour le taux",
                variant: "destructive"
            });
        }
    };

    // Nettoyer le cache des taux
    const handleClearCache = async () => {
        if (!token) return handleUnauthorized();

        try {
            const res = await fetch(`${API_URL}/clear-cache`, {
                method: "POST",
                headers: authHeaders()
            });

            if (res.status === 401) return handleUnauthorized();

            let data: any;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                throw new Error(data?.message || data?.error || `Erreur ${res.status}`);
            }

            toast({
                title: "Cache nettoyé",
                description: data?.message || "Le cache des taux de change a été nettoyé"
            });

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible de nettoyer le cache",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async () => {
        if (!deviseToDelete || !token) return;

        try {
            const res = await fetch(`${API_URL}/${deviseToDelete.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401) return handleUnauthorized();

            let data: any;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                const errorMsg = data?.message || data?.error || data?.errors || `Erreur ${res.status}`;

                if (res.status === 400 && errorMsg.includes("utilisée")) {
                    toast({
                        title: "Devise utilisée",
                        description: "La devise ne peut être supprimée car elle est utilisée. Voulez-vous la désactiver ?",
                        variant: "destructive",
                        action: (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDesactiver(deviseToDelete.id)}
                            >
                                Désactiver
                            </Button>
                        )
                    });
                    return;
                }

                return toast({
                    title: "Erreur",
                    description: errorMsg,
                    variant: "destructive"
                });
            }

            toast({
                title: "Devise supprimée",
                description: data?.message || "Opération réussie"
            });

            fetchDevises();
            setDeleteDialogOpen(false);
            setDeviseToDelete(null);

        } catch (err) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de supprimer la devise",
                variant: "destructive"
            });
        }
    };

    const handleDesactiver = async (id: number) => {
        if (!token) return handleUnauthorized();

        try {
            const res = await fetch(`${API_URL}/${id}/desactiver`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ statut: "INACTIF" })
            });

            if (res.status === 401) return handleUnauthorized();

            let data: any;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                const errorMsg = data?.message || data?.error || data?.errors || `Erreur ${res.status}`;
                return toast({
                    title: "Erreur",
                    description: errorMsg,
                    variant: "destructive"
                });
            }

            toast({
                title: "Devise désactivée",
                description: data?.message || "La devise a été désactivée avec succès"
            });

            fetchDevises();

        } catch (err) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de désactiver la devise",
                variant: "destructive"
            });
        }
    };

    const handleReactiver = async (id: number) => {
        if (!token) return handleUnauthorized();

        try {
            const res = await fetch(`${API_URL}/${id}/reactiver`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ statut: "ACTIF" })
            });

            if (res.status === 401) return handleUnauthorized();

            let data: any;
            try {
                data = await res.json();
            } catch {
                data = null;
            }

            if (!res.ok) {
                const errorMsg = data?.message || data?.error || data?.errors || `Erreur ${res.status}`;
                return toast({
                    title: "Erreur",
                    description: errorMsg,
                    variant: "destructive"
                });
            }

            toast({
                title: "Devise réactivée",
                description: data?.message || "La devise a été réactivée avec succès"
            });

            fetchDevises();

        } catch (err) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de réactiver la devise",
                variant: "destructive"
            });
        }
    };

    const getStatutBadge = (devise: Devise) => {
        if (devise.deviseReference) {
            return (
                <Badge variant="default" className="bg-purple-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> Référence
                </Badge>
            );
        }

        if (devise.statut === "ACTIF") {
            return (
                <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> Actif
                </Badge>
            );
        }

        return (
            <Badge variant="outline" className="bg-gray-100 text-gray-700">
                <XCircle className="w-3 h-3 mr-1" /> Inactif
            </Badge>
        );
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return "-";
        }
    };

    const formatTauxChange = (taux: string | null) => {
        if (!taux) return "-";
        try {
            return parseFloat(taux).toFixed(6);
        } catch {
            return "-";
        }
    };

    const isDeviseSupported = (code: string) => {
        return supportedCurrencies.length === 0 || supportedCurrencies.includes(code);
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Gestion des Devises</h1>
                        <p className="text-muted-foreground">
                            Configuration des devises et taux de change via API externe
                        </p>

                        {deviseReference && (
                            <div className="mt-2">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    <Info className="w-3 h-3 mr-1" />
                                    Devise de référence : {deviseReference.code} ({deviseReference.intitule})
                                </Badge>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUpdateAllRates}
                            disabled={updatingRates || devises.length === 0}
                            className="gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${updatingRates ? 'animate-spin' : ''}`} />
                            Mettre à jour les taux
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearCache}
                            className="gap-2"
                            title="Nettoyer le cache des taux"
                        >
                            <Trash2 className="w-4 h-4" />
                            Nettoyer cache
                        </Button>
                        <Button
                            className="gap-2"
                            onClick={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Nouvelle devise
                        </Button>
                    </div>
                </div>

                {/* Carte d'information API */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <Globe className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-800 mb-2">Taux de change en temps réel</h3>
                                <p className="text-sm text-blue-700 mb-3">
                                    Les taux de change sont récupérés depuis un service externe (ExchangeRate-API).
                                    Vous pouvez mettre à jour manuellement les taux ou configurer une mise à jour automatique.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="bg-white text-blue-700">
                                        <Download className="w-3 h-3 mr-1" />
                                        {loadingSupportedCurrencies ? (
                                            <span className="flex items-center">
                                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                                Chargement...
                                            </span>
                                        ) : (
                                            `${supportedCurrencies.length} devises supportées`
                                        )}
                                    </Badge>
                                    <Badge variant="outline" className="bg-white text-blue-700">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        Mise à jour quotidienne
                                    </Badge>
                                    <Badge variant="outline" className="bg-white text-blue-700">
                                        <DollarSign className="w-3 h-3 mr-1" />
                                        Devise de référence : {deviseReference?.code || "EUR"}
                                    </Badge>
                                </div>
                                {supportedCurrencies.length === 0 && !loadingSupportedCurrencies && (
                                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                                        <p className="text-sm text-amber-700 flex items-center">
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            L'API des devises supportées n'est pas disponible. Utilisation de la liste par défaut.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {showForm && (
                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {editingId ? "Modifier une devise" : "Créer une devise"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="code">
                                            Code ISO 4217 *
                                            <span className="text-xs text-muted-foreground ml-1">
                                                (ex: EUR, USD, XOF)
                                            </span>
                                        </Label>
                                        <Input
                                            id="code"
                                            value={form.code}
                                            onChange={handleChange}
                                            placeholder="EUR"
                                            maxLength={3}
                                            className="uppercase"
                                            required
                                            disabled={editingId !== null}
                                        />
                                        {form.code && !isDeviseSupported(form.code) && (
                                            <p className="text-sm text-amber-600">
                                                ⚠️ Cette devise n'est pas supportée par l'API de taux de change
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="intitule">
                                            Intitulé *
                                            <span className="text-xs text-muted-foreground ml-1">
                                                (ex: Euro, Dollar US)
                                            </span>
                                        </Label>
                                        <Input
                                            id="intitule"
                                            value={form.intitule}
                                            onChange={handleChange}
                                            placeholder="Euro"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="symbole">Symbole</Label>
                                        <Input
                                            id="symbole"
                                            value={form.symbole}
                                            onChange={handleChange}
                                            placeholder="€, $, CFA..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tauxChange">
                                            Taux de change
                                            {!form.deviseReference && <span className="text-red-500 ml-1">*</span>}
                                        </Label>
                                        <Input
                                            id="tauxChange"
                                            type="number"
                                            step="0.000001"
                                            value={form.tauxChange}
                                            onChange={handleChange}
                                            placeholder="1.000000"
                                            disabled={form.deviseReference}
                                            required={!form.deviseReference}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Par rapport à la devise de référence (1 {form.code} = ? {deviseReference?.code || "REF"})
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="deviseReference"
                                            checked={form.deviseReference}
                                            onCheckedChange={handleSwitchChange}
                                            disabled={!!deviseReference && !form.deviseReference && !editingId}
                                        />
                                        <Label htmlFor="deviseReference" className="cursor-pointer">
                                            Définir comme devise de référence
                                        </Label>
                                    </div>

                                    {deviseReference && !form.deviseReference && !editingId && (
                                        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                                            <Info className="w-4 h-4 inline mr-2" />
                                            Une devise de référence existe déjà ({deviseReference.code}).
                                            Vous ne pouvez pas créer une autre devise de référence.
                                        </div>
                                    )}

                                    {form.deviseReference && (
                                        <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                                            <CheckCircle className="w-4 h-4 inline mr-2" />
                                            Cette devise sera la référence du système. Le taux de change est automatiquement fixé à 1.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Statut</Label>
                                    <Select
                                        value={form.statut}
                                        onValueChange={(value) => setForm({...form, statut: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIF">Actif</SelectItem>
                                            <SelectItem value="INACTIF">Inactif</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {editingId && (
                                    <div className="text-sm text-muted-foreground">
                                        <p>⚠️ Note : Le code devise ne peut pas être modifié après création.</p>
                                    </div>
                                )}

                                <Separator />

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
                                        <X className="w-4 h-4 mr-2" />
                                        Annuler
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Liste des devises</CardTitle>
                            <div className="text-sm text-muted-foreground">
                                {devises.length} devise{devises.length > 1 ? 's' : ''}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="text-muted-foreground mt-2">Chargement des devises...</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Intitulé</TableHead>
                                            <TableHead>Symbole</TableHead>
                                            <TableHead>Taux de change</TableHead>
                                            <TableHead>Mise à jour</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {devises.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8">
                                                    <p className="text-muted-foreground">
                                                        Aucune devise configurée
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        className="mt-2"
                                                        onClick={() => setShowForm(true)}
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Créer la première devise
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            devises.map((devise) => (
                                                <TableRow key={devise.id} className="hover:bg-muted/50">
                                                    <TableCell className="font-mono font-bold">
                                                        <div className="flex items-center gap-2">
                                                            {devise.code}
                                                            {!isDeviseSupported(devise.code) && (
                                                                <Badge variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700">
                                                                    <AlertTriangle className="w-2 h-2 mr-1" />
                                                                    API
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {devise.intitule}
                                                    </TableCell>
                                                    <TableCell>
                                                        {devise.symbole || "-"}
                                                    </TableCell>
                                                    <TableCell className="font-mono">
                                                        <div className="flex flex-col">
                                                            <span>{formatTauxChange(devise.tauxChange)}</span>
                                                            {devise.deviseReference && (
                                                                <span className="text-xs text-purple-600">(référence)</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {formatDate(devise.dateMiseAJourTaux)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatutBadge(devise)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {!devise.deviseReference && devise.statut === "ACTIF" && (
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setDeviseToUpdateRate(devise);
                                                                            setUpdateRateDialogOpen(true);
                                                                        }}
                                                                        title="Mettre à jour le taux depuis l'API"
                                                                    >
                                                                        <RefreshCw className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setDeviseToReference(devise);
                                                                            setReferenceDialogOpen(true);
                                                                        }}
                                                                        title="Définir comme référence"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEdit(devise)}
                                                                title="Modifier"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>

                                                            {devise.statut === "ACTIF" ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDesactiver(devise.id)}
                                                                    title="Désactiver"
                                                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleReactiver(devise.id)}
                                                                    title="Réactiver"
                                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </Button>
                                                            )}

                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setDeviseToDelete(devise);
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
                        )}
                    </CardContent>
                </Card>

                {/* Dialog pour mettre à jour le taux d'une devise */}
                <Dialog open={updateRateDialogOpen} onOpenChange={setUpdateRateDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Mettre à jour le taux de change</DialogTitle>
                            <DialogDescription>
                                Voulez-vous mettre à jour le taux de <strong>{deviseToUpdateRate?.code}</strong> depuis l'API ?
                                <br />
                                <span className="text-green-600 font-medium">
                                    Le taux actuel sera remplacé par le taux en temps réel.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setUpdateRateDialogOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={() => deviseToUpdateRate && handleUpdateSingleRate(deviseToUpdateRate)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Mettre à jour
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog pour définir comme référence */}
                <Dialog open={referenceDialogOpen} onOpenChange={setReferenceDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Définir comme devise de référence</DialogTitle>
                            <DialogDescription>
                                Êtes-vous sûr de vouloir définir <strong>{deviseToReference?.code}</strong> comme devise de référence ?
                                <br />
                                <span className="text-amber-600 font-medium">
                                    Cette action modifiera tous les taux de change existants.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setReferenceDialogOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={() => deviseToReference && handleSetAsReference(deviseToReference)}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                Confirmer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog pour suppression */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la devise</AlertDialogTitle>
                            <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer la devise <strong>{deviseToDelete?.code} - {deviseToDelete?.intitule}</strong> ?
                                <br />
                                <span className="text-red-600 font-medium">
                                    Cette action est irréversible. Si la devise est utilisée dans des transactions, elle ne pourra pas être supprimée.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeviseToDelete(null)}>
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

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Règles de gestion importantes
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Code ISO 4217</strong> : 3 lettres majuscules (ex: EUR, USD)</li>
                        <li>• <strong>Une seule devise de référence</strong> à la fois (généralement EUR)</li>
                        <li>• <strong>Taux de change</strong> : récupérés depuis ExchangeRate-API</li>
                        <li>• <strong>Devise inactive</strong> : non sélectionnable dans les nouvelles opérations</li>
                        <li>• <strong>Suppression impossible</strong> si la devise est utilisée dans des transactions</li>
                        <li>• <strong>Mise à jour automatique</strong> : configurez un cron job pour mettre à jour quotidiennement</li>
                        <li>• <strong>Cache</strong> : les taux sont mis en cache pendant 1 heure</li>
                    </ul>
                </div>
            </div>
        </MainLayout>
    );
};

export default GestionDevises;