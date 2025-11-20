import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const CreationSociete = () => {
    const { toast } = useToast();

    const [form, setForm] = useState({
        raisonSociale: "",
        forme: "",
        autreForme: "",
        activites: "",
        registreCommerce: "",
        compteContribuable: "",
        telephone: "",
        anneeDebutActivite: "",
        adresse: "",
        siegeSocial: "",
        capitalSocial: "",
        gerant: ""
    });

    const handleChange = (e: any) => {
        setForm({
            ...form,
            [e.target.id]: e.target.value
        });
    };

    const handleForme = (value: string) => {
        setForm({
            ...form,
            forme: value,
            // reset autreForme si l'utilisateur change la sélection
            autreForme: value === "AUTRES" ? form.autreForme : ""
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch("http://127.0.0.1:8000/api/societes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    raisonSociale: form.raisonSociale,
                    forme: form.forme === "AUTRES" ? form.autreForme : form.forme,
                    activites: form.activites,
                    registreCommerce: form.registreCommerce,
                    compteContribuable: form.compteContribuable,
                    telephone: form.telephone,
                    anneeDebutActivite: Number(form.anneeDebutActivite) || null,
                    adresse: form.adresse,
                    siegeSocial: form.siegeSocial,
                    capitalSocial: Number(form.capitalSocial) || null,
                    gerant: form.gerant
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw error;
            }

            toast({
                title: "Succès",
                description: "La société a été créée avec succès."
            });

        } catch (error: any) {
            toast({
                title: "Erreur",
                description: "Impossible de créer la société.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Création de la Société</h1>
                <p className="text-muted-foreground">Paramétrage des informations de l'entreprise</p>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Informations générales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="raisonSociale">Nom de la société *</Label>
                                <Input id="raisonSociale" value={form.raisonSociale} onChange={handleChange} required />
                            </div>

                            <div className="space-y-2">
                                <Label>Forme juridique *</Label>
                                <Select onValueChange={handleForme} value={form.forme}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EI">Entreprise individuelle</SelectItem>
                                        <SelectItem value="SARL">SARL</SelectItem>
                                        <SelectItem value="SA">SA</SelectItem>
                                        <SelectItem value="AUTRES">Autres</SelectItem>
                                    </SelectContent>
                                </Select>

                                {form.forme === "AUTRES" && (
                                    <div className="space-y-2 mt-2">
                                        <Label htmlFor="autreForme">Préciser la forme juridique *</Label>
                                        <Input
                                            id="autreForme"
                                            value={form.autreForme}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="activites">Activités</Label>
                            <Textarea id="activites" value={form.activites} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="registreCommerce">N° Registre de Commerce *</Label>
                                <Input id="registreCommerce" value={form.registreCommerce} onChange={handleChange} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="compteContribuable">N° Compte Contribuable *</Label>
                                <Input id="compteContribuable" value={form.compteContribuable} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="telephone">N° Téléphone</Label>
                                <Input id="telephone" value={form.telephone} onChange={handleChange} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="anneeDebutActivite">Année de début d'activité</Label>
                                <Input
                                    id="anneeDebutActivite"
                                    type="number"
                                    value={form.anneeDebutActivite}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="adresse">Adresse</Label>
                            <Textarea id="adresse" value={form.adresse} onChange={handleChange} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="siegeSocial">Siège social</Label>
                            <Textarea id="siegeSocial" value={form.siegeSocial} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="capitalSocial">Capital social</Label>
                                <Input id="capitalSocial" type="number" value={form.capitalSocial} onChange={handleChange} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gerant">Gérant</Label>
                                <Input id="gerant" value={form.gerant} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" className="gap-2">
                                <Save className="w-4 h-4" />
                                Enregistrer
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
};

export default CreationSociete;
