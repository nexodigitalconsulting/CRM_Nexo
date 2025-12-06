import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Download, FileText, Calendar, Edit, Trash2 } from "lucide-react";
import { useContracts, useDeleteContract, ContractWithDetails } from "@/hooks/useContracts";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusMap: Record<string, "active" | "pending" | "inactive" | "danger"> = {
  active: "active",
  pending_activation: "pending",
  expired: "danger",
  cancelled: "inactive",
};

const paymentStatusMap: Record<string, "active" | "pending" | "danger"> = {
  paid: "active",
  pending: "pending",
  partial: "pending",
  claimed: "danger",
};

const statusLabels: Record<string, string> = {
  active: "Vigente",
  pending_activation: "Pendiente",
  expired: "Vencido",
  cancelled: "Cancelado",
};

const paymentLabels: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  partial: "Pago Parcial",
  claimed: "Reclamado",
};

const billingLabels: Record<string, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  annual: "Anual",
  one_time: "Puntual",
  other: "Otro",
};
  {
    key: "name",
    label: "Contrato",
    render: (contract: Contract) => (
      <div>
        <p className="font-medium text-foreground">{contract.name}</p>
        <p className="text-xs text-muted-foreground">{contract.client}</p>
      </div>
    ),
  },
  {
    key: "dates",
    label: "Período",
    render: (contract: Contract) => (
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>
          {new Date(contract.startDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} -{" "}
          {new Date(contract.endDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>
    ),
  },
  {
    key: "billing",
    label: "Facturación",
    render: (contract: Contract) => (
      <span className="text-sm">{contract.billing}</span>
    ),
  },
  {
    key: "status",
    label: "Estado",
    render: (contract: Contract) => (
      <StatusBadge variant={statusMap[contract.status]}>
        {contract.status}
      </StatusBadge>
    ),
  },
  {
    key: "paymentStatus",
    label: "Estado Pago",
    render: (contract: Contract) => (
      <StatusBadge variant={paymentStatusMap[contract.paymentStatus]}>
        {contract.paymentStatus}
      </StatusBadge>
    ),
  },
];

export default function Contracts() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Contratos"
        subtitle="Gestión de contratos firmados"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Contrato
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Contratos</p>
            <p className="text-2xl font-semibold mt-1">{contracts.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Vigentes</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {contracts.filter((c) => c.status === "Vigente").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Por Vencer (30 días)</p>
            <p className="text-2xl font-semibold mt-1 text-warning">3</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pendientes de Pago</p>
            <p className="text-2xl font-semibold mt-1 text-destructive">
              {contracts.filter((c) => c.paymentStatus === "Pendiente de Pago").length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar contratos..." className="sm:w-80" />
          <Select>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="vigente">Vigente</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Facturación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="puntual">Puntual</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable columns={columns} data={contracts} />
      </div>
    </div>
  );
}
