import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardWidgetCard } from "@/components/dashboard/DashboardWidgetCard";
import { StatWidget } from "@/components/dashboard/StatWidget";
import { AddWidgetDialog } from "@/components/dashboard/AddWidgetDialog";
import { useDashboardStats } from "@/hooks/useDashboardWidgets";
import type { DashboardWidget } from "@/hooks/useDashboardWidgets";
import {
  Users,
  Building2,
  FileText,
  Receipt,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Plus,
  Pencil,
  Check,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

const defaultWidgets: DashboardWidget[] = [
  { id: "stat-contacts", type: "stat", title: "Contactos", entity: "contacts", config: { field: "count" }, size: "small", order: 0 },
  { id: "stat-clients", type: "stat", title: "Clientes Activos", entity: "clients", config: { field: "count" }, size: "small", order: 1 },
  { id: "stat-quotes", type: "stat", title: "Presupuestos Pendientes", entity: "quotes", config: { field: "count" }, size: "small", order: 2 },
  { id: "stat-invoices", type: "stat", title: "Facturación Mensual", entity: "invoices", config: { field: "sum" }, size: "small", order: 3 },
];

const recentActivities = [
  { id: 1, action: "Nuevo contacto añadido", entity: "María García", time: "Hace 5 min", type: "contact" },
  { id: 2, action: "Presupuesto enviado", entity: "PP-2024-0042", time: "Hace 15 min", type: "quote" },
  { id: 3, action: "Contrato firmado", entity: "CN-2024-0018", time: "Hace 1 hora", type: "contract" },
  { id: 4, action: "Factura emitida", entity: "FF-2024-0156", time: "Hace 2 horas", type: "invoice" },
  { id: 5, action: "Cliente convertido", entity: "Tech Solutions SL", time: "Hace 3 horas", type: "client" },
];

const upcomingTasks = [
  { id: 1, title: "Reunión con Acme Corp", date: "Hoy, 15:00", priority: "high" },
  { id: 2, title: "Enviar propuesta a Digital Labs", date: "Mañana, 10:00", priority: "medium" },
  { id: 3, title: "Renovación contrato GlobalTech", date: "15 Dic, 2024", priority: "high" },
  { id: 4, title: "Seguimiento lead España Digital", date: "16 Dic, 2024", priority: "low" },
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
      case "contacts": return { value: 12, label: "este mes" };
      case "clients": return { value: 8, label: "este mes" };
      case "quotes": return { value: -3, label: "vs. anterior" };
      case "invoices": return { value: 23, label: "este mes" };
      case "expenses": return { value: 15, label: "este mes" };
      default: return undefined;
    }
  };

  const getWidgetTrend = (widget: DashboardWidget): "up" | "down" | "neutral" => {
    const change = getWidgetChange(widget);
    if (!change) return "neutral";
    return change.value >= 0 ? "up" : "down";
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
        {/* Editable Stat Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {widgets
            .filter((w) => w.type === "stat")
            .map((widget) => (
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
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Resumen de Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Este Mes</p>
                  <p className="text-xl font-semibold">{formatCurrency(stats.expenses.monthlyTotal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                  <p className="text-xl font-semibold text-warning">{stats.expenses.pending}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-xl font-semibold text-success">
                    {formatCurrency(stats.invoices.monthlyTotal - stats.expenses.monthlyTotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Actividad Reciente</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary">
                Ver todo
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {activity.type === "contact" && <Users className="h-5 w-5" />}
                        {activity.type === "quote" && <FileText className="h-5 w-5" />}
                        {activity.type === "contract" && <FileText className="h-5 w-5" />}
                        {activity.type === "invoice" && <Receipt className="h-5 w-5" />}
                        {activity.type === "client" && <Building2 className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">{activity.entity}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Próximas Tareas</CardTitle>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Calendar className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{task.date}</p>
                      </div>
                      <StatusBadge
                        variant={
                          task.priority === "high"
                            ? "danger"
                            : task.priority === "medium"
                            ? "pending"
                            : "inactive"
                        }
                      >
                        {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Chart Placeholder */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pipeline de Ventas</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Semanal</Button>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">Mensual</Button>
              <Button variant="outline" size="sm">Anual</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Gráfico de pipeline de ventas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddWidgetDialog
        open={showAddWidget}
        onOpenChange={setShowAddWidget}
        onAdd={handleAddWidget}
      />
    </div>
  );
}
