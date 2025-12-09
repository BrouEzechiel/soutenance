import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/treswallet-logo.png";
import { toast } from "sonner";

export default function Login({ onLogin }: { onLogin?: () => void }) {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {

            const response = await fetch("http://127.0.0.1:8000/api/auth/logins", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    username: username.trim(),
                    password: password
                })
            });

            const responseText = await response.text();

            let data;
            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                toast.error("Réponse serveur invalide");
                return;
            }

            if (!response.ok) {
                const errorMessage =
                    data?.message ||
                    data?.error ||
                    (response.status === 401 ? "Identifiants incorrects" :
                        response.status === 403 ? "Compte désactivé" :
                            response.status === 500 ? "Erreur interne du serveur" :
                                `Erreur ${response.status}: ${response.statusText}`);

                toast.error(errorMessage);
                return;
            }

            // Vérifier la structure des données
            if (!data.data?.token) {
                toast.error("Token de connexion manquant");
                return;
            }

            if (!data.data?.utilisateur) {
                toast.error("Données utilisateur manquantes");
                return;
            }

            // Préparer les données pour le stockage
            const userData = {
                id: data.data.utilisateur.id || 0,
                username: data.data.utilisateur.username || "",
                firstName: data.data.utilisateur.firstName || "",
                lastName: data.data.utilisateur.lastName || "",
                email: data.data.utilisateur.email || "",
                statut: data.data.utilisateur.statut || "ACTIF",
                societe: data.data.utilisateur.societe || null,
                societeNom: data.data.utilisateur.societeNom || "",
                roles: Array.isArray(data.data.utilisateur.roles) ? data.data.utilisateur.roles : []
            };

            // Stocker dans localStorage
            try {
                localStorage.setItem("token", data.data.token);
                localStorage.setItem("isAuthenticated", "true");
                localStorage.setItem("user", JSON.stringify(userData));
            } catch (storageError) {
                toast.error("Erreur lors du stockage local");
                return;
            }

            toast.success("Connexion réussie");

            // Notifier le parent si besoin
            if (onLogin) {
                onLogin();
            }

            // Naviguer
            navigate("/index", { replace: true });

        } catch (err: any) {
            if (err.name === "TypeError" && err.message.includes("fetch")) {
                toast.error("Serveur inaccessible. Vérifiez qu'il est démarré.");
            } else {
                toast.error("Une erreur inattendue est survenue");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary-hover p-4">
            <Card className="w-full max-w-md shadow-card-hover">
                <CardHeader className="space-y-4 text-center">
                    <div className="flex justify-center">
                        <img src={logo} alt="ORBISTRESORERIE" className="h-16 w-16" />
                    </div>
                    <CardTitle className="text-2xl">Connexion à ORBISTRESORERIE</CardTitle>
                    <CardDescription>
                        Entrez vos identifiants pour accéder à votre espace
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Nom d'utilisateur</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Votre nom d'utilisateur"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Votre mot de passe"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? "Connexion..." : "Se connecter"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}