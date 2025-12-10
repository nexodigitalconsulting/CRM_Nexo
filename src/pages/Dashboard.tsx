import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { DashboardWidgetCard } from "@/components/dashboard/DashboardWidgetCard";
import { StatWidget } from "@/components/dashboard/StatWidget";
import { AddWidgetDialog } from "@/components/dashboard/AddWidgetDialog";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { UpcomingTasksWidget } from "@/components/dashboard/UpcomingTasksWidget";
import { RevenueExpensesChart } from "@/components/dashboard/RevenueExpensesChart";
import { SalesPipelineChart } from "@/components/dashboard/SalesPipelineChart";
import { useDashboardStats } from "@/hooks/useDashboardWidgets";
import type { DashboardWidget } from "@/hooks/useDashboardWidgets";
import {
  Users,
  Building2,
  FileText,
  Receipt,
  Plus,
  Pencil,
  Check,
  Wallet,
  TrendingUp,
  Activity,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

const defaultWidgets: DashboardWidget[] = [
  { id: "stat-contacts", type: "stat", title: "Contactos", entity: "contacts", config: { field: "count" }, size: "small", order: 0 },
  { id: "stat-clients", type: "stat", title: "Clientes Activos", entity: "clients", config: { field: "count" }, size: "small", order: 1 },
  { id: "stat-quotes", type: "stat", title: "Presupuestos Pendientes", entity: "quotes", config: { field: "count" }, size: "small", order: 2 },
  { id: "stat-invoices", type: "stat", title: "Facturación Mensual", entity: "invoices", config: { field: "sum" }, size: "small", order: 3 },
  { id: "widget-activity", type: "activity", title: "Actividad Reciente", config: {}, size: "large", order: 4 },
  { id: "widget-tasks", type: "table", title: "Próximas Tareas", config: {}, size: "medium", order: 5 },
  { id: "widget-revenue", type: "chart", title: "Ingresos vs Gastos", entity: "invoices", config: { chartType: "area" }, size: "large", order: 6 },
  { id: "widget-pipeline", type: "chart", title: "Pipeline de Ventas", entity: "quotes", config: { chartType: "bar" }, size: "large", order: 7 },
];

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const [isEditing, setIsEditing] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [showAddWidget, setShowAddWidget] = useState(false);

  const handleAddWidget = (widget: Omit<DashboardWidget, "id" | "order">) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      order: widgets.length,
    };
    setWidgets([...widgets, newWidget]);
    toast.success("Widget añadido al dashboard");
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter((w) => w.id !== id));
    toast.success("Widget eliminado");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);

  const getWidgetIcon = (entity?: string) => {
    switch (entity) {
      case "contacts": return Users;
      case "clients": return Building2;
      case "quotes": return FileText;
      case "invoices": return Receipt;
      case "expenses": return Wallet;
      default: return FileText;
    }
  };

  const getWidgetValue = (widget: DashboardWidget) => {
    if (!stats) return "—";
    switch (widget.entity) {
      case "contacts": return stats.contacts.count;
      case "clients": return stats.clients.active;
      case "quotes": return stats.quotes.pending;
      case "invoices": return formatCurrency(stats.invoices.monthlyTotal);
      case "expenses": return formatCurrency(stats.expenses.monthlyTotal);
      default: return "—";
    }
  };

  const getWidgetChange = (widget: DashboardWidget) => {
    if (!stats) return undefined;
    switch (widget.entity) {
      case "contacts": return { value: stats.contacts.newThisMonth, label: "este mes" };
      case "clients": return { value: stats.clients.active, label: "activos" };
      case "quotes": return { value: stats.quotes.pending, label: "pendientes" };
      case "invoices": return { value: 0, label: "este mes" };
      case "expenses": return { value: stats.expenses.pending, label: "pendientes" };
      default: return undefined;
    }
  };

  const getWidgetTrend = (widget: DashboardWidget): "up" | "down" | "neutral" => {
    const change = getWidgetChange(widget);
    if (!change) return "neutral";
    return change.value >= 0 ? "up" : "down";
  };

  const statWidgets = widgets.filter((w) => w.type === "stat");
  const otherWidgets = widgets.filter((w) => w.type !== "stat");

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case "activity":
        return <RecentActivityWidget key={widget.id} />;
      case "table":
        if (widget.title.includes("Tarea")) {
          return <UpcomingTasksWidget key={widget.id} />;
        }
        return null;
      case "chart":
        if (widget.config.chartType === "area" || widget.title.includes("Ingresos")) {
          return <RevenueExpensesChart key={widget.id} />;
        }
        if (widget.config.chartType === "bar" || widget.title.includes("Pipeline")) {
          return <SalesPipelineChart key={widget.id} />;
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle="Resumen general de tu CRM"
        actions={
          <div className="flex gap-2">
            {isEditing && (
              <Button variant="outline" onClick={() => setShowAddWidget(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir Widget
              </Button>
            )}
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Guardar
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Dashboard
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stat Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statWidgets.map((widget) => (
            <DashboardWidgetCard
              key={widget.id}
              widget={widget}
              isEditing={isEditing}
              onRemove={() => handleRemoveWidget(widget.id)}
            >
              <StatWidget
                title={widget.title}
                value={getWidgetValue(widget)}
                change={getWidgetChange(widget)}
                icon={getWidgetIcon(widget.entity)}
                trend={getWidgetTrend(widget)}
                format={widget.entity === "invoices" || widget.entity === "expenses" ? "currency" : "number"}
              />
            </DashboardWidgetCard>
          ))}
        </div>

        {/* Expenses Summary Card */}
        {stats && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Resumen Financiero del Mes</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-xl font-semibold text-success">{formatCurrency(stats.invoices.monthlyTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gastos</p>
                <p className="text-xl font-semibold text-destructive">{formatCurrency(stats.expenses.monthlyTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`text-xl font-semibold ${stats.invoices.monthlyTotal - stats.expenses.monthlyTotal >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(stats.invoices.monthlyTotal - stats.expenses.monthlyTotal)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente Cobro</p>
                <p className="text-xl font-semibold text-warning">{formatCurrency(stats.quotes.pendingAmount)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Activity and Tasks Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {otherWidgets.find(w => w.type === "activity") && (
            <div className={`${isEditing ? "ring-2 ring-primary/20 ring-offset-2 rounded-lg relative" : ""} lg:col-span-2`}>
              {isEditing && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10"
                  onClick={() => handleRemoveWidget("widget-activity")}
                >
                  ×
                </Button>
              )}
              <RecentActivityWidget />
            </div>
          )}
          {otherWidgets.find(w => w.type === "table") && (
            <div className={isEditing ? "ring-2 ring-primary/20 ring-offset-2 rounded-lg relative" : ""}>
              {isEditing && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10"
                  onClick={() => handleRemoveWidget("widget-tasks")}
                >
                  ×
                </Button>
              )}
              <UpcomingTasksWidget />
            </div>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {otherWidgets.find(w => w.title.includes("Ingresos") || w.config.chartType === "area") && (
            <div className={isEditing ? "ring-2 ring-primary/20 ring-offset-2 rounded-lg relative" : ""}>
              {isEditing && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10"
                  onClick={() => handleRemoveWidget("widget-revenue")}
                >
                  ×
                </Button>
              )}
              <RevenueExpensesChart />
            </div>
          )}
          {otherWidgets.find(w => w.title.includes("Pipeline") || w.config.chartType === "bar") && (
            <div className={isEditing ? "ring-2 ring-primary/20 ring-offset-2 rounded-lg relative" : ""}>
              {isEditing && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10"
                  onClick={() => handleRemoveWidget("widget-pipeline")}
                >
                  ×
                </Button>
              )}
              <SalesPipelineChart />
            </div>
          )}
        </div>
      </div>

      <AddWidgetDialog
        open={showAddWidget}
        onOpenChange={setShowAddWidget}
        onAdd={handleAddWidget}
      />
    </div>
  );
}
