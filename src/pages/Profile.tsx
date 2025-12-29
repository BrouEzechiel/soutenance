import MainLayout from "@/components/layout/MainLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Briefcase, User as UserIcon, Clock, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "http://127.0.0.1:8000/api";

// Helper pour parser les réponses JSON de manière sécurisée
const safeJson = async (res: Response) => {
    try {
        const txt = await res.text();
        const trimmed = txt.trim();
        if (trimmed.startsWith('<')) {
            console.error('Expected JSON but received HTML:', trimmed.substring(0, 500));
            return null;
        }
        return JSON.parse(trimmed);
    } catch (e) {
        console.error('Failed to parse JSON response', e);
        return null;
    }
};

// Wrapper fetch centralisé avec gestion de l'authentification et des erreurs 401
const fetchJson = async (url: string, opts: RequestInit = {}, navigate?: any, toast?: any) => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || null;
    const headers: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) };
    if (!headers['Content-Type'] && opts.body && typeof opts.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...opts, headers });
    // Gestion des erreurs 401 (token expiré/invalide)
    if (res.status === 401) {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
        } catch (e) {
            // ignore
        }
        if (toast) {
            toast({ title: "Session expirée", description: "Veuillez vous reconnecter", variant: "destructive" });
        }
        if (navigate) {
            navigate('/login');
        } else if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/login';
        }
    }
    return res;
};

interface Societe {
    id: number;
    raisonSociale?: string;
}

interface Utilisateur {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    statut?: string;
    societe?: Societe | null;
    // backend peut renvoyer `roles` (array string) ou `roleEntities` (array d'objets)
    roles?: string[];
    roleEntities?: Array<{ id?: number; code?: string; libelle?: string }>;
}

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("token") || sessionStorage.getItem("auth_token") || sessionStorage.getItem("token");
    const headers: HeadersInit = { "Content-Type": "application/json", "Accept": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
};

export default function Profile() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [user, setUser] = useState<Utilisateur | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
    const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        const cached = localStorage.getItem("user");
        let cachedUser: Utilisateur | null = null;
        try { cachedUser = cached ? JSON.parse(cached) : null; } catch (e) { cachedUser = null; }

        const userId = cachedUser?.id;

        if (!userId) {
            setUser(cachedUser);
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await fetchJson(`${API_BASE_URL}/utilisateurs/${userId}`, {}, navigate, toast);
                if (res.status === 401) {
                    toast({ title: "Non authentifié", description: "Veuillez vous reconnecter", variant: "destructive" });
                    setUser(cachedUser);
                    return;
                }
                if (!res.ok) throw new Error(`Erreur ${res.status}`);
                const data = await res.json();
                // Normaliser les rôles pour garder une structure `roles: string[]`
                const normalized = { ...data } as any;
                if (!Array.isArray(normalized.roles) && Array.isArray(normalized.roleEntities)) {
                    normalized.roles = normalized.roleEntities.map((r: any) => r.code).filter(Boolean);
                }
                setUser(normalized);
                try { localStorage.setItem("user", JSON.stringify(normalized)); } catch (e) {}
            } catch (err) {
                setUser(cachedUser);
                toast({ title: "Erreur", description: "Impossible de récupérer le profil", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        const cached = localStorage.getItem("user");
        const cachedUser = cached ? JSON.parse(cached) : null;
        const userId = cachedUser?.id;
        if (!userId) { setLoading(false); return; }
        try {
            const r = await fetchJson(`${API_BASE_URL}/utilisateurs/${userId}`, {}, navigate, toast);
            const d = await r.json();
            setUser(d);
            try { localStorage.setItem("user", JSON.stringify(d)); } catch (e) {}
        } catch {
            toast({ title: "Erreur", description: "Impossible de rafraîchir", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            toast({ title: "Erreur", description: "Tous les champs sont obligatoires", variant: "destructive" });
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
            return;
        }

        setChangingPassword(true);
        try {
            const res = await fetchJson(`${API_BASE_URL}/utilisateurs/${user?.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    password: passwordForm.newPassword,
                    oldPassword: passwordForm.oldPassword
                })
            }, navigate, toast);

            if (res.status === 401) {
                toast({ title: "Non authentifié", description: "Veuillez vous reconnecter", variant: "destructive" });
                return;
            }

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Erreur lors du changement de mot de passe");
            }

            toast({ title: "Succès", description: "Mot de passe changé avec succès", variant: "default" });
            setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
            setShowPasswordForm(false);
        } catch (err: any) {
            toast({ title: "Erreur", description: err.message || "Impossible de changer le mot de passe", variant: "destructive" });
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header avec gradient */}
                    <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-8 shadow-lg">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-white rounded-full p-2 shadow-md">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src="/logo192.png" alt={user?.username || 'Avatar'} />
                                        <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-white font-bold">{(user?.firstName || user?.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </div>

                                <div className="text-white">
                                    <h1 className="text-3xl font-bold">{(user?.firstName || '') + ' ' + (user?.lastName || '') || user?.username || 'Invité'}</h1>
                                    <p className="text-sm opacity-90 mt-1">@{user?.username}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        {(user?.roles || []).slice(0, 2).map((r, i) => (
                                            <Badge key={i} className="bg-white/20 text-white border-white/30">{r.replace('ROLE_', '')}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button onClick={handleRefresh} variant="secondary" className="gap-2">Rafraîchir</Button>
                        </div>
                    </div>

                    {/* Contenu principal */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Carte d'informations principales */}
                        <Card className="lg:col-span-2 shadow-lg border-0">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2">
                                    <UserIcon className="w-5 h-5" />
                                    Informations personnelles
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex items-center justify-center p-8">Chargement...</div>
                                ) : user ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-blue-500/20">
                                                    <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Nom d'utilisateur</div>
                                                    <div className="font-bold text-lg">{user.username}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-green-500/20">
                                                    <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Email</div>
                                                    <div className="font-bold text-lg">{user.email || '—'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-purple-500/20">
                                                    <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Société</div>
                                                    <div className="font-bold text-lg">{user.societe?.raisonSociale || '—'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-orange-500/20">
                                                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Statut</div>
                                                    <div className="font-bold text-lg">{user.statut || '—'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center p-8">Profil non disponible</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Carte des rôles */}
                        <Card className="shadow-lg border-0">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Rôles & Permissions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {user && ((user.roles && Array.isArray(user.roles)) ? user.roles : (user.roleEntities || []).map((re: any) => re.code)).map((r: string, i: number) => (
                                        <div key={i} className="p-3 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border border-indigo-200 dark:border-indigo-800">
                                            <Badge className="bg-indigo-600 hover:bg-indigo-700">{r?.replace ? r.replace('ROLE_', '') : r}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section Changement de mot de passe */}
                    <Card className="shadow-lg border-0">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="w-5 h-5" />
                                    Sécurité
                                </CardTitle>
                                {!showPasswordForm && (
                                    <Button onClick={() => setShowPasswordForm(true)} className="gap-2">
                                        <Lock className="w-4 h-4" />
                                        Changer le mot de passe
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {showPasswordForm ? (
                                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                    <div className="space-y-2">
                                        <Label htmlFor="oldPassword" className="font-semibold">Ancien mot de passe</Label>
                                        <div className="relative">
                                            <Input
                                                id="oldPassword"
                                                type={showPasswords.old ? "text" : "password"}
                                                placeholder="Entrez votre ancien mot de passe"
                                                value={passwordForm.oldPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPasswords.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword" className="font-semibold">Nouveau mot de passe</Label>
                                        <div className="relative">
                                            <Input
                                                id="newPassword"
                                                type={showPasswords.new ? "text" : "password"}
                                                placeholder="Entrez votre nouveau mot de passe"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword" className="font-semibold">Confirmer le mot de passe</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                type={showPasswords.confirm ? "text" : "password"}
                                                placeholder="Confirmez votre nouveau mot de passe"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button type="submit" disabled={changingPassword}>
                                            {changingPassword ? "Changement en cours..." : "Changer le mot de passe"}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)}>
                                            Annuler
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <p className="text-sm text-muted-foreground">
                                        Cliquez sur "Changer le mot de passe" pour modifier votre mot de passe en toute sécurité.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
}
