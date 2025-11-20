import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

// Schéma mis à jour : Le mot de passe accepte une chaine vide (pour l'édition) OU min 6 chars
export const utilisateursFormSchema = z.object({
    nom: z.string().min(2, "Le nom est requis"),
    prenom: z.string().min(2, "Le prénom est requis"),
    email: z.string().email("Email invalide"),
    identifiant: z.string().min(3, "L'identifiant est requis"),
    motDePasseHashe: z.string()
        .min(6, "Le mot de passe doit contenir au moins 6 caractères")
        .or(z.literal("")), // Permet une chaîne vide lors de l'édition
    role: z.string().min(1, "Le rôle est requis"),
    statut: z.string().min(1, "Le statut est requis"),
});

type UtilisateursFormValues = z.infer<typeof utilisateursFormSchema>;

interface UtilisateursFormProps {
    defaultValues?: Partial<UtilisateursFormValues>;
    onSubmit: (values: UtilisateursFormValues) => void;
    onCancel: () => void;
    submitLabel?: string;
}

export function UtilisateursForm({
                                     defaultValues,
                                     onSubmit,
                                     onCancel,
                                     submitLabel = "Ajouter",
                                 }: UtilisateursFormProps) {

    const form = useForm<UtilisateursFormValues>({
        resolver: zodResolver(utilisateursFormSchema),
        defaultValues: {
            nom: "",
            prenom: "",
            email: "",
            identifiant: "",
            motDePasseHashe: "",
            role: "",
            statut: "Actif",
            ...defaultValues,
        },
    });

    // Reset le formulaire si les defaultValues changent (ex: ouverture du modal d'édition)
    useEffect(() => {
        if (defaultValues) {
            form.reset({
                nom: "",
                prenom: "",
                email: "",
                identifiant: "",
                motDePasseHashe: "",
                role: "",
                statut: "Actif",
                ...defaultValues
            });
        }
    }, [defaultValues, form]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="nom"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nom</FormLabel>
                                <FormControl>
                                    <Input placeholder="Dupont" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="prenom"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Prénom</FormLabel>
                                <FormControl>
                                    <Input placeholder="Martin" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="email@treswallet.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="identifiant"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                    <Input placeholder="mdupont" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="motDePasseHashe"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mot de passe {submitLabel === "Modifier" && "(Laisser vide pour conserver)"}</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rôle</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un rôle" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="ROLE_UTILISATEUR">Utilisateur</SelectItem>
                                        <SelectItem value="ROLE_TRESORERIE">Trésorerie</SelectItem>
                                        <SelectItem value="ROLE_COMPTABLE">Comptable</SelectItem>
                                        <SelectItem value="ROLE_ADMINISTRATEUR">Administrateur</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="statut"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Statut</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un statut" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Actif">Actif</SelectItem>
                                        <SelectItem value="Inactif">Inactif</SelectItem>
                                        <SelectItem value="Suspendu">Suspendu</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Annuler
                    </Button>
                    <Button type="submit">{submitLabel}</Button>
                </div>
            </form>
        </Form>
    );
}