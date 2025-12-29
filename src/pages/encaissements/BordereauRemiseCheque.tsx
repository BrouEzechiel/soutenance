import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Printer, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle,
  Send,
  Ban,
  FileText,
  ArrowLeft,
  Loader2,
  Calendar,
  Building,
  CreditCard,
  User,
  FileDown
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MainLayout from "@/components/layout/MainLayout";

// Types
interface FeuilleEncaissement {
  id: number;
  numeroFeuille: string;
  nomClient: string;
  referenceCheque: string;
  montantPaye: string;
  montantPayeFormate: string;
  statut: string;
  statutLibelle: string;
  dateEncaissement: string;
}

interface Frchq {
  id: number;
  numeroFrchq: string;
  numeroBrchq: string | null;
  dateRemise: string;
  statut: string;
  statutLibelle: string;
  montantTotal: string;
  nombreCheques: number;
  dateEcheance: string | null;
  observations: string | null;
  motifAnnulation: string | null;
  createdBy: { id: number; nomComplet: string } | null;
  valideBy: { id: number; nomComplet: string } | null;
  remiseBy: { id: number; nomComplet: string } | null;
  updatedBy: { id: number; nomComplet: string } | null;
  valideAt: string | null;
  remiseAt: string | null;
  createdAt: string;
  updatedAt: string;
  societe: { id: number; raisonSociale: string };
  banqueBeneficiaire: { id: number; nom: string; codeBanque: string } | null;
  compteTresorerie: { id: number; numero: string; intitule: string } | null;
  journal: { id: number; code: string; intitule: string } | null;
  feuillesEncaissement: FeuilleEncaissement[];
}

interface Banque {
  id: number;
  nom: string;
  codeBanque: string;
}

interface CompteTresorerie {
  id: number;
  numero: string;
  intitule: string;
}

interface JournalTresorerie {
  id: number;
  code: string;
  intitule: string;
}

interface FormData {
  dateRemise: string;
  banqueBeneficiaireId: number | null;
  compteTresorerieId: number | null;
  journalId: number | null;
  observations: string;
  feuillesSelectionnees: number[];
}

// Backend API base (configure VITE_API_BASE_URL in .env) fallback to localhost:8000
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";
const api = (path: string) => `${API_BASE}${path}`;

const BordereauRemiseCheques = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [frchq, setFrchq] = useState<Frchq | null>(null);
  const [feuillesDisponibles, setFeuillesDisponibles] = useState<FeuilleEncaissement[]>([]);
  const [banques, setBanques] = useState<Banque[]>([]);
  const [comptes, setComptes] = useState<CompteTresorerie[]>([]);
  const [journaux, setJournaux] = useState<JournalTresorerie[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    dateRemise: format(new Date(), "yyyy-MM-dd"),
    banqueBeneficiaireId: null,
    compteTresorerieId: null,
    journalId: null,
    observations: "",
    feuillesSelectionnees: [],
  });

  const [statutActions, setStatutActions] = useState({
    showValiderDialog: false,
    showRemettreDialog: false,
    showEncaisserDialog: false,
    showImpayeDialog: false,
    showAnnulerDialog: false,
  });

  const [actionData, setActionData] = useState({
    numeroBrchq: "",
    dateEncaissement: format(new Date(), "yyyy-MM-dd"),
    motifImpaye: "",
    motifAnnulation: "",
  });

  const isEditMode = !!id;

  // helper to safely parse JSON responses and log HTML responses
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

  const toArray = <T,>(val: any): T[] => (Array.isArray(val) ? val : []);

  // fetch wrapper that adds Authorization header from localStorage (no credentials)
  const fetchJson = async (url: string, opts: RequestInit = {}) => {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || null;
    const headers: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) };
    if (!headers['Content-Type'] && !(opts && opts.body)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...opts, headers });
    // Si token invalide/expiré => forcer déconnexion et redirection vers login
    if (res.status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
      } catch (e) {
        // ignore
      }
      toast.error('Session expirée ou non autorisée — veuillez vous reconnecter');
      navigate('/login');
    }
    return res;
  };

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Charger les listes déroulantes
        const [banquesRes, comptesRes, journauxRes] = await Promise.all([
          fetchJson(api("/api/banques")),
          fetchJson(api("/api/comptes-tresorerie")),
          fetchJson(api("/api/journaux-tresorerie")),
        ]);
        if (banquesRes.ok) {
          const b = await safeJson(banquesRes);
          setBanques(toArray<Banque>(b?.data || b));
        } else {
          setBanques([]);
          toast.error("Impossible de charger les banques");
        }
        if (comptesRes.ok) {
          const c = await safeJson(comptesRes);
          setComptes(toArray<CompteTresorerie>(c?.data || c));
        } else {
          setComptes([]);
          toast.error("Impossible de charger les comptes de trésorerie");
        }
        if (journauxRes.ok) {
          const j = await safeJson(journauxRes);
          setJournaux(toArray<JournalTresorerie>(j?.data || j));
        } else {
          setJournaux([]);
          toast.error("Impossible de charger les journaux");
        }

        // Si mode édition, charger le FRCHQ
        if (isEditMode) {
          const frchqRes = await fetchJson(api(`/api/frchq/${id}`));
          const frchqData = await safeJson(frchqRes);
          if (frchqRes.ok && frchqData) {
            setFrchq(frchqData as Frchq);
            // Pré-remplir le formulaire
            setFormData({
              dateRemise: (frchqData as any).dateRemise.split("T")[0],
              banqueBeneficiaireId: (frchqData as any).banqueBeneficiaire?.id || null,
              compteTresorerieId: (frchqData as any).compteTresorerie?.id || null,
              journalId: (frchqData as any).journal?.id || null,
              observations: (frchqData as any).observations || "",
              feuillesSelectionnees: (frchqData as any).feuillesEncaissement.map((f: FeuilleEncaissement) => f.id),
            });
          } else {
            toast.error("FRCHQ non trouvé");
            navigate("/encaissements/bordereau-cheques");
          }
        }

        // Charger les chèques disponibles
        const feuillesRes = await fetchJson(api("/api/feuilles-encaissement/cheques-disponibles"));
        if (feuillesRes.ok) {
          const fd = await safeJson(feuillesRes);
          setFeuillesDisponibles(toArray<FeuilleEncaissement>(fd?.data || fd));
        } else {
          setFeuillesDisponibles([]);
          toast.error("Impossible de charger les chèques disponibles");
        }
      } catch (error) {
        console.error("Erreur de chargement:", error);
        toast.error("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode, navigate]);

  // Mettre à jour le formulaire
  const handleFormChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Ajouter/retirer un chèque
  const toggleChequeSelection = (feuilleId: number) => {
    setFormData(prev => {
      const isSelected = prev.feuillesSelectionnees.includes(feuilleId);
      return {
        ...prev,
        feuillesSelectionnees: isSelected
          ? prev.feuillesSelectionnees.filter(id => id !== feuilleId)
          : [...prev.feuillesSelectionnees, feuilleId]
      };
    });
  };

  // Sauvegarder le FRCHQ
  const handleSave = async () => {
    if (!formData.banqueBeneficiaireId || !formData.compteTresorerieId) {
      toast.error("Veuillez sélectionner une banque et un compte de trésorerie");
      return;
    }

    if (formData.feuillesSelectionnees.length === 0) {
      toast.error("Veuillez sélectionner au moins un chèque");
      return;
    }

    setIsSaving(true);
    try {
      const url = isEditMode ? api(`/api/frchq/${id}/edit`) : api("/api/frchq/nouveau");
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetchJson(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(isEditMode ? "FRCHQ mis à jour" : "FRCHQ créé avec succès");
        if (!isEditMode) {
          navigate(`/frchq/${data.data.id}`);
        }
      } else {
        toast.error(data.message || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsSaving(false);
    }
  };

  // Actions de statut
  const handleValider = async () => {
    try {
      const response = await fetchJson(api(`/api/frchq/${id}/valider`), {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("FRCHQ validé avec succès");
        setFrchq(data.data);
        setStatutActions(prev => ({ ...prev, showValiderDialog: false }));
      } else {
        toast.error(data.message || "Erreur lors de la validation");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion");
    }
  };

  const handleRemettre = async () => {
    try {
      const response = await fetchJson(api(`/api/frchq/${id}/remettre`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroBrchq: actionData.numeroBrchq || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("FRCHQ remis avec succès");
        setFrchq(data.data);
        setStatutActions(prev => ({ ...prev, showRemettreDialog: false }));
        setActionData(prev => ({ ...prev, numeroBrchq: "" }));
      } else {
        toast.error(data.message || "Erreur lors de la remise");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion");
    }
  };

  const handleEncaisser = async () => {
    try {
      const response = await fetchJson(api(`/api/frchq/${id}/encaisser`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateEncaissement: actionData.dateEncaissement }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("FRCHQ encaissé avec succès");
        setFrchq(data.data);
        setStatutActions(prev => ({ ...prev, showEncaisserDialog: false }));
      } else {
        toast.error(data.message || "Erreur lors de l'encaissement");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion");
    }
  };

  const handleDeclarerImpaye = async () => {
    if (!actionData.motifImpaye.trim()) {
      toast.error("Veuillez saisir un motif");
      return;
    }

    try {
      const response = await fetchJson(api(`/api/frchq/${id}/impaye`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif: actionData.motifImpaye }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("FRCHQ déclaré impayé");
        setFrchq(data.data);
        setStatutActions(prev => ({ ...prev, showImpayeDialog: false }));
        setActionData(prev => ({ ...prev, motifImpaye: "" }));
      } else {
        toast.error(data.message || "Erreur lors de la déclaration d'impayé");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion");
    }
  };

  const handleAnnuler = async () => {
    if (!actionData.motifAnnulation.trim()) {
      toast.error("Veuillez saisir un motif");
      return;
    }

    try {
      const response = await fetchJson(api(`/api/frchq/${id}/annuler`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif: actionData.motifAnnulation }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("FRCHQ annulé avec succès");
        setFrchq(data.data);
        setStatutActions(prev => ({ ...prev, showAnnulerDialog: false }));
        setActionData(prev => ({ ...prev, motifAnnulation: "" }));
      } else {
        toast.error(data.message || "Erreur lors de l'annulation");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion");
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!frchq) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Bordereau de Remise de Chèques (FRCHQ)", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`N° FRCHQ: ${frchq.numeroFrchq}`, 20, 35);
    doc.text(`N° BRCHQ: ${frchq.numeroBrchq || "Non attribué"}`, 20, 42);
    doc.text(`Date remise: ${format(new Date(frchq.dateRemise), "dd/MM/yyyy", { locale: fr })}`, 20, 49);
    doc.text(`Banque bénéficiaire: ${frchq.banqueBeneficiaire?.nom || "Non défini"}`, 20, 56);
    doc.text(`Compte: ${frchq.compteTresorerie?.numero || "Non défini"}`, 20, 63);
    doc.text(`Statut: ${frchq.statutLibelle}`, 20, 70);

    if (frchq.observations) {
      doc.text(`Observations: ${frchq.observations}`, 20, 77);
    }

    const tableData = frchq.feuillesEncaissement.map(cheque => [
      cheque.referenceCheque || "N/A",
      cheque.nomClient,
      format(new Date(cheque.dateEncaissement), "dd/MM/yyyy", { locale: fr }),
      `${parseFloat(cheque.montantPaye).toLocaleString("fr-FR")} FCFA`,
      cheque.statutLibelle
    ]);

    autoTable(doc, {
      startY: 90,
      head: [["N° Chèque", "Client", "Date", "Montant", "Statut"]],
      body: tableData,
      foot: [[
        "", 
        "", 
        "Total:", 
        `${parseFloat(frchq.montantTotal).toLocaleString("fr-FR")} FCFA`,
        `${frchq.nombreCheques} chèque(s)`
      ]]
    });

    doc.save(`FRCHQ_${frchq.numeroFrchq}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
  };

  // Rendu du statut
  const renderStatusBadge = (statut: string) => {
    const colors = {
      brouillon: "bg-gray-100 text-gray-800",
      en_cours: "bg-blue-100 text-blue-800",
      remise: "bg-yellow-100 text-yellow-800",
      encaisse: "bg-green-100 text-green-800",
      impaye: "bg-red-100 text-red-800",
      annule: "bg-slate-100 text-slate-800"
    };

    return (
      <Badge className={colors[statut as keyof typeof colors] || "bg-gray-100"}>
        {frchq?.statutLibelle || "Inconnu"}
      </Badge>
    );
  };

  // Rendu des actions selon le statut
  const renderStatusActions = () => {
    if (!frchq) return null;

    const actions: React.ReactNode[] = []; // ✅ Déclarer explicitement le type

    // Bouton Valider (brouillon uniquement)
    if (frchq.statut === "brouillon") {
      actions.push(
        <AlertDialog key="valider" open={statutActions.showValiderDialog} onOpenChange={(open) => setStatutActions(prev => ({ ...prev, showValiderDialog: open }))}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Valider
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Valider le FRCHQ</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir valider ce bordereau ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleValider}>Valider</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    // Bouton Remettre (en_cours uniquement)
    if (frchq.statut === "en_cours") {
      actions.push(
        <AlertDialog key="remettre" open={statutActions.showRemettreDialog} onOpenChange={(open) => setStatutActions(prev => ({ ...prev, showRemettreDialog: open }))}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Send className="w-4 h-4" />
              Remettre
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remettre le FRCHQ</AlertDialogTitle>
              <AlertDialogDescription>
                Saisissez le numéro BRCHQ (optionnel) et confirmez la remise.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="numeroBrchq">N° BRCHQ (optionnel)</Label>
                <Input
                  id="numeroBrchq"
                  value={actionData.numeroBrchq}
                  onChange={(e) => setActionData(prev => ({ ...prev, numeroBrchq: e.target.value }))}
                  placeholder="BRCHQ-XXX-YYYYMMDD-001"
                />
                <p className="text-xs text-muted-foreground">
                  Laissé vide pour génération automatique
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemettre}>Confirmer la remise</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    // Bouton Encaisser (remise uniquement)
    if (frchq.statut === "remise") {
      actions.push(
        <AlertDialog key="encaisser" open={statutActions.showEncaisserDialog} onOpenChange={(open) => setStatutActions(prev => ({ ...prev, showEncaisserDialog: open }))}>
          <AlertDialogTrigger asChild>
            <Button className="gap-2">
              <FileText className="w-4 h-4" />
              Encaisser
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encaisser le FRCHQ</AlertDialogTitle>
              <AlertDialogDescription>
                Sélectionnez la date d'encaissement et confirmez.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dateEncaissement">Date d'encaissement</Label>
                <Input
                  id="dateEncaissement"
                  type="date"
                  value={actionData.dateEncaissement}
                  onChange={(e) => setActionData(prev => ({ ...prev, dateEncaissement: e.target.value }))}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleEncaisser}>Confirmer l'encaissement</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    // Bouton Déclarer impayé (remise uniquement)
    if (frchq.statut === "remise") {
      actions.push(
        <AlertDialog key="impaye" open={statutActions.showImpayeDialog} onOpenChange={(open) => setStatutActions(prev => ({ ...prev, showImpayeDialog: open }))}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Ban className="w-4 h-4" />
              Déclarer impayé
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Déclarer le FRCHQ impayé</AlertDialogTitle>
              <AlertDialogDescription>
                Saisissez le motif de l'impayé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="motifImpaye">Motif de l'impayé</Label>
                <Textarea
                  id="motifImpaye"
                  value={actionData.motifImpaye}
                  onChange={(e) => setActionData(prev => ({ ...prev, motifImpaye: e.target.value }))}
                  placeholder="Raison de l'impayé..."
                  rows={3}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeclarerImpaye}>Confirmer l'impayé</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    // Bouton Annuler (brouillon, en_cours, remise uniquement)
    if (["brouillon", "en_cours", "remise"].includes(frchq.statut)) {
      actions.push(
        <AlertDialog key="annuler" open={statutActions.showAnnulerDialog} onOpenChange={(open) => setStatutActions(prev => ({ ...prev, showAnnulerDialog: open }))}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Ban className="w-4 h-4" />
              Annuler
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annuler le FRCHQ</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Saisissez le motif d'annulation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="motifAnnulation">Motif d'annulation</Label>
                <Textarea
                  id="motifAnnulation"
                  value={actionData.motifAnnulation}
                  onChange={(e) => setActionData(prev => ({ ...prev, motifAnnulation: e.target.value }))}
                  placeholder="Raison de l'annulation..."
                  rows={3}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleAnnuler}>Confirmer l'annulation</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    return (
      <div className="flex gap-2">
        {actions}
        <Button onClick={handleExportPDF} variant="outline" className="gap-2">
          <FileDown className="w-4 h-4" />
          Exporter PDF
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalMontant = formData.feuillesSelectionnees.reduce((sum, feuilleId) => {
    const feuille = (Array.isArray(feuillesDisponibles) ? feuillesDisponibles : []).find(f => f.id === feuilleId);
    return sum + (feuille ? parseFloat(feuille.montantPaye) : 0);
  }, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">
              {isEditMode ? `FRCHQ ${frchq?.numeroFrchq}` : "Nouveau FRCHQ"}
            </h1>
            {frchq && renderStatusBadge(frchq.statut)}
          </div>
          <p className="text-muted-foreground mt-1">
            {isEditMode 
              ? "Gestion du bordereau de remise de chèques" 
              : "Création d'un nouveau bordereau de remise de chèques"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && renderStatusActions()}
          {!isEditMode && (
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Créer le FRCHQ
            </Button>
          )}
        </div>
      </div>

      {/* Mode édition - Affichage des informations */}
      {isEditMode && frchq && (
        <Card>
          <CardHeader>
            <CardTitle>Informations du FRCHQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">N° FRCHQ</Label>
                <div className="font-semibold">{frchq.numeroFrchq}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">N° BRCHQ</Label>
                <div className="font-semibold">{frchq.numeroBrchq || "Non attribué"}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Date remise</Label>
                <div className="font-semibold">
                  {format(new Date(frchq.dateRemise), "dd/MM/yyyy", { locale: fr })}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Échéance</Label>
                <div className="font-semibold">
                  {frchq.dateEcheance 
                    ? format(new Date(frchq.dateEcheance), "dd/MM/yyyy", { locale: fr })
                    : "Non définie"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Banque bénéficiaire</Label>
                <div className="font-semibold">{frchq.banqueBeneficiaire?.nom || "Non définie"}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Compte</Label>
                <div className="font-semibold">{frchq.compteTresorerie?.numero || "Non défini"}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Journal</Label>
                <div className="font-semibold">{frchq.journal?.code || "Non défini"}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Montant total</Label>
                <div className="font-semibold">
                  {parseFloat(frchq.montantTotal).toLocaleString("fr-FR")} FCFA
                </div>
              </div>
            </div>

            {frchq.observations && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Observations</Label>
                <div className="text-sm bg-muted p-3 rounded-md">{frchq.observations}</div>
              </div>
            )}

            {frchq.motifAnnulation && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Motif d'annulation</Label>
                <div className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">
                  {frchq.motifAnnulation}
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Créé par</Label>
                <div>{frchq.createdBy?.nomComplet || "Inconnu"}</div>
                <div className="text-muted-foreground">
                  {format(new Date(frchq.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                </div>
              </div>
              {frchq.valideBy && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Validé par</Label>
                  <div>{frchq.valideBy.nomComplet}</div>
                  <div className="text-muted-foreground">
                    {format(new Date(frchq.valideAt!), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </div>
                </div>
              )}
              {frchq.remiseBy && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Remis par</Label>
                  <div>{frchq.remiseBy.nomComplet}</div>
                  <div className="text-muted-foreground">
                    {format(new Date(frchq.remiseAt!), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Dernière modification</Label>
                <div>{frchq.updatedBy?.nomComplet || frchq.createdBy?.nomComplet || "Inconnu"}</div>
                <div className="text-muted-foreground">
                  {format(new Date(frchq.updatedAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire (mode création/édition) */}
      {(!isEditMode || (isEditMode && (frchq?.statut === 'brouillon' || frchq?.statut === 'en_cours'))) && (
        <Card>
          <CardHeader>
            <CardTitle>Informations du bordereau</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateRemise">Date de remise *</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="dateRemise"
                    type="date"
                    value={formData.dateRemise}
                    onChange={(e) => handleFormChange("dateRemise", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="banqueBeneficiaire">Banque bénéficiaire *</Label>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={formData.banqueBeneficiaireId?.toString()}
                    onValueChange={(value) => handleFormChange("banqueBeneficiaireId", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une banque" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(banques) ? banques : []).map((banque) => (
                        <SelectItem key={banque.id} value={banque.id.toString()}>
                          {banque.nom} ({banque.codeBanque})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="compteTresorerie">Compte de trésorerie *</Label>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={formData.compteTresorerieId?.toString()}
                    onValueChange={(value) => handleFormChange("compteTresorerieId", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(comptes) ? comptes : []).map((compte) => (
                        <SelectItem key={compte.id} value={compte.id.toString()}>
                          {compte.numero} - {compte.intitule}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="journal">Journal (optionnel)</Label>
                <Select
                  value={formData.journalId?.toString()}
                  onValueChange={(value) => handleFormChange("journalId", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un journal" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(journaux) ? journaux : []).map((journal) => (
                      <SelectItem key={journal.id} value={journal.id.toString()}>
                        {journal.code} - {journal.intitule}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3 space-y-2">
                <Label htmlFor="observations">Observations (optionnel)</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => handleFormChange("observations", e.target.value)}
                  placeholder="Notes complémentaires..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sélection des chèques */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Chèques disponibles</CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {formData.feuillesSelectionnees.length} chèque(s) sélectionné(s) • 
              Total: {totalMontant.toLocaleString("fr-FR")} FCFA
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {feuillesDisponibles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun chèque disponible</p>
              <p className="text-sm">Tous les chèques validés sont déjà associés à un FRCHQ</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Sélection</TableHead>
                  <TableHead>N° Feuille</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>N° Chèque</TableHead>
                  <TableHead>Date encaissement</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feuillesDisponibles.map((feuille) => (
                  <TableRow key={feuille.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={formData.feuillesSelectionnees.includes(feuille.id)}
                        onChange={() => toggleChequeSelection(feuille.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{feuille.numeroFeuille}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {feuille.nomClient}
                      </div>
                    </TableCell>
                    <TableCell>{feuille.referenceCheque || "N/A"}</TableCell>
                    <TableCell>
                      {format(new Date(feuille.dateEncaissement), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-semibold">{feuille.montantPayeFormate}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{feuille.statutLibelle}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isEditMode && (
            <div className="mt-6 flex justify-between items-center border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {formData.feuillesSelectionnees.length === 0 && (
                  <p className="text-destructive">Sélectionnez au moins un chèque</p>
                )}
              </div>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || formData.feuillesSelectionnees.length === 0}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isEditMode ? "Mettre à jour" : "Créer le FRCHQ"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des chèques associés (mode édition) */}
      {isEditMode && frchq && frchq.feuillesEncaissement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chèques associés</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Feuille</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>N° Chèque</TableHead>
                  <TableHead>Date encaissement</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {frchq.feuillesEncaissement.map((feuille) => (
                  <TableRow key={feuille.id}>
                    <TableCell className="font-medium">{feuille.numeroFeuille}</TableCell>
                    <TableCell>{feuille.nomClient}</TableCell>
                    <TableCell>{feuille.referenceCheque || "N/A"}</TableCell>
                    <TableCell>
                      {format(new Date(feuille.dateEncaissement), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-semibold">{feuille.montantPayeFormate}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{feuille.statutLibelle}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>
    </MainLayout>
  );
};

export default BordereauRemiseCheques;