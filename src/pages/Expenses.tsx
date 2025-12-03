import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Download, Receipt, Eye } from "lucide-react";

interface Expense {
  id: string;
  supplierName: string;
  supplierCif: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  concept: string;
  subtotal: number;
  ivaAmount: number;
  irpfAmount: number;
  total: number;
  status: string;
}

const expenses: Expense[] = [
  {
    id: "GT-2024-0001",
    supplierName: "Hosting Cloud SL",
    supplierCif: "B12345678",
    invoiceNumber: "HC-2024-1234",
    issueDate: "2024-12-01",
    dueDate: "2024-12-31",
    concept: "Servicio hosting anual",
    subtotal: 1200,
    ivaAmount: 252,
    irpfAmount: 0,
    total: 1452,
    status: "pending",
  },
  {
    id: "GT-2024-0002",
    supplierName: "Consultoría Digital SA",
    supplierCif: "A87654321",
    invoiceNumber: "CD-2024-0089",
    issueDate: "2024-11-28",
    dueDate: "2024-12-28",
    concept: "Asesoría técnica",
    subtotal: 800,
    ivaAmount: 168,
    irpfAmount: 120,
    total: 848,
    status: "paid",
  },
  {
    id: "GT-2024-0003",
    supplierName: "Publicidad Online SL",
    supplierCif: "B11223344",
    invoiceNumber: "PO-2024-0567",
    issueDate: "2024-11-15",
    dueDate: "2024-12-15",
    concept: "Campaña Google Ads",
    subtotal: 2500,
    ivaAmount: 525,
    irpfAmount: 0,
    total: 3025,
    status: "overdue",
  },
];

const statusMap: Record<string, "active" | "pending" | "danger"> = {
  paid: "active",
  pending: "pending",
  overdue: "danger",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const columns = [
  {
    key: "id",
    label: "ID",
    render: (expense: Expense) => (
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-xs">{expense.id}</span>
      </div>
    ),
  },
  {
    key: "supplier",
    label: "Proveedor",
    render: (expense: Expense) => (
      <div>
        <p className="font-medium">{expense.supplierName}</p>
        <p className="text-xs text-muted-foreground">{expense.supplierCif}</p>
      </div>
    ),
  },
  {
    key: "invoiceNumber",
    label: "Nº Factura",
    render: (expense: Expense) => <span className="text-sm">{expense.invoiceNumber}</span>,
  },
  {
    key: "concept",
    label: "Concepto",
    render: (expense: Expense) => (
      <span className="text-sm truncate max-w-[200px] block">{expense.concept}</span>
    ),
  },
  {
    key: "issueDate",
    label: "Fecha",
    render: (expense: Expense) => (
      <span className="text-sm">{new Date(expense.issueDate).toLocaleDateString("es-ES")}</span>
    ),
  },
  {
    key: "total",
    label: "Total",
    render: (expense: Expense) => (
      <span className="font-semibold">{formatCurrency(expense.total)}</span>
    ),
  },
  {
    key: "status",
    label: "Estado",
    render: (expense: Expense) => (
      <StatusBadge variant={statusMap[expense.status]}>
        {expense.status === "paid" ? "Pagado" : expense.status === "pending" ? "Pendiente" : "Vencido"}
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

export default function Expenses() {
  const totalPending = expenses
    .filter((e) => e.status === "pending")
    .reduce((sum, e) => sum + e.total, 0);

  const totalPaid = expenses
    .filter((e) => e.status === "paid")
    .reduce((sum, e) => sum + e.total, 0);

  return (
    <div className="animate-fade-in">
      <Header
        title="Gastos"
        subtitle="Gestión de facturas recibidas y gastos"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Gasto
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Gastos</p>
            <p className="text-2xl font-semibold mt-1">{expenses.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-semibold mt-1 text-warning">{formatCurrency(totalPending)}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pagados este mes</p>
            <p className="text-2xl font-semibold mt-1 text-success">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Vencidos</p>
            <p className="text-2xl font-semibold mt-1 text-destructive">
              {expenses.filter((e) => e.status === "overdue").length}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar gastos..." className="sm:w-80" />
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DataTable columns={columns} data={expenses} />
      </div>
    </div>
  );
}
