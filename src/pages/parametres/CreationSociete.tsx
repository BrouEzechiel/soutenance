import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// Interface qui correspond EXACTEMENT à l'Entity Symfony
interface SocieteFormData {
    raisonSociale: string;
    forme?: string;
    activites?: string;
    registreCommerce?: string;
    compteContribuable?: string;
    telephone?: string;
    anneeDebutActivite?: string;
    adresse?: string;
    siegeSocial?: string;
    capitalSocial?: string;
    gerant?: string;
    deviseParDefaut: string;
    emailContact?: string;
    siteWeb?: string;
    logo?: string;
    statut: string;
}

interface Devise {
    id: number;
    code: string;
    symbole: string;
    nom: string;
}

const CreationSociete = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [devises, setDevises] = useState<Devise[]>([]);

    // Initialisation du formulaire qui correspond EXACTEMENT à l'Entity
    const [form, setForm] = useState<SocieteFormData>({
        raisonSociale: "",
        forme: "",
        activites: "",
        registreCommerce: "",
        compteContribuable: "",
        telephone: "",
        anneeDebutActivite: "",
        adresse: "",
        siegeSocial: "",
        capitalSocial: "",
        gerant: "",
        deviseParDefaut: "",
        emailContact: "",
        siteWeb: "",
        logo: "",
        statut: "ACTIVE" // Valeur par défaut comme dans l'Entity
    });

    // Devises par défaut si l'API n'est pas disponible
    const DEVISES_PAR_DEFAUT: Devise[] = [
        { id: 1, code: "EUR", symbole: "€", nom: "Euro" },
        { id: 2, code: "USD", symbole: "$", nom: "Dollar US" },
        { id: 3, code: "XOF", symbole: "FCFA", nom: "Franc CFA" },
        { id: 4, code: "MGA", symbole: "Ar", nom: "Ariary Malgache" }
    ];

    // Correspond EXACTEMENT aux constantes de l'Entity
    const FORMES_JURIDIQUES = [
        { value: "SARL", label: "SARL (Société à Responsabilité Limitée)" },
        { value: "SA", label: "SA (Société Anonyme)" },
        { value: "SAS", label: "SAS (Société par Actions Simplifiée)" },
        { value: "EURL", label: "EURL (Entreprise Unipersonnelle à Responsabilité Limitée)" },
        { value: "SNC", label: "SNC (Société en Nom Collectif)" },
        { value: "SCS", label: "SCS (Société en Commandite Simple)" },
        { value: "AUTRE", label: "Autre forme juridique" }
    ];

    // Correspond EXACTEMENT aux valeurs de l'Entity
    const STATUTS = [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
        { value: "SUSPENDED", label: "Suspendue" }
    ];

    // Charger les devises avec gestion d'erreur
    useEffect(() => {
        const fetchDevises = async () => {
            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    console.warn("Aucun token disponible, utilisation des devises par défaut");
                    setDevises(DEVISES_PAR_DEFAUT);
                    return;
                }

                const response = await fetch("http://127.0.0.1:8000/api/devises", {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Vérifier le format de la réponse
                    if (Array.isArray(data)) {
                        setDevises(data);
                    } else if (data.data && Array.isArray(data.data)) {
                        setDevises(data.data);
                    } else {
                        setDevises(DEVISES_PAR_DEFAUT);
                    }
                } else {
                    console.warn("API devises non disponible, utilisation des devises par défaut");
                    setDevises(DEVISES_PAR_DEFAUT);
                }
            } catch (error) {
                console.error("Erreur chargement devises:", error);
                setDevises(DEVISES_PAR_DEFAUT);
            }
        };

        fetchDevises();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setForm(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSelect = (name: keyof SocieteFormData, value: string) => {
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation conforme à l'Entity Symfony
            if (!form.raisonSociale.trim()) {
                toast({
                    title: "Erreur",
                    description: "La raison sociale est obligatoire",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            if (!form.deviseParDefaut) {
                toast({
                    title: "Erreur",
                    description: "La devise par défaut est obligatoire",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            const token = localStorage.getItem("token");
            if (!token) {
                toast({
                    title: "Erreur",
                    description: "Vous devez être connecté",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }

            // Préparer les données - CORRESPOND EXACTEMENT À L'ENTITY
            const dataToSend: any = {
                raisonSociale: form.raisonSociale.trim(),
                deviseParDefaut: Number(form.deviseParDefaut),
                statut: form.statut
            };

            // Gérer les champs optionnels - EXACTEMENT comme l'Entity les attend
            const optionalFields: (keyof SocieteFormData)[] = [
                'forme', 'activites', 'registreCommerce', 'compteContribuable',
                'telephone', 'adresse', 'siegeSocial', 'capitalSocial', 'gerant',
                'emailContact', 'siteWeb', 'logo'
            ];

            optionalFields.forEach(field => {
                const value = form[field];
                if (value && typeof value === 'string' && value.trim() !== '') {
                    dataToSend[field] = value.trim();
                }
            });

            // Gérer l'année de début d'activité (validation côté Symfony: 1900-2100)
            if (form.anneeDebutActivite) {
                const annee = parseInt(form.anneeDebutActivite);
                if (!isNaN(annee) && annee >= 1900 && annee <= 2100) {
                    dataToSend.anneeDebutActivite = annee;
                }
            }

            // Gérer le capital social (validation côté Symfony: positive ou zéro)
            if (form.capitalSocial) {
                const capital = parseFloat(form.capitalSocial);
                if (!isNaN(capital) && capital >= 0) {
                    dataToSend.capitalSocial = capital;
                }
            }

            console.log("Données envoyées (formaté pour API):", dataToSend);

            const response = await fetch("http://127.0.0.1:8000/api/societes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });

            const responseText = await response.text();

            let responseData;
            try {
                responseData = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.error("Erreur parsing JSON:", e);
                throw new Error("Réponse serveur invalide");
            }

            if (!response.ok) {
                // Gérer les erreurs de validation Symfony
                if (response.status === 400 && responseData.errors) {
                    const errorMessages = responseData.errors
                        .map((err: any) => `${err.field}: ${err.message}`)
                        .join('\n');
                    throw new Error(`Erreurs de validation:\n${errorMessages}`);
                }

                const errorMsg = responseData?.message ||
                    responseData?.error ||
                    `Erreur ${response.status}: ${response.statusText}`;
                throw new Error(errorMsg);
            }

            toast({
                title: "Succès",
                description: "La société a été créée avec succès."
            });

            // Réinitialiser le formulaire exactement comme l'initialisation
            setForm({
                raisonSociale: "",
                forme: "",
                activites: "",
                registreCommerce: "",
                compteContribuable: "",
                telephone: "",
                anneeDebutActivite: "",
                adresse: "",
                siegeSocial: "",
                capitalSocial: "",
                gerant: "",
                deviseParDefaut: "",
                emailContact: "",
                siteWeb: "",
                logo: "",
                statut: "ACTIVE"
            });

        } catch (error: any) {
            console.error("Erreur création société:", error);
            toast({
                title: "Erreur",
                description: error.message || "Impossible de créer la société.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Création de la Société</h1>
                        <p className="text-muted-foreground">Paramétrage des informations de l'entreprise</p>
                    </div>
                    <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                        Champs marqués d'un * sont obligatoires
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Colonne 1: Informations générales (correspond à l'Entity) */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Informations générales</CardTitle>
                                <p className="text-sm text-muted-foreground">Informations légales et administratives</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="raisonSociale" className="flex items-center gap-1">
                                        Raison sociale <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="raisonSociale"
                                        value={form.raisonSociale}
                                        onChange={handleChange}
                                        required
                                        placeholder="Nom officiel de la société"
                                        disabled={loading}
                                        className="min-h-[40px]"
                                        maxLength={255} // Correspond à l'Entity: length: 255
                                    />
                                    <p className="text-xs text-muted-foreground">Entre 2 et 255 caractères</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="forme">Forme juridique</Label>
                                        <Select
                                            onValueChange={(value) => handleSelect("forme", value)}
                                            value={form.forme}
                                            disabled={loading}
                                        >
                                            <SelectTrigger className="min-h-[40px]">
                                                <SelectValue placeholder="Sélectionner une forme" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FORMES_JURIDIQUES.map((forme) => (
                                                    <SelectItem key={forme.value} value={forme.value}>
                                                        {forme.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="statut">Statut</Label>
                                        <Select
                                            onValueChange={(value) => handleSelect("statut", value)}
                                            value={form.statut}
                                            disabled={loading}
                                        >
                                            <SelectTrigger className="min-h-[40px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUTS.map((statut) => (
                                                    <SelectItem key={statut.value} value={statut.value}>
                                                        {statut.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="activites">Activités</Label>
                                    <Textarea
                                        id="activites"
                                        value={form.activites}
                                        onChange={handleChange}
                                        placeholder="Description des activités principales"
                                        rows={3}
                                        disabled={loading}
                                        className="resize-none"
                                        maxLength={255} // Correspond à l'Entity: length: 255
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="registreCommerce">N° Registre de Commerce</Label>
                                        <Input
                                            id="registreCommerce"
                                            value={form.registreCommerce}
                                            onChange={handleChange}
                                            placeholder="RCCM"
                                            disabled={loading}
                                            className="min-h-[40px]"
                                            maxLength={50} // Correspond à l'Entity: length: 50
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="compteContribuable">N° Compte Contribuable</Label>
                                        <Input
                                            id="compteContribuable"
                                            value={form.compteContribuable}
                                            onChange={handleChange}
                                            placeholder="NIF"
                                            disabled={loading}
                                            className="min-h-[40px]"
                                            maxLength={50} // Correspond à l'Entity: length: 50
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="anneeDebutActivite">Année début activité</Label>
                                        <Input
                                            id="anneeDebutActivite"
                                            type="number"
                                            min="1900"
                                            max="2100"
                                            value={form.anneeDebutActivite}
                                            onChange={handleChange}
                                            placeholder="2024"
                                            disabled={loading}
                                            className="min-h-[40px]"
                                        />
                                        <p className="text-xs text-muted-foreground">Entre 1900 et 2100</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="capitalSocial">Capital social</Label>
                                        <Input
                                            id="capitalSocial"
                                            type="number"
                                            value={form.capitalSocial}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            disabled={loading}
                                            className="min-h-[40px]"
                                        />
                                        <p className="text-xs text-muted-foreground">Valeur positive ou zéro</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Colonne 2: Contacts et configuration (correspond à l'Entity) */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Contacts et configuration</CardTitle>
                                <p className="text-sm text-muted-foreground">Coordonnées et paramètres système</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="deviseParDefaut" className="flex items-center gap-1">
                                        Devise par défaut <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        onValueChange={(value) => handleSelect("deviseParDefaut", value)}
                                        value={form.deviseParDefaut}
                                        required
                                        disabled={loading || devises.length === 0}
                                    >
                                        <SelectTrigger className="min-h-[40px]">
                                            <SelectValue placeholder={
                                                loading ? "Chargement..." :
                                                    devises.length === 0 ? "Aucune devise disponible" :
                                                        "Sélectionner une devise"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {devises.map((devise) => (
                                                <SelectItem key={devise.id} value={devise.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{devise.code}</span>
                                                        <span className="text-muted-foreground">{devise.nom}</span>
                                                        <span className="ml-auto">{devise.symbole}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="gerant">Gérant / Directeur</Label>
                                    <Input
                                        id="gerant"
                                        value={form.gerant}
                                        onChange={handleChange}
                                        placeholder="Nom et prénom du responsable"
                                        disabled={loading}
                                        className="min-h-[40px]"
                                        maxLength={100} // Correspond à l'Entity: length: 100
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="telephone">Téléphone</Label>
                                        <Input
                                            id="telephone"
                                            value={form.telephone}
                                            onChange={handleChange}
                                            placeholder="+XXX XX XXX XXX"
                                            disabled={loading}
                                            className="min-h-[40px]"
                                            maxLength={20} // Correspond à l'Entity: length: 20
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="emailContact">Email de contact</Label>
                                        <Input
                                            id="emailContact"
                                            type="email"
                                            value={form.emailContact}
                                            onChange={handleChange}
                                            placeholder="contact@societe.com"
                                            disabled={loading}
                                            className="min-h-[40px]"
                                            maxLength={100} // Correspond à l'Entity: length: 100
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="siteWeb">Site web</Label>
                                    <Input
                                        id="siteWeb"
                                        type="url"
                                        value={form.siteWeb}
                                        onChange={handleChange}
                                        placeholder="https://www.exemple.com"
                                        disabled={loading}
                                        className="min-h-[40px]"
                                        maxLength={100} // Correspond à l'Entity: length: 100
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="adresse">Adresse postale</Label>
                                    <Textarea
                                        id="adresse"
                                        value={form.adresse}
                                        onChange={handleChange}
                                        placeholder="Adresse complète"
                                        rows={2}
                                        disabled={loading}
                                        className="resize-none"
                                        maxLength={255} // Correspond à l'Entity: length: 255
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="siegeSocial">Siège social</Label>
                                    <Textarea
                                        id="siegeSocial"
                                        value={form.siegeSocial}
                                        onChange={handleChange}
                                        placeholder="Siège social (si différent de l'adresse)"
                                        rows={2}
                                        disabled={loading}
                                        className="resize-none"
                                        maxLength={255} // Correspond à l'Entity: length: 255
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="logo">Logo (URL)</Label>
                                    <Input
                                        id="logo"
                                        type="url"
                                        value={form.logo}
                                        onChange={handleChange}
                                        placeholder="https://exemple.com/logo.png"
                                        disabled={loading}
                                        className="min-h-[40px]"
                                    />
                                    <p className="text-xs text-muted-foreground">URL ou base64 de l'image</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bouton d'enregistrement */}
                    <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                            Tous les champs seront validés selon les règles de l'Entity Symfony
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setForm({
                                        raisonSociale: "",
                                        forme: "",
                                        activites: "",
                                        registreCommerce: "",
                                        compteContribuable: "",
                                        telephone: "",
                                        anneeDebutActivite: "",
                                        adresse: "",
                                        siegeSocial: "",
                                        capitalSocial: "",
                                        gerant: "",
                                        deviseParDefaut: "",
                                        emailContact: "",
                                        siteWeb: "",
                                        logo: "",
                                        statut: "ACTIVE"
                                    });
                                }}
                                disabled={loading}
                                className="min-w-[120px]"
                            >
                                Réinitialiser
                            </Button>
                            <Button
                                type="submit"
                                className="gap-2 min-w-[150px] bg-primary hover:bg-primary/90"
                                disabled={loading}
                            >
                                <Save className="w-4 h-4" />
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                                        Création...
                                    </span>
                                ) : (
                                    "Créer la société"
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
};

export default CreationSociete;