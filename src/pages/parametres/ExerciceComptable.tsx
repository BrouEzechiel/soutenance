import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Pencil, Trash2, CheckCircle, XCircle, Lock, PlayCircle, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
const API_URL = api("/exercices-comptables");
const SOCIETES_URL = api("/societes");

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
    try { return JSON.parse(text); } catch { return text; }
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

type ExerciceComptable = {
    id: number;
    libelle: string;
    anneeFiscale: number;
    moisDebut: number;
    moisFin: number;
    dateDebut: string;
    dateFin: string;
    reportANouveau: boolean;
    actif: boolean;
    cloture: boolean;
    passable?: boolean;
    enCours?: boolean;
    dureeValide?: boolean; // NOUVEAU
    periode: string;
    dateCloture?: string;
    createdAt: string;
    updatedAt: string;
    societe?: {
        id: number;
        raisonSociale: string;
    };
};

type Societe = {
    id: number;
    raisonSociale: string;
};

type FormState = {
    libelle: string;
    anneeFiscale: string;
    moisDebut: string;
    moisFin: string;
    reportANouveau: boolean;
    societeId: string;
};

const ExerciceComptable = () => {
    const { toast } = useToast();
    const [exercices, setExercices] = useState<ExerciceComptable[]>([]);
    const [societes, setSocietes] = useState<Societe[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingSocietes, setLoadingSocietes] = useState(false);
    const [actifExercice, setActifExercice] = useState<ExerciceComptable | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isVerifyingPeriod, setIsVerifyingPeriod] = useState(false);

    const [form, setForm] = useState<FormState>({
        libelle: "",
        anneeFiscale: "",
        moisDebut: "1",
        moisFin: "12",
        reportANouveau: true,
        societeId: "",
    });

    const token = localStorage.getItem("token") ?? "";
    const navigate = useNavigate();

    const mois = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    // Initialisation de l'utilisateur
    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setCurrentUser(user);

                // Vérifier si c'est un Super Admin
                const roles = user.roles || [];
                setIsSuperAdmin(roles.includes("ROLE_SUPER_ADMIN"));

                // Définir la société par défaut pour les non-Super Admin
                if (!roles.includes("ROLE_SUPER_ADMIN") && user.societe) {
                    setForm(prev => ({
                        ...prev,
                        societeId: user.societe.id?.toString() || user.societe.toString()
                    }));
                }
            } catch (e) {
                console.error("Erreur parsing user:", e);
            }
        }
    }, []);

    // Charger les sociétés pour les Super Admin
    useEffect(() => {
        const fetchSocietes = async () => {
            if (!isSuperAdmin || !token || societes.length > 0) return;

            setLoadingSocietes(true);
            try {
                const data = await fetchJson(SOCIETES_URL, {}, navigate);

                let societesArray: Societe[] = [];
                if (Array.isArray(data)) {
                    societesArray = data;
                } else if ((data as any).data && Array.isArray((data as any).data)) {
                    societesArray = (data as any).data;
                } else if ((data as any).success && (data as any).data && Array.isArray((data as any).data)) {
                    societesArray = (data as any).data;
                }

                setSocietes(societesArray);

                // Si l'utilisateur a une société, la sélectionner par défaut
                if (currentUser?.societe?.id && societesArray.length > 0) {
                    const defaultSociete = societesArray.find((s: Societe) => s.id === currentUser.societe.id);
                    if (defaultSociete) {
                        setForm(prev => ({
                            ...prev,
                            societeId: defaultSociete.id.toString()
                        }));
                    }
                }
            } catch (err) {
                if ((err as any)?.status === 401) return handleUnauthorized();
                console.error("Erreur chargement sociétés:", err);
                toast({
                    title: "Erreur",
                    description: "Impossible de charger la liste des sociétés",
                    variant: "destructive"
                });
            } finally {
                setLoadingSocietes(false);
            }
        };

        if (isSuperAdmin) {
            fetchSocietes();
        }
    }, [isSuperAdmin, token, currentUser]);

    const resetForm = () => {
        setEditingId(null);
        setForm({
            libelle: "",
            anneeFiscale: "",
            moisDebut: "1",
            moisFin: "12",
            reportANouveau: true,
            societeId: isSuperAdmin ? "" : (currentUser?.societe?.id?.toString() || currentUser?.societe?.toString() || "")
        });
    };

    const handleUnauthorized = () => {
        toast({
            title: "Non autorisé",
            description: "Veuillez vous reconnecter.",
            variant: "destructive"
        });
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.setItem("isAuthenticated", "false");
        navigate("/login");
    };

    // Validation frontale du formulaire
    const validateForm = (): string[] => {
        const errors: string[] = [];
        
        if (!form.libelle.trim()) {
            errors.push("Le libellé est obligatoire");
        }
        
        if (!form.anneeFiscale) {
            errors.push("L'année fiscale est obligatoire");
        } else {
            const annee = parseInt(form.anneeFiscale);
            if (annee < 2000 || annee > 2100) {
                errors.push("L'année fiscale doit être entre 2000 et 2100");
            }
        }
        
        // Vérifier que la période est de 12 mois
        const moisDebut = parseInt(form.moisDebut);
        const moisFin = parseInt(form.moisFin);
        
        if (moisDebut <= moisFin) {
            // Période dans la même année
            const dureeMois = moisFin - moisDebut + 1;
            if (dureeMois !== 12) {
                errors.push("La période doit durer exactement 12 mois");
            }
        } else {
            // Exercice chevauchant (ex: Octobre 2024 à Septembre 2025)
            const dureeMois = (12 - moisDebut + 1) + moisFin;
            if (dureeMois !== 12) {
                errors.push("La période doit durer exactement 12 mois");
            }
        }
        
        return errors;
    };

    const fetchExercices = async () => {
        if (!token) return handleUnauthorized();
        try {
            setLoading(true);
            console.log("📡 Fetching exercices from:", API_URL);

            const data = await fetchJson(API_URL, {}, navigate);

            // Extraire les exercices selon le format
            let exercicesData: ExerciceComptable[] = [];

            if (data && (data as any).success !== undefined && (data as any).data) {
                if (Array.isArray((data as any).data)) {
                    exercicesData = (data as any).data;
                    console.log("📋 Format: Success with data array");
                } else {
                    console.warn("⚠️ data.data is not an array:", (data as any).data);
                }
            } else if (Array.isArray(data)) {
                exercicesData = data as ExerciceComptable[];
                console.log("📋 Format: Array direct");
            } else if (data && typeof data === 'object' && (data as any).data && Array.isArray((data as any).data)) {
                exercicesData = (data as any).data;
                console.log("📋 Format: Data array");
            } else {
                console.warn("⚠️ Format inattendu:", data);
                exercicesData = [];
            }

            console.log(`📦 Found ${exercicesData.length} exercices:`, exercicesData);

            // Calculer les champs passable et enCours si non fournis
            const exercicesWithCalculatedFields = exercicesData.map(ex => ({
                ...ex,
                passable: ex.passable ?? (ex.actif && !ex.cloture),
                enCours: ex.enCours ?? (!ex.cloture && new Date(ex.dateDebut) <= new Date() && new Date(ex.dateFin) >= new Date())
            }));

            setExercices(exercicesWithCalculatedFields);

            // Récupérer l'exercice actif
            console.log("🔄 Fetching active exercice...");
            const actifData = await fetchJson(`${API_URL}/actif`, {}, navigate);
            console.log("🎯 Active exercice response:", actifData);

            let activeExercice: ExerciceComptable | null = null;
            if ((actifData as any)?.success && (actifData as any)?.data) {
                activeExercice = (actifData as any).data;
            } else if ((actifData as any)?.id) {
                activeExercice = actifData as ExerciceComptable;
            }

            if (activeExercice) {
                activeExercice = {
                    ...activeExercice,
                    passable: activeExercice.passable ?? (activeExercice.actif && !activeExercice.cloture),
                    enCours: activeExercice.enCours ?? (!activeExercice.cloture &&
                        new Date(activeExercice.dateDebut) <= new Date() &&
                        new Date(activeExercice.dateFin) >= new Date())
                };
            }

            console.log("🏆 Active exercice extracted:", activeExercice);
            setActifExercice(activeExercice);

        } catch (err: any) {
            if (err?.status === 401) return handleUnauthorized();
            console.error("❌ Error in fetchExercices:", err);
            toast({
                title: "Erreur",
                description: "Impossible de charger les exercices comptables: " + (err.message || "Erreur inconnue"),
                variant: "destructive"
            });
            setExercices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExercices();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.id]: e.target.value });
    };

    const handleSwitchChange = (checked: boolean) => {
        setForm({ ...form, reportANouveau: checked });
    };

    const handleSelectSociete = (value: string) => {
        setForm({ ...form, societeId: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return handleUnauthorized();

        // Validation frontale
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            toast({
                title: "Erreurs de validation",
                description: validationErrors.join(" | "),
                variant: "destructive"
            });
            return;
        }

        // Déterminer l'ID de la société
        let societeId: string;

        if (isSuperAdmin) {
            // Pour les Super Admin, utiliser la société sélectionnée
            societeId = form.societeId || "";
        } else {
            // Pour les autres utilisateurs, utiliser la société de l'utilisateur
            societeId = currentUser?.societe?.id?.toString() || currentUser?.societe?.toString() || "";
        }

        if (!societeId) {
            toast({
                title: "Erreur",
                description: isSuperAdmin
                    ? "Veuillez sélectionner une société"
                    : "Vous n'êtes associé à aucune société. Contactez l'administrateur.",
                variant: "destructive"
            });
            return;
        }

        const url = editingId ? `${API_URL}/${editingId}` : API_URL;
        const method = editingId ? "PUT" : "POST";

        const payload = {
            libelle: form.libelle,
            anneeFiscale: parseInt(form.anneeFiscale),
            moisDebut: parseInt(form.moisDebut),
            moisFin: parseInt(form.moisFin),
            reportANouveau: form.reportANouveau,
            societe: parseInt(societeId) // Convertir en nombre
        };

        console.log("Données envoyées:", payload);

        try {
            const data = await fetchJson(url, {
                method,
                body: JSON.stringify(payload)
            }, navigate);

            toast({
                title: editingId ? "Exercice modifié" : "Exercice créé",
                description: "Opération réussie"
            });

            resetForm();
            setShowForm(false);
            // Petit délai avant le rafraîchissement pour laisser le temps à l'API
            setTimeout(() => {
                fetchExercices();
            }, 500);

        } catch (err: any) {
            if (err?.status === 401) return handleUnauthorized();

            const data = err?.data;
            let errorMessage = err?.message || "Impossible d'enregistrer";

            if (data?.errors) {
                if (Array.isArray(data.errors)) {
                    errorMessage = data.errors.join(" | ");
                } else if (typeof data.errors === "object") {
                    const messages = Object.values(data.errors).flat();
                    errorMessage = (messages as string[]).join(" | ");
                } else if (typeof data.errors === "string") {
                    errorMessage = data.errors;
                }
            } else if (data?.message) {
                errorMessage = data.message;
            }

            console.error(err);
            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const handleEdit = (ex: ExerciceComptable) => {
        // Ne pas permettre l'édition d'un exercice clôturé
        if (ex.cloture) {
            toast({
                title: "Opération impossible",
                description: "Impossible de modifier un exercice clôturé.",
                variant: "destructive"
            });
            return;
        }

        setForm({
            libelle: ex.libelle,
            anneeFiscale: ex.anneeFiscale.toString(),
            moisDebut: ex.moisDebut.toString(),
            moisFin: ex.moisFin.toString(),
            reportANouveau: ex.reportANouveau,
            societeId: ex.societe?.id?.toString() || ""
        });
        setEditingId(ex.id);
        setShowForm(true);
    };

    const handleActiver = async (id: number) => {
        if (!token) return handleUnauthorized();

        if (!confirm("Voulez-vous activer cet exercice ? Les autres exercices seront désactivés.")) return;

        try {
            const data = await fetchJson(`${API_URL}/${id}/activer`, {
                method: "PUT"
            }, navigate);

            toast({
                title: "Exercice activé",
                description: "L'exercice a été activé avec succès."
            });

            fetchExercices();
        } catch (err: any) {
            if (err?.status === 401) return handleUnauthorized();
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible d'activer l'exercice.",
                variant: "destructive"
            });
        }
    };

    const handleCloturer = async (id: number) => {
        if (!token) return handleUnauthorized();

        if (!confirm("Voulez-vous clôturer cet exercice ? Cette action est irréversible.")) return;

        try {
            const data = await fetchJson(`${API_URL}/${id}/cloturer`, {
                method: "PUT"
            }, navigate);

            toast({
                title: "Exercice clôturé",
                description: "L'exercice a été clôturé avec succès."
            });

            fetchExercices();
        } catch (err: any) {
            if (err?.status === 401) return handleUnauthorized();
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de clôturer l'exercice.",
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (!token) return handleUnauthorized();

        if (!confirm("Voulez-vous vraiment supprimer cet exercice ?")) return;

        try {
            await fetchJson(`${API_URL}/${id}`, { method: "DELETE" }, navigate);

            toast({
                title: "Exercice supprimé",
                description: "Opération réussie."
            });

            fetchExercices();
        } catch (err: any) {
            if (err?.status === 401) return handleUnauthorized();
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de supprimer l'exercice.",
                variant: "destructive"
            });
        }
    };

    // Fonction pour vérifier la période avant création
    const handleVerifierPeriode = async () => {
        if (!form.anneeFiscale || !form.moisDebut || !form.moisFin) {
            toast({
                title: "Information manquante",
                description: "Veuillez remplir l'année fiscale et les mois de début/fin",
                variant: "destructive"
            });
            return;
        }

        setIsVerifyingPeriod(true);
        try {
            // Créer un payload temporaire pour la vérification
            const payload = {
                anneeFiscale: parseInt(form.anneeFiscale),
                moisDebut: parseInt(form.moisDebut),
                moisFin: parseInt(form.moisFin),
                societe: form.societeId ? parseInt(form.societeId) : null
            };

            const data = await fetchJson(`${API_URL}/verifier-periode`, {
                method: "POST",
                body: JSON.stringify(payload)
            }, navigate);

            if ((data as any)?.success) {
                toast({
                    title: (data as any).estValide ? "✅ Période valide" : "❌ Période invalide",
                    description: (data as any).estValide
                        ? "Cette période peut être utilisée pour créer un exercice"
                        : (data as any).message || "Cette période présente des problèmes",
                    variant: (data as any).estValide ? "default" : "destructive"
                });
            }
        } catch (err: any) {
            if (err?.status === 401) return handleUnauthorized();
            console.error("Erreur vérification période:", err);
            toast({
                title: "Erreur",
                description: err?.data?.message || err?.message || "Impossible de vérifier la période",
                variant: "destructive"
            });
        } finally {
            setIsVerifyingPeriod(false);
        }
    };

    const getStatutBadge = (ex: ExerciceComptable) => {
        if (ex.cloture) {
            return (
                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                    <Lock className="w-3 h-3 mr-1" /> Clôturé
                </Badge>
            );
        }
        if (ex.actif) {
            return (
                <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> Actif
                </Badge>
            );
        }
        return (
            <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" /> Inactif
            </Badge>
        );
    };

    const getMoisNom = (numero: number) => {
        return mois[numero - 1] || "";
    };

    // Calculer la période pour l'affichage
    const calculerPeriodeAffichage = () => {
        if (!form.anneeFiscale || !form.moisDebut || !form.moisFin) return "";
        
        const moisDebut = parseInt(form.moisDebut);
        const moisFin = parseInt(form.moisFin);
        const annee = parseInt(form.anneeFiscale);
        
        let anneeFin = annee;
        if (moisDebut > moisFin) {
            anneeFin = annee + 1;
        }
        
        if (anneeFin !== annee) {
            return `${getMoisNom(moisDebut)} ${annee} - ${getMoisNom(moisFin)} ${anneeFin}`;
        }
        
        return `${getMoisNom(moisDebut)} ${annee} - ${getMoisNom(moisFin)}`;
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Exercice Comptable</h1>
                        <p className="text-muted-foreground">Configuration des périodes comptables</p>

                        {actifExercice && (
                            <div className="mt-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    Exercice actif : {actifExercice.libelle} ({actifExercice.periode})
                                </Badge>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchExercices}
                            disabled={loading}
                            className="gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Rafraîchir
                        </Button>
                        <Button
                            className="gap-2"
                            onClick={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            Nouvel exercice
                        </Button>
                    </div>
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{editingId ? "Modifier un exercice" : "Créer un exercice"}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Champ Société pour les Super Admin */}
                                {isSuperAdmin && (
                                    <div className="space-y-2">
                                        <Label htmlFor="societe">Société *</Label>
                                        {loadingSocietes ? (
                                            <div className="text-sm text-muted-foreground">Chargement des sociétés...</div>
                                        ) : (
                                            <Select
                                                value={form.societeId || ""}
                                                onValueChange={handleSelectSociete}
                                                required={isSuperAdmin}
                                                disabled={loadingSocietes}
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
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="libelle">Libellé *</Label>
                                        <Input
                                            id="libelle"
                                            value={form.libelle}
                                            onChange={handleChange}
                                            placeholder="Ex: Exercice 2024"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="anneeFiscale">Année fiscale *</Label>
                                        <Input
                                            id="anneeFiscale"
                                            type="number"
                                            value={form.anneeFiscale}
                                            onChange={handleChange}
                                            placeholder="2024"
                                            min="2000"
                                            max="2100"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Mois de début *</Label>
                                        <Select
                                            value={form.moisDebut}
                                            onValueChange={(value) => setForm({...form, moisDebut: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mois.map((m, i) => (
                                                    <SelectItem key={i} value={(i + 1).toString()}>
                                                        {m}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mois de fin *</Label>
                                        <Select
                                            value={form.moisFin}
                                            onValueChange={(value) => setForm({...form, moisFin: value})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {mois.map((m, i) => (
                                                    <SelectItem key={i} value={(i + 1).toString()}>
                                                        {m}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Affichage de la période calculée */}
                                {form.anneeFiscale && form.moisDebut && form.moisFin && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-blue-600" />
                                            <span className="font-medium text-blue-700">Période :</span>
                                            <span className="text-blue-800">{calculerPeriodeAffichage()}</span>
                                        </div>
                                        <p className="text-sm text-blue-600 mt-1">
                                            Durée : {(() => {
                                                const moisDebut = parseInt(form.moisDebut);
                                                const moisFin = parseInt(form.moisFin);
                                                let dureeMois = 0;
                                                
                                                if (moisDebut <= moisFin) {
                                                    dureeMois = moisFin - moisDebut + 1;
                                                } else {
                                                    dureeMois = (12 - moisDebut + 1) + moisFin;
                                                }
                                                
                                                return `${dureeMois} mois (${dureeMois === 12 ? '✅ Durée valide' : '❌ Doit être 12 mois'})`;
                                            })()}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="reportANouveau"
                                        checked={form.reportANouveau}
                                        onCheckedChange={handleSwitchChange}
                                    />
                                    <Label htmlFor="reportANouveau" className="cursor-pointer">
                                        Activer le report à nouveau
                                    </Label>
                                </div>

                                {editingId && (
                                    <div className="text-sm text-muted-foreground bg-yellow-50 border border-yellow-200 rounded p-3">
                                        <p className="font-medium text-yellow-800">⚠️ Attention :</p>
                                        <p className="text-yellow-700">
                                            La modification des dates peut affecter les écritures existantes.
                                            Vérifiez qu'il n'y a pas de chevauchement avec d'autres exercices.
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
                                    {!editingId && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleVerifierPeriode}
                                            disabled={isVerifyingPeriod || !form.anneeFiscale || !form.moisDebut || !form.moisFin}
                                            className="gap-2"
                                        >
                                            {isVerifyingPeriod ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4" />
                                            )}
                                            Vérifier la période
                                        </Button>
                                    )}
                                    <Button type="submit" className="gap-2" disabled={isSuperAdmin && !form.societeId}>
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

                <Card>
                    <CardHeader>
                        <CardTitle>Liste des exercices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Chargement des exercices...</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-left text-sm font-medium">Libellé</th>
                                        <th className="p-3 text-left text-sm font-medium">Période</th>
                                        <th className="p-3 text-left text-sm font-medium">Dates</th>
                                        <th className="p-3 text-left text-sm font-medium">Statut</th>
                                        <th className="p-3 text-left text-sm font-medium">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {exercices.length === 0 ? (
                                        <tr className="border-t">
                                            <td className="p-3" colSpan={5}>
                                                <p className="text-center text-muted-foreground text-sm">
                                                    Aucun exercice configuré
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        exercices.map((ex) => (
                                            <tr key={ex.id} className="border-t hover:bg-muted/50">
                                                <td className="p-3 font-medium">{ex.libelle}</td>
                                                <td className="p-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{ex.periode}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {getMoisNom(ex.moisDebut)} → {getMoisNom(ex.moisFin)}
                                                        </span>
                                                        {ex.dureeValide !== undefined && (
                                                            <span className={`text-xs mt-1 ${ex.dureeValide ? 'text-green-600' : 'text-red-600'}`}>
                                                                {ex.dureeValide ? '✓ Durée valide' : '✗ Durée invalide'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-sm">
                                                    <div className="flex flex-col">
                                                        <span>Du {new Date(ex.dateDebut).toLocaleDateString()}</span>
                                                        <span>Au {new Date(ex.dateFin).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    {getStatutBadge(ex)}
                                                    {ex.reportANouveau && (
                                                        <span className="block text-xs text-muted-foreground mt-1">
                                                            Report à nouveau activé
                                                        </span>
                                                    )}
                                                    {ex.enCours && (
                                                        <span className="block text-xs text-green-600 mt-1">
                                                            ⚡ En cours
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex gap-2">
                                                        {!ex.cloture && !ex.actif && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleActiver(ex.id)}
                                                                title="Activer cet exercice"
                                                            >
                                                                <PlayCircle className="w-4 h-4" />
                                                            </Button>
                                                        )}

                                                        {!ex.cloture && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEdit(ex)}
                                                                title="Modifier"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                        )}

                                                        {ex.actif && !ex.cloture && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleCloturer(ex.id)}
                                                                title="Clôturer cet exercice"
                                                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                            >
                                                                <Lock className="w-4 h-4" />
                                                            </Button>
                                                        )}

                                                        {!ex.actif && !ex.cloture && (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleDelete(ex.id)}
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Règles importantes</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Un seul exercice actif</strong> peut être actif à la fois</li>
                        <li>• <strong>Aucune saisie</strong> n'est possible dans un exercice clôturé</li>
                        <li>• <strong>Pas de chevauchement</strong> : Les périodes ne doivent pas se chevaucher</li>
                        <li>• <strong>Durée exacte</strong> : Un exercice doit durer exactement 12 mois</li>
                        <li>• <strong>Exercice précédent clôturé</strong> : Pour créer un nouvel exercice, le précédent doit être clôturé</li>
                        <li>• Le <strong>report à nouveau</strong> permet de reporter les soldes en fin d'exercice</li>
                    </ul>
                </div>
            </div>
        </MainLayout>
    );
};

export default ExerciceComptable;