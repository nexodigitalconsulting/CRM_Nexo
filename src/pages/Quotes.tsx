import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, MoreVertical, FileText, Send, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Quote {
  id: string;
  name: string;
  client: string;
  contact: string;
  createdAt: string;
  amount: number;
  status: string;
  responsible: string;
}

const quotes: Quote[] = [
  {
    id: "PP-2024-0042",
    name: "Desarrollo E-commerce",
    client: "Tech Solutions SL",
    contact: "María García",
    createdAt: "2024-12-01",
    amount: 8500,
    status: "Enviado",
    responsible: "Carlos M.",
  },
  {
    id: "PP-2024-0041",
    name: "Plan Marketing Q1 2025",
    client: "Digital Labs SA",
    contact: "Juan Pérez",
    createdAt: "2024-11-28",
    amount: 12000,
    status: "Aprobado",
    responsible: "Ana R.",
  },
  {
    id: "PP-2024-0040",
    name: "Rediseño Web",
    client: "Innovación Global",
    contact: "Laura F.",
    createdAt: "2024-11-25",
    amount: 4500,
    status: "Borrador",
    responsible: "Carlos M.",
  },
  {
    id: "PP-2024-0039",
    name: "SEO Integral",
    client: "Acme Corporation",
    contact: "Pedro S.",
    createdAt: "2024-11-20",
    amount: 6800,
    status: "Rechazado",
    responsible: "Ana R.",
  },
  {
    id: "PP-2024-0038",
    name: "Gestión RRSS Anual",
    client: "María López Consulting",
    contact: "María López",
    createdAt: "2024-11-15",
    amount: 9600,
    status: "Enviado",
    responsible: "Carlos M.",
  },
];

const statusMap: Record<string, "inactive" | "new" | "active" | "danger"> = {
  Borrador: "inactive",
  Enviado: "new",
  Aprobado: "active",
  Rechazado: "danger",
};

const statusIcons: Record<string, React.ElementType> = {
  Borrador: FileText,
  Enviado: Send,
  Aprobado: Check,
  Rechazado: X,
};

export default function Quotes() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Presupuestos"
        subtitle="Gestión de presupuestos enviados"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Presupuesto
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold mt-1">{quotes.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-semibold mt-1 text-primary">
              {quotes.filter((q) => q.status === "Enviado").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Aprobados</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {quotes.filter((q) => q.status === "Aprobado").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-semibold mt-1">
              {formatCurrency(quotes.reduce((sum, q) => sum + q.amount, 0))}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar presupuestos..." className="sm:w-80" />
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Kanban View */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {["Borrador", "Enviado", "Aprobado", "Rechazado"].map((status) => {
            const StatusIcon = statusIcons[status];
            const filteredQuotes = quotes.filter((q) => q.status === status);

            return (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-foreground">{status}</h3>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {filteredQuotes.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-xs text-muted-foreground">
                          {quote.id}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Duplicar</DropdownMenuItem>
                            <DropdownMenuItem>Enviar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <h4 className="mt-2 font-medium text-foreground line-clamp-1">
                        {quote.name}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {quote.client}
                      </p>

                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(quote.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {quote.responsible}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
