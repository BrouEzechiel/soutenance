import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/treswallet-logo.png";

const ROLE_LABELS: Record<string, string> = {
    ROLE_SUPER_ADMIN: "Super Admin",
    ROLE_ADMINISTRATEUR: "Admin",
    ROLE_TRESORERIE: "Trésorier",
    ROLE_COMPTABLE: "Comptable",
    ROLE_UTILISATEUR: "Utilisateur",
};

const Header = () => {
    const [user, setUser] = useState<any>({});
    const navigate = useNavigate();

    // Charge l'utilisateur depuis localStorage au montage
    const loadUser = () => {
        const storedUser = localStorage.getItem("user");
        if (storedUser && storedUser !== "undefined") {
            try {
                if(!JSON.parse(storedUser)){
                    console.log("user est vide")
                } else {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.warn("Impossible de parser l'utilisateur depuis le localStorage", e);
                setUser({});
            }
        } else {
            setUser({});
        }
    };

    useEffect(() => {
        loadUser();

        // Optionnel : écouter un événement custom pour mise à jour après login
        const handleUserUpdate = () => loadUser();
        window.addEventListener("userUpdated", handleUserUpdate);
        return () => window.removeEventListener("userUpdated", handleUserUpdate);
    }, []);

    const displayName = (user.firstName || user.lastName)
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : "Invité";

    // Normaliser les rôles venant soit de `roles` (array de string) soit de `roleEntities` (array d'objets)
    const rolesFromUser: string[] = Array.isArray(user.roles)
        ? user.roles
        : Array.isArray(user.roleEntities)
            ? user.roleEntities.map((r: any) => r.code).filter(Boolean)
            : [];

    const displayRole = ROLE_LABELS[rolesFromUser[0] || ""] || (rolesFromUser[0] || "Aucun rôle");

    return (
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="flex items-center">
                    <img src={logo} alt="TresWallet Logo" className="h-8 w-auto" />
                </div>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher..."
                        className="pl-10 bg-background border-border"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center overflow-hidden">
                                <img src={logo} alt="Profile" className="w-full h-full object-cover" />
                            </div>

                            <div className="text-left hidden md:block">
                                <p className="text-sm font-medium">{displayName}</p>
                                <p className="text-xs text-muted-foreground">{displayRole}</p>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/profile')}>Profil</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                        >
                            Déconnexion
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};

export default Header;
