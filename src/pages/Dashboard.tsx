import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { DashboardWidgetCard } from "@/components/dashboard/DashboardWidgetCard";
import { StatWidget } from "@/components/dashboard/StatWidget";
import { AddWidgetDialog } from "@/components/dashboard/AddWidgetDialog";
import { EditWidgetDialog } from "@/components/dashboard/EditWidgetDialog";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { UpcomingTasksWidget } from "@/components/dashboard/UpcomingTasksWidget";
import { RevenueExpensesChart } from "@/components/dashboard/RevenueExpensesChart";
import { SalesPipelineChart } from "@/components/dashboard/SalesPipelineChart";
import { DynamicTableWidget } from "@/components/dashboard/DynamicTableWidget";
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
  GripVertical,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const defaultWidgets: DashboardWidget[] = [
  { id: "stat-contacts", type: "stat", title: "Contactos", entity: "contacts", config: { field: "count" }, size: "small", order: 0 },
  { id: "stat-clients", type: "stat", title: "Clientes Activos", entity: "clients", config: { field: "count" }, size: "small", order: 1 },
  { id: "stat-quotes", type: "stat", title: "Presupuestos Pendientes", entity: "quotes", config: { field: "count" }, size: "small", order: 2 },
  { id: "stat-invoices", type: "stat", title: "Facturación Mensual", entity: "invoices", config: { field: "sum" }, size: "small", order: 3 },
  { id: "widget-activity", type: "activity", title: "Actividad Reciente", config: {}, size: "large", order: 4 },
  { id: "widget-tasks", type: "table", title: "Próximas Tareas", config: { isTaskWidget: true }, size: "medium", order: 5 },
  { id: "widget-revenue", type: "chart", title: "Ingresos vs Gastos", entity: "invoices", config: { chartType: "area" }, size: "large", order: 6 },
  { id: "widget-pipeline", type: "chart", title: "Pipeline de Ventas", entity: "quotes", config: { chartType: "bar" }, size: "large", order: 7 },
];

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const [isEditing, setIsEditing] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);

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

  const handleEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget);
  };

  const handleSaveWidget = (updatedWidget: DashboardWidget) => {
    setWidgets(widgets.map(w => w.id === updatedWidget.id ? updatedWidget : w));
    toast.success("Widget actualizado");
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    if (!isEditing) return;
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    if (!isEditing || draggedWidget === widgetId) return;
    setDragOverWidget(widgetId);
  };

  const handleDragEnd = () => {
    if (draggedWidget && dragOverWidget && draggedWidget !== dragOverWidget) {
      const newWidgets = [...widgets];
      const draggedIndex = newWidgets.findIndex(w => w.id === draggedWidget);
      const dropIndex = newWidgets.findIndex(w => w.id === dragOverWidget);
      
      const [draggedItem] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(dropIndex, 0, draggedItem);
      
      // Update order
      newWidgets.forEach((w, i) => w.order = i);
      setWidgets(newWidgets);
    }
    setDraggedWidget(null);
    setDragOverWidget(null);
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

  const statWidgets = widgets.filter((w) => w.type === "stat").sort((a, b) => a.order - b.order);
  const otherWidgets = widgets.filter((w) => w.type !== "stat").sort((a, b) => a.order - b.order);

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case "activity":
        return <RecentActivityWidget key={widget.id} />;
      case "table":
        // Check if it's the special tasks widget
        if (widget.config?.isTaskWidget || widget.title.includes("Tarea")) {
          return <UpcomingTasksWidget key={widget.id} />;
        }
        // Otherwise render dynamic table with entity data
        return <DynamicTableWidget key={widget.id} title={widget.title} entity={widget.entity} />;
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

  const getWidgetGridClass = (widget: DashboardWidget) => {
    if (widget.type === "activity") return "lg:col-span-2";
    if (widget.type === "chart") return "";
    return "";
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
        {/* Stat Widgets - Draggable */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statWidgets.map((widget) => (
            <div
              key={widget.id}
              draggable={isEditing}
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragEnd={handleDragEnd}
              onDoubleClick={() => handleEditWidget(widget)}
              className={cn(
                "relative transition-all",
                isEditing && "cursor-grab active:cursor-grabbing",
                draggedWidget === widget.id && "opacity-50",
                dragOverWidget === widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg",
                "hover:ring-1 hover:ring-primary/30"
              )}
              title="Doble clic para editar"
            >
              {isEditing && (
                <>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute -top-2 -left-2 h-6 w-6 rounded-full shadow-md z-10 bg-background"
                    onClick={() => handleEditWidget(widget)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10"
                    onClick={() => handleRemoveWidget(widget.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
              <DashboardWidgetCard
                widget={widget}
                isEditing={false}
                onRemove={() => {}}
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
            </div>
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

        {/* Activity and Tasks Row - Draggable */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {otherWidgets.filter(w => w.type === "activity" || w.type === "table").map((widget) => (
            <div
              key={widget.id}
              draggable={isEditing}
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragEnd={handleDragEnd}
              onDoubleClick={() => handleEditWidget(widget)}
              className={cn(
                "relative transition-all",
                getWidgetGridClass(widget),
                isEditing && "cursor-grab active:cursor-grabbing",
                draggedWidget === widget.id && "opacity-50",
                dragOverWidget === widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg",
                "hover:ring-1 hover:ring-primary/30"
              )}
              title="Doble clic para editar"
            >
              {isEditing && (
                <>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute -top-2 -left-2 h-6 w-6 rounded-full shadow-md z-10 bg-background"
                    onClick={() => handleEditWidget(widget)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10"
                    onClick={() => handleRemoveWidget(widget.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
              {renderWidget(widget)}
            </div>
          ))}
        </div>

        {/* Charts Row - Draggable */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {otherWidgets.filter(w => w.type === "chart").map((widget) => (
            <div
              key={widget.id}
              draggable={isEditing}
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragEnd={handleDragEnd}
              onDoubleClick={() => handleEditWidget(widget)}
              className={cn(
                "relative transition-all",
                isEditing && "cursor-grab active:cursor-grabbing",
                draggedWidget === widget.id && "opacity-50",
                dragOverWidget === widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg",
                "hover:ring-1 hover:ring-primary/30"
              )}
              title="Doble clic para editar"
            >
              {isEditing && (
                <>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute -top-2 -left-2 h-6 w-6 rounded-full shadow-md z-10 bg-background"
                    onClick={() => handleEditWidget(widget)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10"
                    onClick={() => handleRemoveWidget(widget.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
              {renderWidget(widget)}
            </div>
          ))}
        </div>
      </div>

      <AddWidgetDialog
        open={showAddWidget}
        onOpenChange={setShowAddWidget}
        onAdd={handleAddWidget}
      />

      <EditWidgetDialog
        open={!!editingWidget}
        onOpenChange={(open) => !open && setEditingWidget(null)}
        widget={editingWidget}
        onSave={handleSaveWidget}
      />
    </div>
  );
}
