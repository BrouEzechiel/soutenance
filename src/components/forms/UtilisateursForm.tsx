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
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const utilisateursFormSchema = z.object({
    nom: z.string().min(2, "Le nom est requis"),
    prenom: z.string().min(2, "Le prénom est requis"),
    email: z.string().email("Email invalide"),
    identifiant: z.string().min(3, "L'identifiant est requis"),
    motDePasseHashe: z.string()
        .min(6, "Le mot de passe doit contenir au moins 6 caractères")
        .or(z.literal("")),
    ancienMotDePasse: z.string().optional(),
    role: z.string().min(1, "Le rôle est requis"),
    statut: z.string().min(1, "Le statut est requis"),
    societe: z.string().optional(),
});

type UtilisateursFormValues = z.infer<typeof utilisateursFormSchema>;

interface UtilisateursFormProps {
    defaultValues?: Partial<UtilisateursFormValues>;
    onSubmit: (values: UtilisateursFormValues) => void;
    onCancel: () => void;
    submitLabel?: string;
}

type SocieteDTO = { id: number | string; raisonSociale: string };
type RoleDTO = { id: number; code: string; libelle: string };

export function UtilisateursForm({
                                     defaultValues,
                                     onSubmit,
                                     onCancel,
                                     submitLabel = "Ajouter",
                                 }: UtilisateursFormProps) {

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const roles: string[] = user.roles || [];
    const isSuperAdmin = roles.includes("ROLE_SUPER_ADMIN");
    const isAdmin = roles.includes("ROLE_ADMINISTRATEUR") || isSuperAdmin;

    const [societes, setSocietes] = useState<SocieteDTO[]>([]);
    const [rolesBDD, setRolesBDD] = useState<RoleDTO[]>([]);
    const token = localStorage.getItem("token");

    // Fetch sociétés
    useEffect(() => {
        if (!isSuperAdmin || !token) return;

        fetch("http://127.0.0.1:8000/api/societes", {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || `Erreur API (${res.status})`);
                }
                return res.json();
            })
            .then((result: any) => {
                // Extrait les données selon le format de votre API
                let societesArray: any[] = [];

                // Vérifie différents formats de réponse
                if (Array.isArray(result)) {
                    // Format 1: API retourne directement un tableau
                    societesArray = result;
                } else if (result.data && Array.isArray(result.data)) {
                    // Format 2: API retourne { data: [...] }
                    societesArray = result.data;
                } else if (result.success && result.data && Array.isArray(result.data)) {
                    // Format 3: API retourne { success: true, data: [...] }
                    societesArray = result.data;
                } else {
                    console.warn("Format de réponse inattendu pour les sociétés:", result);
                    toast.error("Format de réponse inattendu pour les sociétés");
                    return;
                }

                // Maintenant mapper les sociétés
                setSocietes(societesArray.map(s => ({
                    id: String(s.id),
                    raisonSociale: s.raisonSociale || s.raison_sociale || "Société sans nom",
                })));
            })
            .catch((err) => {
                console.error("Erreur fetch societes:", err);
                toast.error(err.message || "Impossible de charger les sociétés");
            });
    }, [isSuperAdmin, token]);


    // Fetch rôles
    useEffect(() => {
        if (!token) return;

        fetch("http://127.0.0.1:8000/api/roles", {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
            .then(async res => {
                if (!res.ok) throw new Error(`Erreur ${res.status} - API roles`);
                return res.json();
            })
            .then((result: any) => {
                // Même logique d'extraction
                let rolesArray: any[] = [];

                if (Array.isArray(result)) {
                    rolesArray = result;
                } else if (result.data && Array.isArray(result.data)) {
                    rolesArray = result.data;
                } else if (result.success && result.data && Array.isArray(result.data)) {
                    rolesArray = result.data;
                } else {
                    console.warn("Format de réponse rôles inattendu:", result);
                    toast.error("Format de réponse rôles inattendu");
                    return;
                }

                setRolesBDD(
                    rolesArray.map(r => ({
                        id: r.id,
                        code: r.code,
                        libelle: r.libelle || r.nom || r.libelle || "Rôle sans nom"
                    }))
                );
            })
            .catch(err => {
                console.error("Erreur fetch roles:", err);
                toast.error("Impossible de charger les rôles");
            });
    }, [token]);

    const form = useForm<UtilisateursFormValues>({
        resolver: zodResolver(utilisateursFormSchema),
        defaultValues: {
            nom: "",
            prenom: "",
            email: "",
            identifiant: "",
            motDePasseHashe: "",
            role: "",
            statut: "ACTIF",
            societe: "",
            ...defaultValues,
        },
    });

    useEffect(() => {
        if (!defaultValues) return;
        form.reset({
            ...defaultValues,
            motDePasseHashe: "",
            societe: defaultValues.societe ? String(defaultValues.societe) : "",
        });
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

                    {submitLabel === "Modifier" && isAdmin ? (
                        <FormField
                            control={form.control}
                            name="ancienMotDePasse"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ancien mot de passe de l'utilisateur</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Ancien mot de passe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : (
                        <div />
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <FormField
                        control={form.control}
                        name="motDePasseHashe"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mot de passe {submitLabel === "Modifier" && "(laisser vide)"}</FormLabel>
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
                                        {rolesBDD
                                            .filter(r => r.code !== "ROLE_SUPER_ADMIN")
                                            .map(r => (
                                                <SelectItem key={r.id} value={r.code}>
                                                    {r.libelle}
                                                </SelectItem>
                                            ))}
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
                                        <SelectItem value="Actif">ACTIF</SelectItem>
                                        <SelectItem value="Inactif">INACTIF</SelectItem>
                                        <SelectItem value="Suspendu">SUSPENDU</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {isSuperAdmin && (
                    <FormField
                        control={form.control}
                        name="societe"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Société</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner une société" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {societes.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.raisonSociale}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

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
