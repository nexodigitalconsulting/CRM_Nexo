import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Download, CreditCard, FileText, FileCode } from "lucide-react";

interface Remittance {
  id: string;
  code: string;
  issueDate: string;
  totalAmount: number;
  invoiceCount: number;
  status: string;
  hasXml: boolean;
  hasN19: boolean;
}

const remittances: Remittance[] = [
  {
    id: "RM-2024-0001",
    code: "REM-DIC-2024-001",
    issueDate: "2024-12-01",
    totalAmount: 12500,
    invoiceCount: 5,
    status: "pending",
    hasXml: true,
    hasN19: true,
  },
  {
    id: "RM-2024-0002",
    code: "REM-NOV-2024-003",
    issueDate: "2024-11-15",
    totalAmount: 8750,
    invoiceCount: 3,
    status: "paid",
    hasXml: true,
    hasN19: true,
  },
  {
    id: "RM-2024-0003",
    code: "REM-NOV-2024-002",
    issueDate: "2024-11-01",
    totalAmount: 15200,
    invoiceCount: 7,
    status: "partial",
    hasXml: true,
    hasN19: false,
  },
];

const statusMap: Record<string, "active" | "pending" | "danger"> = {
  paid: "active",
  pending: "pending",
  partial: "pending",
  overdue: "danger",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const columns = [
  {
    key: "code",
    label: "Código Remesa",
    render: (remittance: Remittance) => (
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono font-medium">{remittance.code}</span>
      </div>
    ),
  },
  {
    key: "issueDate",
    label: "Fecha Emisión",
    render: (remittance: Remittance) => (
      <span className="text-sm">{new Date(remittance.issueDate).toLocaleDateString("es-ES")}</span>
    ),
  },
  {
    key: "invoiceCount",
    label: "Facturas",
    render: (remittance: Remittance) => (
      <span className="text-sm">{remittance.invoiceCount} facturas</span>
    ),
  },
  {
    key: "totalAmount",
    label: "Importe Total",
    render: (remittance: Remittance) => (
      <span className="font-semibold">{formatCurrency(remittance.totalAmount)}</span>
    ),
  },
  {
    key: "status",
    label: "Estado",
    render: (remittance: Remittance) => (
      <StatusBadge variant={statusMap[remittance.status]}>
        {remittance.status === "paid" ? "Cobrada" : remittance.status === "pending" ? "Pendiente" : "Parcial"}
      </StatusBadge>
    ),
  },
  {
    key: "files",
    label: "Ficheros",
    render: (remittance: Remittance) => (
      <div className="flex gap-2">
        {remittance.hasXml && (
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
            <FileCode className="h-3 w-3" />
            XML
          </Button>
        )}
        {remittance.hasN19 && (
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
            <FileText className="h-3 w-3" />
            N19
          </Button>
        )}
      </div>
    ),
  },
];

export default function Remittances() {
  const totalPending = remittances
    .filter((r) => r.status === "pending" || r.status === "partial")
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const totalPaid = remittances
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="animate-fade-in">
      <Header
        title="Remesas de Cobro"
        subtitle="Gestión de domiciliaciones bancarias SEPA"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Remesa
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Remesas</p>
            <p className="text-2xl font-semibold mt-1">{remittances.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pendiente de Cobro</p>
            <p className="text-2xl font-semibold mt-1 text-warning">{formatCurrency(totalPending)}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Cobrado</p>
            <p className="text-2xl font-semibold mt-1 text-success">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Facturas incluidas</p>
            <p className="text-2xl font-semibold mt-1">
              {remittances.reduce((sum, r) => sum + r.invoiceCount, 0)}
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <h3 className="font-medium mb-2">Formatos de exportación disponibles</h3>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              <span><strong>XML SEPA</strong> - ISO 20022 pain.008 (estándar europeo)</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span><strong>Norma 19</strong> - Formato tradicional español</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar remesas..." className="sm:w-80" />
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DataTable columns={columns} data={remittances} />
      </div>
    </div>
  );
}
