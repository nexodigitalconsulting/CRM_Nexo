import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { FilterableDataTable } from "@/components/ui/filterable-data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Receipt, Eye, Pencil, Trash2 } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import { entityExportConfigs } from "@/lib/exportUtils";
import { useExpenses, useDeleteExpense, useExpenseStats, type Expense } from "@/hooks/useExpenses";
import { ExpenseFormDialog } from "@/components/expenses/ExpenseFormDialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusMap: Record<string, "active" | "pending" | "danger"> = {
  pagado: "active",
  pendiente: "pending",
  vencido: "danger",
};

const statusLabels: Record<string, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  vencido: "Vencido",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("es-ES");

const formatExpenseId = (expenseNumber: string) => expenseNumber || "-";

const columnConfigs: ColumnConfig[] = [
  { key: "id", label: "ID", defaultVisible: true },
  { key: "supplier", label: "Proveedor", defaultVisible: true },
  { key: "invoiceNumber", label: "Nº Factura", defaultVisible: true },
  { key: "concept", label: "Concepto", defaultVisible: true },
  { key: "issueDate", label: "Fecha", defaultVisible: true },
  { key: "dueDate", label: "Vencimiento", defaultVisible: false },
  { key: "subtotal", label: "Subtotal", defaultVisible: false },
  { key: "iva_percent", label: "% IVA", defaultVisible: false },
  { key: "iva_amount", label: "IVA", defaultVisible: false },
  { key: "irpf_percent", label: "% IRPF", defaultVisible: false },
  { key: "irpf_amount", label: "IRPF", defaultVisible: false },
  { key: "total", label: "Total", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
  { key: "notes", label: "Notas", defaultVisible: false },
  { key: "actions", label: "", defaultVisible: true },
];

export default function Expenses() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: stats } = useExpenseStats();
  const deleteExpense = useDeleteExpense();
  const { data: defaultView } = useDefaultTableView("expenses");

  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );

  // Apply default view
  if (defaultView && visibleColumns.length === columnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultView.visible_columns as string[];
    if (cols.length > 0) setVisibleColumns(cols);
  }

  const filteredExpenses = expenses.filter((expense) => {
    const search = searchQuery.toLowerCase();
    return (
      expense.supplier_name.toLowerCase().includes(search) ||
      expense.supplier_cif?.toLowerCase().includes(search) ||
      expense.invoice_number?.toLowerCase().includes(search) ||
      expense.concept?.toLowerCase().includes(search)
    );
  });

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowFormDialog(true);
  };

  const handleDelete = async () => {
    if (deletingExpense) {
      await deleteExpense.mutateAsync(deletingExpense.id);
      setDeletingExpense(null);
    }
  };

  const columns = [
    {
      key: "id",
      label: "ID",
      render: (expense: Expense) => (
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs">{formatExpenseId(expense.expense_number)}</span>
        </div>
      ),
    },
    {
      key: "supplier",
      label: "Proveedor",
      render: (expense: Expense) => (
        <div>
          <p className="font-medium">{expense.supplier_name}</p>
          {expense.supplier_cif && (
            <p className="text-xs text-muted-foreground">{expense.supplier_cif}</p>
          )}
        </div>
      ),
    },
    {
      key: "invoiceNumber",
      label: "Nº Factura",
      render: (expense: Expense) => (
        <span className="text-sm">{expense.invoice_number || "—"}</span>
      ),
    },
    {
      key: "concept",
      label: "Concepto",
      render: (expense: Expense) => (
        <span className="text-sm truncate max-w-[200px] block">
          {expense.concept || "—"}
        </span>
      ),
    },
    {
      key: "issueDate",
      label: "Fecha",
      render: (expense: Expense) => (
        <span className="text-sm">{formatDate(expense.issue_date)}</span>
      ),
    },
    {
      key: "dueDate",
      label: "Vencimiento",
      render: (expense: Expense) => (
        <span className="text-sm">{expense.due_date ? formatDate(expense.due_date) : "—"}</span>
      ),
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (expense: Expense) => (
        <span className="text-sm">{formatCurrency(Number(expense.subtotal))}</span>
      ),
    },
    {
      key: "iva_percent",
      label: "% IVA",
      render: (expense: Expense) => (
        <span className="text-sm">{expense.iva_percent || 21}%</span>
      ),
    },
    {
      key: "iva_amount",
      label: "IVA",
      render: (expense: Expense) => (
        <span className="text-sm">{formatCurrency(Number(expense.iva_amount))}</span>
      ),
    },
    {
      key: "irpf_percent",
      label: "% IRPF",
      render: (expense: Expense) => (
        <span className="text-sm">{expense.irpf_percent || 0}%</span>
      ),
    },
    {
      key: "irpf_amount",
      label: "IRPF",
      render: (expense: Expense) => (
        <span className="text-sm">{formatCurrency(Number(expense.irpf_amount))}</span>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (expense: Expense) => (
        <span className="font-semibold">{formatCurrency(Number(expense.total))}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (expense: Expense) => (
        <StatusBadge variant={statusMap[expense.status || "pendiente"]}>
          {statusLabels[expense.status || "pendiente"]}
        </StatusBadge>
      ),
    },
    {
      key: "notes",
      label: "Notas",
      render: (expense: Expense) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
          {expense.notes || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (expense: Expense) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(expense)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeletingExpense(expense)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <Header
        title="Gastos"
        subtitle="Gestión de facturas recibidas y gastos"
        actions={
          <Button className="gap-2" onClick={() => setShowFormDialog(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Gasto
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Gastos</p>
            <p className="text-2xl font-semibold mt-1">{stats?.total || 0}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-semibold mt-1 text-warning">
              {formatCurrency(stats?.pending || 0)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pagados este mes</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {formatCurrency(stats?.paid || 0)}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Vencidos</p>
            <p className="text-2xl font-semibold mt-1 text-destructive">
              {stats?.overdue || 0}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Buscar gastos..."
            className="sm:w-80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <TableViewManager
              entityName="expenses"
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              filters={{}}
            />
            <ExportDropdown
              data={filteredExpenses}
              columns={entityExportConfigs.expenses.columns as any}
              filename={entityExportConfigs.expenses.filename}
            />
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Cargando gastos...
          </div>
        ) : (
          <FilterableDataTable columns={columns} data={expenses || []} visibleColumns={visibleColumns} />
        )}
      </div>

      {/* Form Dialog */}
      <ExpenseFormDialog
        open={showFormDialog}
        onOpenChange={(open) => {
          setShowFormDialog(open);
          if (!open) setEditingExpense(null);
        }}
        expense={editingExpense}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el gasto
              de {deletingExpense?.supplier_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
