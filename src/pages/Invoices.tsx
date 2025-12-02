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
import { Plus, Filter, Download, FileText, Eye } from "lucide-react";

interface Invoice {
  id: string;
  client: string;
  clientCif: string;
  issueDate: string;
  dueDate: string;
  baseAmount: number;
  iva: number;
  total: number;
  status: string;
}

const invoices: Invoice[] = [
  {
    id: "FF-2024-0156",
    client: "Tech Solutions SL",
    clientCif: "B12345678",
    issueDate: "2024-12-01",
    dueDate: "2024-12-31",
    baseAmount: 2500,
    iva: 525,
    total: 3025,
    status: "Emitida",
  },
  {
    id: "FF-2024-0155",
    client: "Digital Labs SA",
    clientCif: "A87654321",
    issueDate: "2024-11-28",
    dueDate: "2024-12-28",
    baseAmount: 1800,
    iva: 378,
    total: 2178,
    status: "Cobrado",
  },
  {
    id: "FF-2024-0154",
    client: "Innovación Global",
    clientCif: "B11223344",
    issueDate: "2024-11-25",
    dueDate: "2024-12-25",
    baseAmount: 950,
    iva: 199.5,
    total: 1149.5,
    status: "Emitida",
  },
  {
    id: "FF-2024-0153",
    client: "Acme Corporation",
    clientCif: "B99887766",
    issueDate: "2024-11-20",
    dueDate: "2024-12-20",
    baseAmount: 4200,
    iva: 882,
    total: 5082,
    status: "Borrador",
  },
  {
    id: "FF-2024-0152",
    client: "María López Consulting",
    clientCif: "44556677X",
    issueDate: "2024-11-15",
    dueDate: "2024-12-15",
    baseAmount: 750,
    iva: 157.5,
    total: 907.5,
    status: "Cancelada",
  },
];

const statusMap: Record<string, "new" | "active" | "pending" | "inactive" | "danger"> = {
  Borrador: "inactive",
  Emitida: "pending",
  Cobrado: "active",
  Cancelada: "danger",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const columns = [
  {
    key: "id",
    label: "Nº Factura",
    render: (invoice: Invoice) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono font-medium text-foreground">{invoice.id}</span>
      </div>
    ),
  },
  {
    key: "client",
    label: "Cliente",
    render: (invoice: Invoice) => (
      <div>
        <p className="font-medium text-foreground">{invoice.client}</p>
        <p className="text-xs text-muted-foreground">{invoice.clientCif}</p>
      </div>
    ),
  },
  {
    key: "issueDate",
    label: "Fecha Emisión",
    render: (invoice: Invoice) => (
      <span className="text-sm">
        {new Date(invoice.issueDate).toLocaleDateString("es-ES")}
      </span>
    ),
  },
  {
    key: "dueDate",
    label: "Vencimiento",
    render: (invoice: Invoice) => (
      <span className="text-sm">
        {new Date(invoice.dueDate).toLocaleDateString("es-ES")}
      </span>
    ),
  },
  {
    key: "baseAmount",
    label: "Base Imponible",
    render: (invoice: Invoice) => (
      <span className="text-sm">{formatCurrency(invoice.baseAmount)}</span>
    ),
  },
  {
    key: "total",
    label: "Total",
    render: (invoice: Invoice) => (
      <span className="font-semibold text-foreground">
        {formatCurrency(invoice.total)}
      </span>
    ),
  },
  {
    key: "status",
    label: "Estado",
    render: (invoice: Invoice) => (
      <StatusBadge variant={statusMap[invoice.status]}>
        {invoice.status}
      </StatusBadge>
    ),
  },
  {
    key: "actions",
    label: "",
    render: () => (
      <Button variant="ghost" size="icon">
        <Eye className="h-4 w-4" />
      </Button>
    ),
  },
];

export default function Invoices() {
  const totalEmitidas = invoices
    .filter((i) => i.status === "Emitida")
    .reduce((sum, i) => sum + i.total, 0);

  const totalCobrado = invoices
    .filter((i) => i.status === "Cobrado")
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="animate-fade-in">
      <Header
        title="Facturas"
        subtitle="Gestión de facturación"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Facturas</p>
            <p className="text-2xl font-semibold mt-1">{invoices.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pendientes de Cobro</p>
            <p className="text-2xl font-semibold mt-1 text-warning">
              {formatCurrency(totalEmitidas)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Cobrado este mes</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {formatCurrency(totalCobrado)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Media por factura</p>
            <p className="text-2xl font-semibold mt-1">
              {formatCurrency(
                invoices.reduce((sum, i) => sum + i.total, 0) / invoices.length
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar facturas..." className="sm:w-80" />
          <Select>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="emitida">Emitida</SelectItem>
              <SelectItem value="cobrado">Cobrado</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
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
        <DataTable columns={columns} data={invoices} />
      </div>
    </div>
  );
}
