import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Download, Megaphone, Calendar } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: string;
  source: string;
}

const campaigns: Campaign[] = [
  {
    id: "CP-2024-0001",
    name: "Black Friday 2024",
    description: "Campaña de descuentos especiales",
    startDate: "2024-11-25",
    endDate: "2024-11-30",
    budget: 5000,
    status: "active",
    source: "Google Ads",
  },
  {
    id: "CP-2024-0002",
    name: "Navidad 2024",
    description: "Promoción navideña",
    startDate: "2024-12-01",
    endDate: "2024-12-25",
    budget: 8000,
    status: "scheduled",
    source: "Facebook",
  },
  {
    id: "CP-2024-0003",
    name: "Verano 2024",
    description: "Ofertas de verano",
    startDate: "2024-06-01",
    endDate: "2024-08-31",
    budget: 6000,
    status: "completed",
    source: "Instagram",
  },
];

const statusMap: Record<string, "active" | "pending" | "inactive"> = {
  active: "active",
  scheduled: "pending",
  completed: "inactive",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const columns = [
  {
    key: "id",
    label: "ID",
    render: (campaign: Campaign) => (
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs">{campaign.id}</span>
      </div>
    ),
  },
  {
    key: "name",
    label: "Campaña",
    render: (campaign: Campaign) => (
      <div>
        <p className="font-medium">{campaign.name}</p>
        <p className="text-xs text-muted-foreground">{campaign.description}</p>
      </div>
    ),
  },
  {
    key: "dates",
    label: "Período",
    render: (campaign: Campaign) => (
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>
          {new Date(campaign.startDate).toLocaleDateString("es-ES")} -{" "}
          {new Date(campaign.endDate).toLocaleDateString("es-ES")}
        </span>
      </div>
    ),
  },
  {
    key: "budget",
    label: "Presupuesto",
    render: (campaign: Campaign) => (
      <span className="font-medium">{formatCurrency(campaign.budget)}</span>
    ),
  },
  {
    key: "source",
    label: "Fuente",
    render: (campaign: Campaign) => <span className="text-sm">{campaign.source}</span>,
  },
  {
    key: "status",
    label: "Estado",
    render: (campaign: Campaign) => (
      <StatusBadge variant={statusMap[campaign.status]}>
        {campaign.status === "active" ? "Activa" : campaign.status === "scheduled" ? "Programada" : "Completada"}
      </StatusBadge>
    ),
  },
];

export default function Campaigns() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Campañas"
        subtitle="Gestión de campañas de marketing"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Campaña
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Campañas</p>
            <p className="text-2xl font-semibold mt-1">{campaigns.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Activas</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {campaigns.filter((c) => c.status === "active").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Presupuesto Total</p>
            <p className="text-2xl font-semibold mt-1">
              {formatCurrency(campaigns.reduce((sum, c) => sum + c.budget, 0))}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar campañas..." className="sm:w-80" />
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DataTable columns={columns} data={campaigns} />
      </div>
    </div>
  );
}
