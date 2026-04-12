// Dashboard config — persisted in profiles.dashboard_config (JSONB)
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

async function fetchProfileDashboardConfig(): Promise<DashboardConfig> {
  const res = await fetch("/api/data/profiles");
  if (!res.ok) return { widgets: DEFAULT_WIDGETS };
  const profile = await res.json() as { dashboard_config?: DashboardConfig | null };
  if (profile?.dashboard_config?.widgets) return profile.dashboard_config;
  return { widgets: DEFAULT_WIDGETS };
}

async function saveProfileDashboardConfig(config: DashboardConfig): Promise<void> {
  await fetch("/api/data/profiles", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dashboard_config: config }),
  });
}

export function useDashboardConfig() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["dashboard-config"],
    queryFn: fetchProfileDashboardConfig,
    enabled: !!session?.user?.id,
    placeholderData: { widgets: DEFAULT_WIDGETS },
  });
}

export function useUpdateDashboardConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: DashboardConfig) => {
      await saveProfileDashboardConfig(config);
      return config;
    },
    onSuccess: (config) => {
      queryClient.setQueryData(["dashboard-config"], config);
      toast.success("Dashboard actualizado");
    },
    onError: () => toast.error("Error al guardar el dashboard"),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardWidgetStats,
  });
}
