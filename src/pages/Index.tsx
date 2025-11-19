// pages/Index.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "./Dashboard";

const Index = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const isAuthenticated = localStorage.getItem("isAuthenticated");

        if (!isAuthenticated) {
            navigate("/login");
        } else {
            setIsLoading(false);
        }
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Chargement...</div>
            </div>
        );
    }

    return (
        <MainLayout>
            <Dashboard />
        </MainLayout>
    );
};

export default Index;