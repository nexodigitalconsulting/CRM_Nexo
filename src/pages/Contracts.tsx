import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { FilterableDataTable } from "@/components/ui/filterable-data-table";
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
import { Plus, Filter, Calendar, Edit, Trash2, Mail, Download, Send } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import { entityExportConfigs } from "@/lib/exportUtils";
import { useContracts, useDeleteContract, useMarkContractAsSent, ContractWithDetails } from "@/hooks/useContracts";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useDefaultTemplate, extractPdfConfigFromTemplate } from "@/hooks/useDefaultTemplate";
import { downloadContractPdf } from "@/lib/pdf/contractPdf";
import { toast } from "sonner";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { SendEmailDialog } from "@/components/common/SendEmailDialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusMap: Record<string, "active" | "pending" | "inactive" | "danger"> = {
  vigente: "active",
  pendiente_activacion: "pending",
  expirado: "danger",
  cancelado: "inactive",
};

const paymentStatusMap: Record<string, "active" | "pending" | "danger"> = {
  pagado: "active",
  pendiente: "pending",
  parcial: "pending",
  reclamado: "danger",
};

const statusLabels: Record<string, string> = {
  vigente: "Vigente",
  pendiente_activacion: "Pendiente",
  expirado: "Vencido",
  cancelado: "Cancelado",
};

const paymentLabels: Record<string, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  parcial: "Pago Parcial",
  reclamado: "Reclamado",
};

const billingLabels: Record<string, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
  unico: "Puntual",
  otro: "Otro",
};

const columnConfigs: ColumnConfig[] = [
  { key: "name", label: "Contrato", defaultVisible: true },
  { key: "client", label: "Cliente", defaultVisible: true },
  { key: "dates", label: "Período", defaultVisible: true },
  { key: "billing", label: "Facturación", defaultVisible: true },
  { key: "subtotal", label: "Subtotal", defaultVisible: false },
  { key: "iva_total", label: "IVA", defaultVisible: false },
  { key: "total", label: "Total", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
  { key: "paymentStatus", label: "Estado Pago", defaultVisible: true },
  { key: "next_billing_date", label: "Próx. Facturación", defaultVisible: false },
  { key: "notes", label: "Notas", defaultVisible: false },
  { key: "actions", label: "Acciones", defaultVisible: true },
];

export default function Contracts() {
  const { data: contracts = [], isLoading } = useContracts();
  const deleteContract = useDeleteContract();
  const markAsSent = useMarkContractAsSent();
  const { data: companySettings } = useCompanySettings();
  const { data: defaultTemplate } = useDefaultTemplate('contract');
  const { data: defaultView } = useDefaultTableView("contracts");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [billingFilter, setBillingFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailContract, setEmailContract] = useState<ContractWithDetails | null>(null);

  if (defaultView && visibleColumns.length === columnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultView.visible_columns as string[];
    if (cols.length > 0) setVisibleColumns(cols);
  }

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
          <p className="text-xs text-muted-foreground font-mono">
            CN-{String(contract.contract_number).padStart(4, "0")}
          </p>
        </div>
      ),
    },
    {
      key: "client",
      label: "Cliente",
      render: (contract: ContractWithDetails) => (
        <span className="text-sm">{contract.client?.name || "-"}</span>
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
          {billingLabels[contract.billing_period || "mensual"]}
        </span>
      ),
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (contract: ContractWithDetails) => (
        <span className="text-sm">
          {Number(contract.subtotal || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
        </span>
      ),
    },
    {
      key: "iva_total",
      label: "IVA",
      render: (contract: ContractWithDetails) => (
        <span className="text-sm">
          {Number(contract.iva_total || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
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
        <StatusBadge variant={statusMap[contract.status || "pendiente_activacion"]}>
          {statusLabels[contract.status || "pendiente_activacion"]}
        </StatusBadge>
      ),
    },
    {
      key: "paymentStatus",
      label: "Estado Pago",
      render: (contract: ContractWithDetails) => (
        <StatusBadge variant={paymentStatusMap[contract.payment_status || "pendiente"]}>
          {paymentLabels[contract.payment_status || "pendiente"]}
        </StatusBadge>
      ),
    },
    {
      key: "next_billing_date",
      label: "Próx. Facturación",
      render: (contract: ContractWithDetails) => (
        <span className="text-sm text-muted-foreground">
          {contract.next_billing_date 
            ? format(new Date(contract.next_billing_date), "dd MMM yyyy", { locale: es })
            : "-"}
        </span>
      ),
    },
    {
      key: "notes",
      label: "Notas",
      render: (contract: ContractWithDetails) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
          {contract.notes || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (contract: ContractWithDetails) => (
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    try {
                      const contractData = {
                        contract_number: contract.contract_number,
                        name: contract.name,
                        start_date: contract.start_date,
                        end_date: contract.end_date,
                        billing_period: contract.billing_period,
                        subtotal: contract.subtotal,
                        iva_total: contract.iva_total,
                        total: contract.total,
                        notes: contract.notes,
                        status: contract.status,
                        client: contract.client,
                      };
                      const pdfConfig = extractPdfConfigFromTemplate(defaultTemplate);
                      await downloadContractPdf(contractData as any, companySettings as any, pdfConfig);
                      toast.success("PDF descargado");
                    } catch (error) {
                      toast.error("Error al descargar PDF");
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Descargar PDF</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEmailContract(contract);
                    setEmailDialogOpen(true);
                  }}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar por email</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(contract)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(contract)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  const activeContracts = contracts.filter((c) => c.status === "vigente");
  const pendingPayment = contracts.filter((c) => c.payment_status === "pendiente");
  const expiringContracts = contracts.filter((c) => {
    if (!c.end_date) return false;
    const endDate = new Date(c.end_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return endDate <= thirtyDaysFromNow && endDate >= new Date() && c.status === "vigente";
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
              <SelectItem value="vigente">Vigente</SelectItem>
              <SelectItem value="pendiente_activacion">Pendiente</SelectItem>
              <SelectItem value="expirado">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={billingFilter} onValueChange={setBillingFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Facturación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
              <SelectItem value="unico">Puntual</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <TableViewManager
              entityName="contracts"
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              filters={{ status: statusFilter, billing: billingFilter }}
            />
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
          <FilterableDataTable columns={columns} data={contracts || []} visibleColumns={visibleColumns} />
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

      {emailContract && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={(open) => {
            setEmailDialogOpen(open);
            if (!open) setEmailContract(null);
          }}
          entityType="contract"
          entityId={emailContract.id}
          entityNumber={emailContract.contract_number}
          clientName={emailContract.client?.name || ""}
          clientEmail={emailContract.client?.email || ""}
          total={emailContract.total || 0}
          dueDate={emailContract.end_date || undefined}
          entityData={emailContract as unknown as Record<string, unknown>}
          onSendSuccess={() => {
            // Mark contract as sent for automation tracking
            markAsSent.mutate(emailContract.id);
            toast.success("Contrato marcado como enviado");
          }}
        />
      )}
    </div>
  );
}
