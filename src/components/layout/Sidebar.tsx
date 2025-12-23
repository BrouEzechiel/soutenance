// Code mis à jour avec la bonne gestion des autorisations pour Paramètres + Banques
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Building2,
    Users,
    CreditCard,
    TrendingUp,
    FileText,
    Settings,
    Wallet,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navigation = [
    { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
    { name: "Comptes bancaires", href: "/comptes", icon: CreditCard
    },
    {
        name: "Encaissements",
        icon: TrendingUp,
        subItems: [
            { name: "Feuille d'encaissement", href: "/encaissements/feuille" },
            { name: "Bordereau remise chèques", href: "/encaissements/bordereau-cheques" },
            { name: "Bordereau versement espèces", href: "/encaissements/bordereau-especes" },
        ]
    },
    {
        name: "Décaissements",
        icon: Wallet,
        subItems: [
            { name: "Ordre de paiement", href: "/decaissements/ordre-paiement" },
            { name: "Ordre de virement", href: "/decaissements/ordre-virement" },
            { name: "Feuille de paiement", href: "/decaissements/feuille-paiement" },
        ]
    },
    { name: "Rapprochement", href: "/rapprochement", icon: FileText },
    { name: "Utilisateurs", href: "/utilisateurs", icon: Users },
    { name: "Factures", href: "/factures", icon: FileText },
    {
        name: "Paramètres",
        icon: Settings,
        subItems: [
            { name: "Société", href: "/parametres/societe" },
            { name: "Exercice comptable", href: "/parametres/exercice-comptable" },
            { name: "Devise", href: "/parametres/gestion-devises" },
            { name: "Comptes trésorerie", href: "/parametres/comptes-tresorerie" },
            { name: "Parametre compte tresorerie", href: "/parametres/parametre-compte-tresorerie" },
            { name: "Banques", href: "/parametres/CreationBanque" },
            { name: "Tiers", href: "/parametres/tiers" },
            { name: "Charges sociales", href: "/parametres/charges" },
            { name: "Rôles", href: "/parametres/gestion-roles" },
            { name: "Plan comptable", href: "/parametres/plan-comptable" },
            { name: "Journaux", href: "/parametres/journaux-tresorerie" }
        ]
    },
];

interface User {
    roles: string[];
    societeNom?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}

const Sidebar = () => {
    const [openMenus, setOpenMenus] = useState<string[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Charger l'utilisateur de manière sécurisée
        const loadUser = () => {
            try {
                const userStr = localStorage.getItem("user");

                if (!userStr || userStr === "undefined" || userStr === "null") {
                    console.warn("Aucun utilisateur trouvé dans localStorage");
                    setUser(null);
                    return;
                }

                const parsedUser = JSON.parse(userStr);
                setUser(parsedUser);
            } catch (error) {
                console.error("Erreur lors du parsing de l'utilisateur:", error);
                // Nettoyer les données corrompues
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                localStorage.removeItem("isAuthenticated");
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const toggleMenu = (name: string) => {
        setOpenMenus(prev =>
            prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name]
        );
    };

    // Si chargement en cours
    if (loading) {
        return (
            <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
                <div className="p-6 border-b border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-sidebar-foreground">ORBISTRESORIE</h1>
                            <p className="text-xs text-sidebar-foreground/60">Gestion de trésorerie</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center">
                    <div className="text-sm text-sidebar-foreground/60">Chargement...</div>
                </div>
            </aside>
        );
    }

    // Si pas d'utilisateur connecté
    if (!user) {
        return (
            <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
                <div className="p-6 border-b border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-sidebar-foreground">ORBISTRESORIE</h1>
                            <p className="text-xs text-sidebar-foreground/60">Gestion de trésorerie</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-4 flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="text-sm text-sidebar-foreground/60 mb-2">Non connecté</div>
                        <NavLink
                            to="/login"
                            className="text-sm text-sidebar-primary hover:underline"
                        >
                            Se connecter
                        </NavLink>
                    </div>
                </div>
            </aside>
        );
    }

    // Utilisateur connecté - calcul des permissions
    const roles: string[] = user.roles || [];
    const isAdmin = roles.includes("ROLE_ADMINISTRATEUR");
    const isSuperAdmin = roles.includes("ROLE_SUPER_ADMIN");

    const filteredNavigation = navigation
        .map(item => {
            if (item.subItems) {
                const filteredSubItems = item.subItems.filter(subItem => {
                    if (subItem.name === "Société" && !isAdmin && !isSuperAdmin) return false;
                    if (subItem.name === "Banques" && !isAdmin && !isSuperAdmin) return false;
                    return true;
                });

                if (item.name === "Paramètres" && !(isAdmin || isSuperAdmin)) return null;

                return { ...item, subItems: filteredSubItems };
            }

            if (item.name === "Utilisateurs" && !isAdmin && !isSuperAdmin) return null;

            return item;
        })
        .filter(Boolean) as typeof navigation;

    return (
        <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="p-6 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-sidebar-foreground">ORBISTRESORIE</h1>
                        <p className="text-xs text-sidebar-foreground/60">Gestion de trésorerie</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {filteredNavigation.map((item) => (
                    <div key={item.name}>
                        {item.subItems ? (
                            <div>
                                <button
                                    onClick={() => toggleMenu(item.name)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium text-sm flex-1 text-left">{item.name}</span>
                                    <ChevronDown
                                        className={cn(
                                            "w-4 h-4 transition-transform",
                                            openMenus.includes(item.name) && "rotate-180"
                                        )}
                                    />
                                </button>

                                {openMenus.includes(item.name) && (
                                    <div className="ml-4 mt-1 space-y-1">
                                        {item.subItems.map((subItem) => (
                                            <NavLink
                                                key={subItem.href}
                                                to={subItem.href}
                                                className={({ isActive }) =>
                                                    cn(
                                                        "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm",
                                                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                                        isActive
                                                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-medium"
                                                            : "text-sidebar-foreground"
                                                    )
                                                }
                                            >
                                                {subItem.name}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <NavLink
                                to={item.href}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                        isActive
                                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-medium"
                                            : "text-sidebar-foreground"
                                    )
                                }
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium text-sm">{item.name}</span>
                            </NavLink>
                        )}
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
                <div className="px-4 py-3 rounded-lg bg-sidebar-accent/50">
                    <p className="text-xs font-medium text-sidebar-foreground">Société</p>
                    <p className="text-sm font-semibold text-sidebar-foreground mt-1">
                        {user.societeNom || "Société non définie"}
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;