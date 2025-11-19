import { ArrowDownRight, ArrowUpRight, CreditCard, TrendingUp, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
    {
        title: "Solde total",
        value: "2 547 850 €",
        change: "+12.5%",
        trend: "up",
        icon: Wallet,
        gradient: "bg-gradient-primary",
    },
    {
        title: "Encaissements du mois",
        value: "856 420 €",
        change: "+8.2%",
        trend: "up",
        icon: TrendingUp,
        gradient: "bg-gradient-success",
    },
    {
        title: "Décaissements du mois",
        value: "623 150 €",
        change: "-3.1%",
        trend: "down",
        icon: CreditCard,
        gradient: "bg-gradient-primary",
    },
    {
        title: "Opérations en attente",
        value: "24",
        change: "5 nouvelles",
        trend: "neutral",
        icon: Users,
        gradient: "bg-gradient-primary",
    },
];

const recentTransactions = [
    { id: 1, libelle: "Virement ACME Corp", montant: 15000, type: "credit", date: "2024-01-15" },
    { id: 2, libelle: "Paiement fournisseur XYZ", montant: -8500, type: "debit", date: "2024-01-15" },
    { id: 3, libelle: "Encaissement client ABC", montant: 22000, type: "credit", date: "2024-01-14" },
    { id: 4, libelle: "Salaires janvier", montant: -45000, type: "debit", date: "2024-01-14" },
    { id: 5, libelle: "Remboursement prêt", montant: -3200, type: "debit", date: "2024-01-13" },
];

const Dashboard = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
                <p className="text-muted-foreground mt-1">Vue d'ensemble de votre trésorerie</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-border shadow-soft hover:shadow-medium transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`w-10 h-10 rounded-lg ${stat.gradient} flex items-center justify-center`}>
                                <stat.icon className="w-5 h-5 text-white" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                            <div className="flex items-center gap-1 mt-1">
                                {stat.trend === "up" && (
                                    <ArrowUpRight className="w-4 h-4 text-success" />
                                )}
                                {stat.trend === "down" && (
                                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                                )}
                                <p className={`text-xs ${
                                    stat.trend === "up" ? "text-success" :
                                        stat.trend === "down" ? "text-destructive" :
                                            "text-muted-foreground"
                                }`}>
                                    {stat.change}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-border shadow-soft">
                    <CardHeader>
                        <CardTitle>Opérations récentes</CardTitle>
                        <CardDescription>Les dernières transactions bancaires</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentTransactions.map((transaction) => (
                                <div
                                    key={transaction.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            transaction.type === "credit" ? "bg-success/10" : "bg-destructive/10"
                                        }`}>
                                            {transaction.type === "credit" ? (
                                                <ArrowDownRight className="w-5 h-5 text-success" />
                                            ) : (
                                                <ArrowUpRight className="w-5 h-5 text-destructive" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{transaction.libelle}</p>
                                            <p className="text-sm text-muted-foreground">{transaction.date}</p>
                                        </div>
                                    </div>
                                    <div className={`text-lg font-semibold ${
                                        transaction.type === "credit" ? "text-success" : "text-destructive"
                                    }`}>
                                        {transaction.montant > 0 ? "+" : ""}{transaction.montant.toLocaleString()} €
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-soft">
                    <CardHeader>
                        <CardTitle>Actions rapides</CardTitle>
                        <CardDescription>Raccourcis fréquents</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <button className="w-full p-4 rounded-lg bg-gradient-primary text-white font-medium hover:opacity-90 transition-opacity text-left">
                            Nouvel encaissement
                        </button>
                        <button className="w-full p-4 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors text-left">
                            Nouveau décaissement
                        </button>
                        <button className="w-full p-4 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors text-left">
                            Rapprochement bancaire
                        </button>
                        <button className="w-full p-4 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors text-left">
                            Consulter les alertes
                        </button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
