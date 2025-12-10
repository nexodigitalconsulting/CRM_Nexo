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
import { Plus, Filter, Calendar, Edit, Trash2, FileText, Printer } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { entityExportConfigs } from "@/lib/exportUtils";
import { useContracts, useDeleteContract, useContract, ContractWithDetails } from "@/hooks/useContracts";
import { useDefaultTemplate } from "@/hooks/useTemplates";
import { printDocument, formatContractData } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function Contracts() {
  const { data: contracts = [], isLoading } = useContracts();
  const deleteContract = useDeleteContract();
  const { data: contractTemplate } = useDefaultTemplate("contract");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithDetails | null>(null);
  const [contractForPrint, setContractForPrint] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [billingFilter, setBillingFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: fullContract } = useContract(contractForPrint || undefined);

  // Print when contract is loaded
  if (fullContract && contractForPrint && contractTemplate) {
    const data = formatContractData(fullContract as unknown as Record<string, unknown>);
    printDocument({
      template: contractTemplate.content,
      data,
      filename: `contrato-${fullContract.contract_number}.html`,
    });
    setContractForPrint(null);
  }

  const handlePrint = (contractId: string) => {
    if (!contractTemplate) {
      toast.error("No hay plantilla de contrato configurada");
      return;
    }
    setContractForPrint(contractId);
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
    const matchesBilling = billingFilter === "all" || contract.billing_period === billingFilter;
    const matchesSearch = 
      contract.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesBilling && matchesSearch;
  });

  const handleEdit = (contract: ContractWithDetails) => {
    setEditingContract(contract);
    setDialogOpen(true);
  };

  const handleDelete = (contract: ContractWithDetails) => {
    setContractToDelete(contract);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (contractToDelete) {
      deleteContract.mutate(contractToDelete.id);
      setDeleteDialogOpen(false);
      setContractToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingContract(null);
  };

  const columns = [
    {
      key: "name",
      label: "Contrato",
      render: (contract: ContractWithDetails) => (
        <div>
          <p className="font-medium text-foreground">
            {contract.name || `Contrato #${contract.contract_number}`}
          </p>
          <p className="text-xs text-muted-foreground">{contract.client?.name}</p>
        </div>
      ),
    },
    {
      key: "dates",
      label: "Período",
      render: (contract: ContractWithDetails) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(new Date(contract.start_date), "dd MMM", { locale: es })} -{" "}
            {contract.end_date 
              ? format(new Date(contract.end_date), "dd MMM yyyy", { locale: es })
              : "Indefinido"}
          </span>
        </div>
      ),
    },
    {
      key: "billing",
      label: "Facturación",
      render: (contract: ContractWithDetails) => (
        <span className="text-sm">
          {billingLabels[contract.billing_period || "monthly"]}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (contract: ContractWithDetails) => (
        <span className="font-semibold">
          {Number(contract.total || 0).toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          })}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (contract: ContractWithDetails) => (
        <StatusBadge variant={statusMap[contract.status || "pending_activation"]}>
          {statusLabels[contract.status || "pending_activation"]}
        </StatusBadge>
      ),
    },
    {
      key: "paymentStatus",
      label: "Estado Pago",
      render: (contract: ContractWithDetails) => (
        <StatusBadge variant={paymentStatusMap[contract.payment_status || "pending"]}>
          {paymentLabels[contract.payment_status || "pending"]}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (contract: ContractWithDetails) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePrint(contract.id)}
            title="Imprimir"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(contract)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(contract)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const activeContracts = contracts.filter((c) => c.status === "active");
  const pendingPayment = contracts.filter((c) => c.payment_status === "pending");
  const expiringContracts = contracts.filter((c) => {
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return endDate <= thirtyDaysFromNow && endDate >= new Date() && c.status === "active";
  });

  return (
    <div className="animate-fade-in">
      <Header
        title="Contratos"
        subtitle="Gestión de contratos firmados"
        actions={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
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
            <p className="text-2xl font-semibold mt-1">
              {isLoading ? <Skeleton className="h-8 w-12" /> : contracts.length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Vigentes</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {isLoading ? <Skeleton className="h-8 w-12" /> : activeContracts.length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Por Vencer (30 días)</p>
            <p className="text-2xl font-semibold mt-1 text-warning">
              {isLoading ? <Skeleton className="h-8 w-12" /> : expiringContracts.length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pendientes de Pago</p>
            <p className="text-2xl font-semibold mt-1 text-destructive">
              {isLoading ? <Skeleton className="h-8 w-12" /> : pendingPayment.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Buscar contratos..." 
            className="sm:w-80" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Vigente</SelectItem>
              <SelectItem value="pending_activation">Pendiente</SelectItem>
              <SelectItem value="expired">Vencido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={billingFilter} onValueChange={setBillingFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Facturación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
              <SelectItem value="one_time">Puntual</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <ExportDropdown
              data={filteredContracts}
              columns={entityExportConfigs.contracts.columns as any}
              filename={entityExportConfigs.contracts.filename}
            />
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <DataTable columns={columns} data={filteredContracts} />
        )}
      </div>

      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        contract={editingContract}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el contrato
              "{contractToDelete?.name || `#${contractToDelete?.contract_number}`}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
