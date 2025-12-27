import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Expense = Tables<"expenses">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type ExpenseUpdate = TablesUpdate<"expenses">;

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ["expenses", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Expense;
    },
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: ExpenseInsert) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, created_by: user.user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gasto creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear el gasto: " + error.message);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...expense }: ExpenseUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(expense)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gasto actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar el gasto: " + error.message);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Gasto eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar el gasto: " + error.message);
    },
  });
}

export function useExpenseStats() {
  return useQuery({
    queryKey: ["expenses", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("total, status, issue_date");

      if (error) throw error;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const stats = {
        total: data.length,
        totalAmount: data.reduce((sum, e) => sum + Number(e.total || 0), 0),
        pending: data.filter((e) => e.status === "pending").reduce((sum, e) => sum + Number(e.total || 0), 0),
        paid: data.filter((e) => e.status === "paid").reduce((sum, e) => sum + Number(e.total || 0), 0),
        overdue: data.filter((e) => e.status === "overdue").length,
        thisMonth: data.filter((e) => {
          const date = new Date(e.issue_date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).reduce((sum, e) => sum + Number(e.total || 0), 0),
      };

      return stats;
    },
  });
}
