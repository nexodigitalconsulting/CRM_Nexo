"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Workflow, Play, Pause, Trash2, ExternalLink } from "lucide-react";
import { useFlows, useCreateFlow, useUpdateFlow, useDeleteFlow } from "@/hooks/useFlows";
import type { FlowRow, FlowInsertPayload } from "@/lib/api/flows";

const statusMap: Record<FlowRow["status"], "active" | "pending" | "inactive"> = {
  active: "active",
  paused: "pending",
  inactive: "inactive",
};

const statusLabel: Record<FlowRow["status"], string> = {
  active: "Activo",
  paused: "Pausado",
  inactive: "Inactivo",
};

function FlowDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<FlowInsertPayload>;
}) {
  const createFlow = useCreateFlow();
  const [form, setForm] = useState<FlowInsertPayload>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    n8n_workflow_id: initial?.n8n_workflow_id ?? "",
    status: initial?.status ?? "inactive",
    trigger_type: initial?.trigger_type ?? "manual",
  });

  const handleSave = async () => {
    await createFlow.mutateAsync(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Flujo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre del flujo" />
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Input value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descripción breve" />
          </div>
          <div className="space-y-1">
            <Label>ID Workflow n8n</Label>
            <Input value={form.n8n_workflow_id ?? ""} onChange={(e) => setForm((p) => ({ ...p, n8n_workflow_id: e.target.value }))} placeholder="workflow_xxx" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as FlowRow["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Trigger</Label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm((p) => ({ ...p, trigger_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="scheduled">Programado</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name || createFlow.isPending}>
            {createFlow.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Flows() {
  const { data: flowList = [], isLoading } = useFlows();
  const updateFlow = useUpdateFlow();
  const deleteFlow = useDeleteFlow();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = flowList.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (f.n8n_workflow_id ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = (flow: FlowRow) => {
    const next: FlowRow["status"] = flow.status === "active" ? "paused" : "active";
    updateFlow.mutate({ id: flow.id, data: { status: next } });
  };

  const columns = [
    {
      key: "name",
      label: "Flujo",
      render: (flow: FlowRow) => (
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">{flow.name}</p>
            {flow.n8n_workflow_id && (
              <p className="text-xs text-muted-foreground">n8n: {flow.n8n_workflow_id}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      label: "Descripción",
      render: (flow: FlowRow) => (
        <span className="text-sm text-muted-foreground">{flow.description ?? "—"}</span>
      ),
    },
    {
      key: "lastExecution",
      label: "Última ejecución",
      render: (flow: FlowRow) => (
        <span className="text-sm">
          {flow.last_run_at
            ? new Date(flow.last_run_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
            : "—"}
        </span>
      ),
    },
    {
      key: "executions",
      label: "Ejecuciones",
      render: (flow: FlowRow) => <span className="text-sm">{flow.execution_count}</span>,
    },
    {
      key: "successRate",
      label: "Éxito",
      render: (flow: FlowRow) => (
        <span
          className={`text-sm font-medium ${
            flow.success_rate >= 95
              ? "text-success"
              : flow.success_rate >= 80
              ? "text-warning"
              : "text-destructive"
          }`}
        >
          {flow.execution_count > 0 ? `${flow.success_rate}%` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (flow: FlowRow) => (
        <StatusBadge variant={statusMap[flow.status]}>{statusLabel[flow.status]}</StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (flow: FlowRow) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => toggleStatus(flow)}
            disabled={updateFlow.isPending}
            title={flow.status === "active" ? "Pausar" : "Activar"}
          >
            {flow.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          {flow.n8n_workflow_id && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
              title="Abrir en n8n"
            >
              <a href={`/n8n/workflow/${flow.n8n_workflow_id}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => deleteFlow.mutate(flow.id)}
            disabled={deleteFlow.isPending}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = flowList.filter((f) => f.status === "active").length;
  const totalExec = flowList.reduce((sum, f) => sum + f.execution_count, 0);
  const avgSuccess =
    flowList.length > 0
      ? flowList.reduce((sum, f) => sum + f.success_rate, 0) / flowList.length
      : 0;

  return (
    <div className="animate-fade-in">
      <Header
        title="Flujos de Trabajo"
        subtitle="Automatizaciones y workflows"
        actions={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Flujo
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Flujos</p>
            <p className="text-2xl font-semibold mt-1">{flowList.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-semibold mt-1 text-success">{activeCount}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Ejecuciones Totales</p>
            <p className="text-2xl font-semibold mt-1">{totalExec}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Tasa de Éxito Media</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {flowList.length > 0 ? `${avgSuccess.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Buscar flujos..."
            className="sm:w-80"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Cargando flujos...</div>
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </div>

      <FlowDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
