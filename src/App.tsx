import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Index from "./pages/Index";
import Utilisateurs from "./pages/Utilisateurs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import CreationSociete from "./pages/parametres/CreationSociete";
import GestionRoles from "./pages/parametres/GestionRoles";
import CreationBanque from "./pages/parametres/CreationBanque";
import ExerciceComptable from "./pages/parametres/ExerciceComptable";
import GestionDevises from "./pages/parametres/GestionDevises";
import GestionPlanComptable from "./pages/parametres/GestionPlanComptable";
import ComptesTresorerie from "./pages/parametres/ComptesTresorerie";
import JournalTresorerie from "./pages/parametres/JournalTresorerie";
import TiersPage from "./pages/parametres/TiersPage";
import ParametresBancaires from "@/pages/parametres/ParametresBancaires";
import ChargesSocialesPage from "@/pages/parametres/ChargeSocialePage";
import FeuilleEncaissementPage from "@/pages/encaissements/FeuilleEncaissementPage";
import OrdrePaiement from "@/pages/decaissements/OrdrePaiement";
import FacturePage from "@/pages/FacturePage";

const queryClient = new QueryClient();

// Fonction pour désactiver les warnings de React Router Future Flags
const disableRouterWarnings = () => {
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
        if (
            typeof args[0] === 'string' &&
            args[0].includes('React Router Future Flag Warning')
        ) {
            return;
        }
        originalWarn.apply(console, args);
    };
};

// Appeler la fonction pour désactiver les warnings
disableRouterWarnings();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Index />} />
                    <Route path="/index" element={<Index />} />

                    {/* 🔐 Route protégée pour admin et super admin */}
                    <Route
                        path="/utilisateurs"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN"]}>
                                <Utilisateurs />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Page paramétrage sociétés */}
                    <Route
                        path="/parametres/societe"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_SUPER_ADMIN"]}>
                                <CreationSociete />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Gestion des rôles */}
                    <Route
                        path="/parametres/gestion-roles"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN"]}>
                                <GestionRoles />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Création Banque - accès admin + super admin */}
                    <Route
                        path="/parametres/creation-banque"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN"]}>
                                <CreationBanque />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Exercice Comptable - accès admin + super admin */}
                    <Route
                        path="/parametres/exercice-comptable"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN"]}>
                                <ExerciceComptable />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Gestion Devises - accès admin + super admin */}
                    <Route
                        path="/parametres/gestion-devises"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN"]}>
                                <GestionDevises />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Gestion Plan Comptable - accès admin + super admin */}
                    <Route
                        path="/parametres/plan-comptable"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN"]}>
                                <GestionPlanComptable />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Comptes de Trésorerie - accès admin + super admin */}
                    <Route
                        path="/parametres/comptes-tresorerie"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN", "ROLE_COMPTABLE"]}>
                                <ComptesTresorerie />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Journaux de Trésorerie - accès admin + super admin + comptable */}
                    <Route
                        path="/parametres/journaux-tresorerie"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN", "ROLE_COMPTABLE"]}>
                                <JournalTresorerie />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Gestion des Tiers - accès admin + super admin + comptable */}
                    <Route
                        path="/parametres/tiers"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN", "ROLE_COMPTABLE"]}>
                                <TiersPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Paramètres Bancaires - accès admin + super admin + comptable */}
                    <Route
                        path="/parametres/parametre-compte-tresorerie"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN", "ROLE_COMPTABLE"]}>
                                <ParametresBancaires />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Gestion des Charges Sociales - accès admin + super admin + comptable */}
                    <Route
                        path="/parametres/charges"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN", "ROLE_COMPTABLE"]}>
                                <ChargesSocialesPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Gestion des Factures - accès admin + super admin + comptable + agent */}
                    <Route
                        path="/factures"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN", "ROLE_COMPTABLE", "ROLE_AGENT"]}>
                                <FacturePage />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Feuille d'encaissement - accès admin + super admin + comptable + caissier */}
                    <Route
                        path="/encaissements/feuille"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN", "ROLE_COMPTABLE", "ROLE_CAISSIER"]}>
                                <FeuilleEncaissementPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Ordre de paiement - accès admin + super admin + comptable + agent */}
                    <Route
                        path="/decaissements/ordre-paiement"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR", "ROLE_SUPER_ADMIN", "ROLE_COMPTABLE", "ROLE_AGENT"]}>
                                <OrdrePaiement />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;