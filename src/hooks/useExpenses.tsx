// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchExpenses,
  fetchExpense as fetchExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseRow,
  type ExpenseInsert as ExpenseInsertApi,
  type ExpenseUpdate as ExpenseUpdateApi,
} from "@/lib/api/expenses";
import { useAuth } from "@/hooks/useAuth";

export type Expense = ExpenseRow;
export type ExpenseInsert = ExpenseInsertApi;
export type ExpenseUpdate = Partial<ExpenseInsertApi>;

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ["expenses", id],
    queryFn: () => fetchExpenseById(id),
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (expense: ExpenseInsert) =>
      createExpense({ ...expense, created_by: session?.user?.id ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gasto creado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear el gasto: " + error.message);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...expense }: ExpenseUpdate & { id: string }) =>
      updateExpense(id, expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gasto actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar el gasto: " + error.message);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gasto eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar el gasto: " + error.message);
    },
  });
}

export function useExpenseStats() {
  return useQuery({
    queryKey: ["expenses", "stats"],
    queryFn: async () => {
      const data = await fetchExpenses();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      return {
        total: data.length,
        totalAmount: data.reduce((sum, e) => sum + Number(e.total || 0), 0),
        pending: data.filter((e) => e.status === "pendiente").reduce((sum, e) => sum + Number(e.total || 0), 0),
        paid: data.filter((e) => e.status === "pagado").reduce((sum, e) => sum + Number(e.total || 0), 0),
        overdue: data.filter((e) => e.status === "vencido").length,
        thisMonth: data
          .filter((e) => {
            const date = new Date(e.issue_date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          })
          .reduce((sum, e) => sum + Number(e.total || 0), 0),
      };
    },
  });
}
