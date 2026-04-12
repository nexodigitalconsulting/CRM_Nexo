// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchDashboardWidgetStats } from "@/lib/api/dashboard";

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
  const { session } = useAuth();

  return useQuery({
    queryKey: ["dashboard-config"],
    queryFn: async () => {
      if (!session?.user?.id) return { widgets: DEFAULT_WIDGETS };
      // Config stored in profile in future — for now return defaults
      return { widgets: DEFAULT_WIDGETS };
    },
  });
}

export function useUpdateDashboardConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: DashboardConfig) => config,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-config"] });
      toast.success("Dashboard actualizado");
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardWidgetStats,
  });
}
