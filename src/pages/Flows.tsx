import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Workflow, Play, Pause, ExternalLink } from "lucide-react";

interface Flow {
  id: string;
  description: string;
  n8nId: string;
  status: string;
  lastExecution: string;
  executionCount: number;
  successRate: number;
}

const flows: Flow[] = [
  {
    id: "FJ-2024-0001",
    description: "Envío automático de facturas por email",
    n8nId: "workflow_123",
    status: "active",
    lastExecution: "2024-12-02T10:30:00",
    executionCount: 156,
    successRate: 98.5,
  },
  {
    id: "FJ-2024-0002",
    description: "Recordatorio de pago a 7 días del vencimiento",
    n8nId: "workflow_456",
    status: "active",
    lastExecution: "2024-12-02T09:00:00",
    executionCount: 89,
    successRate: 100,
  },
  {
    id: "FJ-2024-0003",
    description: "Generación automática de contratos",
    n8nId: "workflow_789",
    status: "paused",
    lastExecution: "2024-11-28T15:45:00",
    executionCount: 34,
    successRate: 94.1,
  },
  {
    id: "FJ-2024-0004",
    description: "Sincronización con calendario",
    n8nId: "workflow_012",
    status: "inactive",
    lastExecution: "2024-10-15T12:00:00",
    executionCount: 12,
    successRate: 75.0,
  },
];

const statusMap: Record<string, "active" | "pending" | "inactive"> = {
  active: "active",
  paused: "pending",
  inactive: "inactive",
};

const columns = [
  {
    key: "id",
    label: "ID",
    render: (flow: Flow) => (
      <div className="flex items-center gap-2">
        <Workflow className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs">{flow.id}</span>
      </div>
    ),
  },
  {
    key: "description",
    label: "Descripción",
    render: (flow: Flow) => (
      <div>
        <p className="font-medium">{flow.description}</p>
        <p className="text-xs text-muted-foreground">n8n: {flow.n8nId}</p>
      </div>
    ),
  },
  {
    key: "lastExecution",
    label: "Última ejecución",
    render: (flow: Flow) => (
      <span className="text-sm">
        {new Date(flow.lastExecution).toLocaleString("es-ES", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </span>
    ),
  },
  {
    key: "executions",
    label: "Ejecuciones",
    render: (flow: Flow) => <span className="text-sm">{flow.executionCount}</span>,
  },
  {
    key: "successRate",
    label: "Éxito",
    render: (flow: Flow) => (
      <span className={`text-sm font-medium ${flow.successRate >= 95 ? "text-success" : flow.successRate >= 80 ? "text-warning" : "text-destructive"}`}>
        {flow.successRate}%
      </span>
    ),
  },
  {
    key: "status",
    label: "Estado",
    render: (flow: Flow) => (
      <StatusBadge variant={statusMap[flow.status]}>
        {flow.status === "active" ? "Activo" : flow.status === "paused" ? "Pausado" : "Inactivo"}
      </StatusBadge>
    ),
  },
  {
    key: "actions",
    label: "",
    render: (flow: Flow) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {flow.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];

export default function Flows() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Flujos de Trabajo"
        subtitle="Automatizaciones y workflows"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Flujo
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Flujos</p>
            <p className="text-2xl font-semibold mt-1">{flows.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {flows.filter((f) => f.status === "active").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Ejecuciones Totales</p>
            <p className="text-2xl font-semibold mt-1">
              {flows.reduce((sum, f) => sum + f.executionCount, 0)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Tasa de Éxito Media</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {(flows.reduce((sum, f) => sum + f.successRate, 0) / flows.length).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar flujos..." className="sm:w-80" />
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DataTable columns={columns} data={flows} />
      </div>
    </div>
  );
}
