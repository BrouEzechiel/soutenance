import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Pencil, Trash2, CheckCircle, XCircle, Lock, PlayCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://127.0.0.1:8000/api/exercices-comptables";
const SOCIETES_URL = "http://127.0.0.1:8000/api/societes";

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

    const [form, setForm] = useState<FormState>({
        libelle: "",
        anneeFiscale: "",
        moisDebut: "1",
        moisFin: "12",
        reportANouveau: true,
        societeId: "",
    });

    const token = localStorage.getItem("token") ?? "";

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
                const response = await fetch(SOCIETES_URL, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Gérer différents formats de réponse
                    let societesArray: Societe[] = [];
                    if (Array.isArray(data)) {
                        societesArray = data;
                    } else if (data.data && Array.isArray(data.data)) {
                        societesArray = data.data;
                    } else if (data.success && data.data && Array.isArray(data.data)) {
                        societesArray = data.data;
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
                }
            } catch (err) {
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

    const authHeaders = () => ({
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

    const fetchExercices = async () => {
        if (!token) return handleUnauthorized();
        try {
            setLoading(true);
            console.log("📡 Fetching exercices from:", API_URL);

            const res = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log("✅ Response status:", res.status);

            if (res.status === 401) return handleUnauthorized();

            // Lire le texte de la réponse
            const responseText = await res.text();
            console.log("📄 Response raw text (first 500 chars):", responseText.substring(0, 500));

            if (!res.ok) {
                throw new Error(`Erreur ${res.status}: ${responseText.substring(0, 200)}`);
            }

            // Parser la réponse JSON
            let data;
            try {
                data = JSON.parse(responseText);
                console.log("🔍 Parsed response data:", data);
            } catch (parseError) {
                console.error("❌ Failed to parse JSON:", parseError);
                throw new Error("Réponse invalide du serveur");
            }

            // Vérifier la structure de la réponse
            console.log("📊 Response structure:", {
                isArray: Array.isArray(data),
                hasSuccess: 'success' in data,
                hasData: 'data' in data,
                dataIsArray: Array.isArray(data?.data)
            });

            // Extraire les exercices selon le format
            let exercicesData: ExerciceComptable[] = [];

            if (data && data.success !== undefined && data.data) {
                // Format: { success: true, data: [...] }
                if (Array.isArray(data.data)) {
                    exercicesData = data.data;
                    console.log("📋 Format: Success with data array");
                } else {
                    console.warn("⚠️ data.data is not an array:", data.data);
                }
            } else if (Array.isArray(data)) {
                // Format: [...]
                exercicesData = data;
                console.log("📋 Format: Array direct");
            } else if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
                // Format: { data: [...] }
                exercicesData = data.data;
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
            const actifRes = await fetch(`${API_URL}/actif`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (actifRes.ok) {
                const actifData = await actifRes.json();
                console.log("🎯 Active exercice response:", actifData);

                // Extraire les données selon le format
                let activeExercice: ExerciceComptable | null = null;
                if (actifData.success && actifData.data) {
                    activeExercice = actifData.data;
                } else if (actifData.id) {
                    activeExercice = actifData;
                }

                if (activeExercice) {
                    // Calculer les champs manquants
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
            } else {
                console.log("ℹ️ No active exercice or error:", actifRes.status);
                setActifExercice(null);
            }

        } catch (err: any) {
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
            societe: parseInt(societeId), // Convertir en nombre
            actif: false // Toujours false à la création
        };

        console.log("Données envoyées:", payload);

        try {
            const res = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.status === 401) return handleUnauthorized();

            const data = res.headers.get("content-type")?.includes("application/json")
                ? await res.json()
                : null;

            if (!res.ok) {
                const msg = data?.errors
                    ? Object.values(data.errors).flat().join(" | ")
                    : data?.message || `Erreur ${res.status}`;
                return toast({
                    title: "Erreur",
                    description: msg,
                    variant: "destructive"
                });
            }

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
            console.error(err);
            toast({
                title: "Erreur",
                description: err.message || "Impossible d'enregistrer",
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
            const res = await fetch(`${API_URL}/${id}/activer`, {
                method: "PUT",
                headers: authHeaders()
            });

            if (res.status === 401) return handleUnauthorized();

            const data = await res.json();

            if (!res.ok) {
                return toast({
                    title: "Erreur",
                    description: data?.errors || `Erreur ${res.status}`,
                    variant: "destructive"
                });
            }

            toast({
                title: "Exercice activé",
                description: "L'exercice a été activé avec succès."
            });

            fetchExercices();
        } catch (err) {
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
            const res = await fetch(`${API_URL}/${id}/cloturer`, {
                method: "PUT",
                headers: authHeaders()
            });

            if (res.status === 401) return handleUnauthorized();

            const data = await res.json();

            if (!res.ok) {
                return toast({
                    title: "Erreur",
                    description: data?.errors || `Erreur ${res.status}`,
                    variant: "destructive"
                });
            }

            toast({
                title: "Exercice clôturé",
                description: "L'exercice a été clôturé avec succès."
            });

            fetchExercices();
        } catch (err) {
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
            const res = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401) return handleUnauthorized();

            if (!res.ok) {
                const data = res.headers.get("content-type")?.includes("application/json")
                    ? await res.json()
                    : null;
                return toast({
                    title: "Erreur",
                    description: data?.message || `Erreur ${res.status}`,
                    variant: "destructive"
                });
            }

            toast({
                title: "Exercice supprimé",
                description: "Opération réussie."
            });

            fetchExercices();
        } catch (err) {
            console.error(err);
            toast({
                title: "Erreur",
                description: "Impossible de supprimer l'exercice.",
                variant: "destructive"
            });
        }
    };

    const getStatutBadge = (ex: ExerciceComptable) => {
        if (ex.cloture) {
            return <Badge variant="outline" className="bg-gray-100 text-gray-700"><Lock className="w-3 h-3 mr-1" /> Clôturé</Badge>;
        }
        if (ex.actif) {
            return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Actif</Badge>;
        }
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Inactif</Badge>;
    };

    const getMoisNom = (numero: number) => {
        return mois[numero - 1] || "";
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

                                {/* Pour les non-Super Admin, afficher la société en lecture seule */}
                                {!isSuperAdmin && currentUser?.societe && (
                                    <div className="space-y-2">
                                        <Label>Société</Label>
                                        <div className="p-2 bg-gray-50 rounded-md">
                                            {currentUser.societe.raisonSociale || `Société ID: ${currentUser.societe.id || currentUser.societe}`}
                                        </div>
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
                                    <div className="text-sm text-muted-foreground">
                                        <p>⚠️ Attention : La modification des dates peut affecter les écritures existantes.</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
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

                                                        {!ex.cloture && (
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
                    <h3 className="font-semibold text-blue-800 mb-2">Information importante</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Un seul exercice peut être <strong>actif</strong> à la fois</li>
                        <li>• Aucune saisie n'est possible dans un exercice <strong>clôturé</strong></li>
                        <li>• Les périodes ne doivent pas se chevaucher</li>
                        <li>• Le <strong>report à nouveau</strong> permet de reporter les soldes en fin d'exercice</li>
                    </ul>
                </div>
            </div>
        </MainLayout>
    );
};

export default ExerciceComptable;