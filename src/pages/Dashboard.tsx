import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Users,
  Building2,
  FileText,
  Receipt,
  TrendingUp,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const recentActivities = [
  {
    id: 1,
    action: "Nuevo contacto añadido",
    entity: "María García",
    time: "Hace 5 min",
    type: "contact",
  },
  {
    id: 2,
    action: "Presupuesto enviado",
    entity: "PP-2024-0042",
    time: "Hace 15 min",
    type: "quote",
  },
  {
    id: 3,
    action: "Contrato firmado",
    entity: "CN-2024-0018",
    time: "Hace 1 hora",
    type: "contract",
  },
  {
    id: 4,
    action: "Factura emitida",
    entity: "FF-2024-0156",
    time: "Hace 2 horas",
    type: "invoice",
  },
  {
    id: 5,
    action: "Cliente convertido",
    entity: "Tech Solutions SL",
    time: "Hace 3 horas",
    type: "client",
  },
];

const upcomingTasks = [
  {
    id: 1,
    title: "Reunión con Acme Corp",
    date: "Hoy, 15:00",
    priority: "high",
  },
  {
    id: 2,
    title: "Enviar propuesta a Digital Labs",
    date: "Mañana, 10:00",
    priority: "medium",
  },
  {
    id: 3,
    title: "Renovación contrato GlobalTech",
    date: "15 Dic, 2024",
    priority: "high",
  },
  {
    id: 4,
    title: "Seguimiento lead España Digital",
    date: "16 Dic, 2024",
    priority: "low",
  },
];

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle="Resumen general de tu CRM"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Contactos"
            value="1,284"
            change={{ value: 12, label: "este mes" }}
            icon={Users}
            trend="up"
          />
          <StatCard
            title="Clientes Activos"
            value="342"
            change={{ value: 8, label: "este mes" }}
            icon={Building2}
            trend="up"
          />
          <StatCard
            title="Presupuestos Pendientes"
            value="28"
            change={{ value: -3, label: "vs. anterior" }}
            icon={FileText}
            trend="down"
          />
          <StatCard
            title="Facturación Mensual"
            value="€47,250"
            change={{ value: 23, label: "este mes" }}
            icon={Receipt}
            trend="up"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Actividad Reciente
              </h2>
              <Button variant="ghost" size="sm" className="text-primary">
                Ver todo
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
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
                      <p className="text-sm font-medium text-foreground">
                        {activity.action}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.entity}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Próximas Tareas
              </h2>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Calendar className="h-5 w-5" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {task.date}
                      </p>
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
                      {task.priority === "high"
                        ? "Alta"
                        : task.priority === "medium"
                        ? "Media"
                        : "Baja"}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline Chart Placeholder */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Pipeline de Ventas
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Semanal</Button>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">Mensual</Button>
              <Button variant="outline" size="sm">Anual</Button>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Gráfico de pipeline de ventas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
