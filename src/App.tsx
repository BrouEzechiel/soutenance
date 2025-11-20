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

                    {/* 🔐 Route protégée */}
                    <Route
                        path="/utilisateurs"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR"]}>
                                <Utilisateurs />
                            </ProtectedRoute>
                        }
                    />

                    {/* 🆕 Ajout de ta page de paramétrage */}
                    <Route
                        path="/parametres/societe"
                        element={
                            <ProtectedRoute allowedRoles={["ROLE_ADMINISTRATEUR"]}>
                                <CreationSociete />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
