import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WidgetType = "stat" | "chart" | "table" | "activity";
export type WidgetSize = "small" | "medium" | "large";
export type WidgetHeight = "auto" | "small" | "medium" | "large";

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  entity?: string;
  config: Record<string, unknown>;
  size: WidgetSize;
  height?: WidgetHeight;
  order: number;
}

export interface DashboardConfig {
  widgets: DashboardWidget[];
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "stat-contacts", type: "stat", title: "Contactos", entity: "contacts", config: { field: "count" }, size: "small", order: 0 },
  { id: "stat-clients", type: "stat", title: "Clientes Activos", entity: "clients", config: { field: "count", filter: { status: "active" } }, size: "small", order: 1 },
  { id: "stat-quotes", type: "stat", title: "Presupuestos Pendientes", entity: "quotes", config: { field: "count", filter: { status: "pending" } }, size: "small", order: 2 },
  { id: "stat-invoices", type: "stat", title: "Facturación Mensual", entity: "invoices", config: { field: "sum", sumField: "total" }, size: "small", order: 3 },
  { id: "activity-recent", type: "activity", title: "Actividad Reciente", config: {}, size: "large", order: 4 },
  { id: "chart-pipeline", type: "chart", title: "Pipeline de Ventas", entity: "quotes", config: { chartType: "bar" }, size: "large", order: 5 },
];

export function useDashboardConfig() {
  return useQuery({
    queryKey: ["dashboard-config"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { widgets: DEFAULT_WIDGETS };

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.user.id)
        .single();

      // For now, return default widgets - we'll store config in profile later
      return { widgets: DEFAULT_WIDGETS };
    },
  });
}

export function useUpdateDashboardConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: DashboardConfig) => {
      // For now, just update local state
      // In the future, we can store this in the profile or a separate table
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-config"] });
      toast.success("Dashboard actualizado");
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [contacts, clients, quotes, invoices, expenses] = await Promise.all([
        supabase.from("contacts").select("id, status, created_at", { count: "exact" }),
        supabase.from("clients").select("id, status, created_at", { count: "exact" }),
        supabase.from("quotes").select("id, status, total, created_at", { count: "exact" }),
        supabase.from("invoices").select("id, status, total, issue_date", { count: "exact" }),
        supabase.from("expenses").select("id, status, total, issue_date", { count: "exact" }),
      ]);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyInvoices = invoices.data?.filter((inv) => {
        const date = new Date(inv.issue_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }) || [];

      const monthlyExpenses = expenses.data?.filter((exp) => {
        const date = new Date(exp.issue_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }) || [];

      return {
        contacts: {
          count: contacts.count || 0,
          newThisMonth: contacts.data?.filter((c) => {
            const date = new Date(c.created_at);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          }).length || 0,
        },
        clients: {
          count: clients.count || 0,
          active: clients.data?.filter((c) => c.status === "activo").length || 0,
        },
        quotes: {
          count: quotes.count || 0,
          pending: quotes.data?.filter((q) => q.status === "borrador" || q.status === "enviado").length || 0,
          pendingAmount: quotes.data?.filter((q) => q.status === "borrador" || q.status === "enviado").reduce((sum, q) => sum + Number(q.total || 0), 0) || 0,
        },
        invoices: {
          count: invoices.count || 0,
          monthlyTotal: monthlyInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0),
          pending: invoices.data?.filter((inv) => inv.status === "emitida").length || 0,
        },
        expenses: {
          count: expenses.count || 0,
          monthlyTotal: monthlyExpenses.reduce((sum, exp) => sum + Number(exp.total || 0), 0),
          pending: expenses.data?.filter((exp) => exp.status === "pendiente").length || 0,
        },
      };
    },
  });
}
