import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UtilisateursForm } from "@/components/forms/UtilisateursForm";

// Modifiez la fonction getRoleBadge pour utiliser roleEntities
const getRoleBadge = (utilisateur: any) => {
    // Accédez à roleEntities au lieu de roles
    const roleEntities = utilisateur.roleEntities || [];

    if (Array.isArray(roleEntities) && roleEntities.length > 0) {
        // Prenez le premier rôle
        const role = roleEntities[0];
        const roleCode = role.code || "";

        switch (roleCode) {
            case "ROLE_ADMINISTRATEUR":
                return <Badge className="bg-accent text-accent-foreground">Administrateur</Badge>;
            case "ROLE_TRESORERIE":
                return <Badge className="bg-primary text-primary-foreground">Trésorerie</Badge>;
            case "ROLE_COMPTABLE":
                return <Badge className="bg-green-600 text-white">Comptable</Badge>;
            case "ROLE_UTILISATEUR":
                return <Badge variant="outline">Utilisateur</Badge>;
            default:
                return <Badge variant="outline">{roleCode}</Badge>;
        }
    }

    return <Badge variant="outline">Sans rôle</Badge>;
};

const getStatusBadge = (statut: string) => {
    if (statut?.toUpperCase() === "ACTIF") return <Badge className="bg-secondary text-secondary-foreground">{statut}</Badge>;
    return <Badge variant="outline">{statut}</Badge>;
};

export default function Utilisateurs() {
    const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [editingUtilisateur, setEditingUtilisateur] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const token = localStorage.getItem("token");

    const fetchUsers = async () => {
        if (!token) return;
        try {
            const res = await fetch("http://127.0.0.1:8000/api/utilisateurs/list", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!res.ok) throw new Error("Erreur API");
            const data = await res.json();
            if (Array.isArray(data)) setUtilisateurs(data);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const onSubmit = async (values: any) => {
        if (!token) return toast.error("Token manquant !");
        if (!editingUtilisateur && !values.motDePasseHashe) return toast.error("Le mot de passe est obligatoire pour un nouvel utilisateur");

        try {
            const url = editingUtilisateur
                ? `http://127.0.0.1:8000/api/utilisateurs/${editingUtilisateur.id}`
                : "http://127.0.0.1:8000/api/utilisateurs/create";
            const method = editingUtilisateur ? "PUT" : "POST";

            const payload: any = {
                firstName: values.prenom,
                lastName: values.nom,
                email: values.email,
                username: values.identifiant,
                roles: [values.role],
                statut: values.statut,
                societe: values.societe,
            };

            if (values.motDePasseHashe) payload.password = values.motDePasseHashe;
            if (!editingUtilisateur) payload.created_at = new Date().toISOString();

            const response = await fetch(url, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Erreur API");
            }

            const data = await response.json();
            if (editingUtilisateur) {
                setUtilisateurs(prev => prev.map(u => (u.id === editingUtilisateur.id ? data : u)));
                toast.success("Utilisateur modifié avec succès");
            } else {
                setUtilisateurs(prev => [...prev, data]);
                toast.success("Utilisateur ajouté avec succès");
            }

            setOpen(false);
            setEditingUtilisateur(null);
        } catch (err: any) {
            console.error("Erreur API:", err);
            toast.error(err.message);
        }
    };

    const handleEdit = (utilisateur: any) => {
        setEditingUtilisateur(utilisateur);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingUtilisateur(null);
    };

    const handleDelete = (id: number) => {
        if (!token) return toast.error("Token manquant !");
        fetch(`http://127.0.0.1:8000/api/utilisateurs/${id}`, {
            method: "DELETE",
            headers: {"Authorization": `Bearer ${token}`},
        })
            .then(res => {
                if (res.status === 204) {
                    setUtilisateurs(prev => prev.filter(u => u.id !== id));
                    toast.success("Utilisateur supprimé avec succès");
                } else {
                    toast.error("Erreur lors de la suppression");
                }
            });
        setDeletingId(null);
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
                        <p className="text-muted-foreground">Gérez les utilisateurs de l'application</p>
                    </div>

                    <Dialog open={open} onOpenChange={(isOpen) => !isOpen ? handleClose() : setOpen(true)}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4"/> Nouvel utilisateur
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{editingUtilisateur ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</DialogTitle>
                            </DialogHeader>

                            <UtilisateursForm
                                defaultValues={editingUtilisateur ? {
                                    nom: editingUtilisateur.lastName,
                                    prenom: editingUtilisateur.firstName,
                                    email: editingUtilisateur.email,
                                    identifiant: editingUtilisateur.username,
                                    motDePasseHashe: "",
                                    role: editingUtilisateur.roles?.[0] || "",
                                    statut: editingUtilisateur.statut,
                                    societe: editingUtilisateur.societe?.id || "",
                                } : undefined}
                                onSubmit={onSubmit}
                                onCancel={handleClose}
                                submitLabel={editingUtilisateur ? "Modifier" : "Ajouter"}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle>Liste des utilisateurs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Société</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {utilisateurs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                            Aucun utilisateur trouvé.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {utilisateurs.map(u => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{`${u.firstName} ${u.lastName}`}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{getRoleBadge(u)}</TableCell>
                                        <TableCell>{getStatusBadge(u.statut)}</TableCell>
                                        <TableCell>{u.societe?.raisonSociale ?? "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                                        onClick={() => handleEdit(u)}>
                                                    <Pencil className="h-4 w-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                                        onClick={() => setDeletingId(u.id)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action
                                est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deletingId && handleDelete(deletingId)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </MainLayout>
    );
}