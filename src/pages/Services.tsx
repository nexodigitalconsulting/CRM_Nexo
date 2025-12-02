import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Package, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  iva: number;
  category: string;
  status: string;
}

const services: Service[] = [
  {
    id: "SV-2024-0001",
    name: "Diseño Web Básico",
    description: "Diseño y desarrollo de página web corporativa de hasta 5 páginas",
    price: 1500,
    iva: 21,
    category: "Básica",
    status: "Activo",
  },
  {
    id: "SV-2024-0002",
    name: "SEO Mensual",
    description: "Optimización SEO on-page y off-page con informes mensuales",
    price: 450,
    iva: 21,
    category: "Profesional",
    status: "Activo",
  },
  {
    id: "SV-2024-0003",
    name: "Gestión Redes Sociales",
    description: "Gestión completa de 3 redes sociales con 20 publicaciones/mes",
    price: 800,
    iva: 21,
    category: "Profesional",
    status: "Activo",
  },
  {
    id: "SV-2024-0004",
    name: "Marketing Digital 360",
    description: "Estrategia integral de marketing digital: SEO, SEM, RRSS y email marketing",
    price: 2500,
    iva: 21,
    category: "Premium",
    status: "Activo",
  },
  {
    id: "SV-2024-0005",
    name: "Consultoría Digital",
    description: "Auditoría y plan estratégico digital personalizado",
    price: 1200,
    iva: 21,
    category: "Premium",
    status: "En Desarrollo",
  },
  {
    id: "SV-2024-0006",
    name: "Mantenimiento Web",
    description: "Mantenimiento mensual de sitio web: actualizaciones, backups y soporte",
    price: 150,
    iva: 21,
    category: "Básica",
    status: "Activo",
  },
];

const categoryColors: Record<string, string> = {
  Básica: "bg-muted text-muted-foreground",
  Profesional: "bg-primary/10 text-primary",
  Premium: "bg-warning/10 text-warning",
};

const statusMap: Record<string, "active" | "pending" | "inactive"> = {
  Activo: "active",
  "En Desarrollo": "pending",
  Inactivo: "inactive",
};

export default function Services() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Servicios"
        subtitle="Catálogo de servicios ofrecidos"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar servicios..." className="sm:w-80" />
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-card rounded-xl border border-border shadow-card hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Package className="h-6 w-6" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Duplicar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Desactivar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className={`status-badge ${categoryColors[service.category]}`}>
                      {service.category}
                    </span>
                    <StatusBadge variant={statusMap[service.status]}>
                      {service.status}
                    </StatusBadge>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">
                    {service.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {service.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(service.price)}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">
                        + IVA ({service.iva}%)
                      </span>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {formatCurrency(service.price * (1 + service.iva / 100))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
