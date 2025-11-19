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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            let data;
            try {
                data = await response.json();
                console.log(data)
                // Password123!
            } catch {
                toast.error("Le serveur a renvoyé une réponse invalide.");
                return;
            }

            if (!response.ok) {
                toast.error(data?.error || "Identifiants incorrects.");
                return;
            }

            // Stockage sécurisé dans localStorage
            localStorage.setItem("token", data.token);
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("user", JSON.stringify(data.utilisateur));

            toast.success("Connexion réussie");

            // Si parent a fourni une fonction onLogin, on l'appelle pour mettre à jour Header
            if (onLogin) onLogin();

            navigate("/index");
        } catch (err) {
            console.error("Erreur login :", err);
            toast.error("Impossible de contacter le serveur.");
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
                                placeholder="votre.nom.utilisateur"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Connexion..." : "Se connecter"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
