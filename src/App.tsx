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
import JournalTresorerie from "./pages/parametres/JournalTresorerie"; // 👈 Import de la nouvelle page

const queryClient = new QueryClient();

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
                        path="/parametres/CreationBanque"
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
                </Routes>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;