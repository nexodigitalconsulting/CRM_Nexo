import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Receipt, Eye, Pencil, Trash2 } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
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
  paid: "active",
  pending: "pending",
  overdue: "danger",
};

const statusLabels: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("es-ES");

const formatExpenseId = (expenseNumber: number) =>
  `GT-${new Date().getFullYear()}-${String(expenseNumber).padStart(4, "0")}`;

export default function Expenses() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: stats } = useExpenseStats();
  const deleteExpense = useDeleteExpense();

  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
        <StatusBadge variant={statusMap[expense.status || "pending"]}>
          {statusLabels[expense.status || "pending"]}
        </StatusBadge>
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
          <DataTable columns={columns} data={filteredExpenses} />
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
