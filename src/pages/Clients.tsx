import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Download, Building2, Mail } from "lucide-react";

interface Client {
  id: string;
  name: string;
  cif: string;
  email: string;
  phone: string;
  segment: string;
  status: string;
  source: string;
}

const clients: Client[] = [
  {
    id: "CL-2024-0001",
    name: "Tech Solutions SL",
    cif: "B12345678",
    email: "info@techsolutions.es",
    phone: "+34 912 345 678",
    segment: "Corporativo",
    status: "Activo",
    source: "Referido",
  },
  {
    id: "CL-2024-0002",
    name: "Digital Labs SA",
    cif: "A87654321",
    email: "contacto@digitallabs.com",
    phone: "+34 933 456 789",
    segment: "PyME",
    status: "Activo",
    source: "Publicidad Digital",
  },
  {
    id: "CL-2024-0003",
    name: "Innovación Global",
    cif: "B11223344",
    email: "hello@innovacionglobal.es",
    phone: "+34 955 567 890",
    segment: "Emprendedor",
    status: "Inactivo",
    source: "Redes Sociales",
  },
  {
    id: "CL-2024-0004",
    name: "María López Consulting",
    cif: "44556677X",
    email: "maria@mlopezconsulting.com",
    phone: "+34 612 678 901",
    segment: "Particular",
    status: "Activo",
    source: "Formulario Web",
  },
  {
    id: "CL-2024-0005",
    name: "Acme Corporation",
    cif: "B99887766",
    email: "business@acme.es",
    phone: "+34 916 789 012",
    segment: "Corporativo",
    status: "Activo",
    source: "Evento",
  },
];

const statusMap: Record<string, "active" | "inactive"> = {
  Activo: "active",
  Inactivo: "inactive",
};

const segmentColors: Record<string, string> = {
  Corporativo: "bg-primary/10 text-primary",
  PyME: "bg-success/10 text-success",
  Emprendedor: "bg-warning/10 text-warning",
  Particular: "bg-muted text-muted-foreground",
};

const columns = [
  {
    key: "id",
    label: "ID",
    render: (client: Client) => (
      <span className="font-mono text-xs text-muted-foreground">{client.id}</span>
    ),
  },
  {
    key: "name",
    label: "Cliente",
    render: (client: Client) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium text-foreground">{client.name}</p>
          <p className="text-xs text-muted-foreground">{client.cif}</p>
        </div>
      </div>
    ),
  },
  {
    key: "email",
    label: "Contacto",
    render: (client: Client) => (
      <div>
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{client.email}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{client.phone}</p>
      </div>
    ),
  },
  {
    key: "segment",
    label: "Segmento",
    render: (client: Client) => (
      <span className={`status-badge ${segmentColors[client.segment]}`}>
        {client.segment}
      </span>
    ),
  },
  {
    key: "source",
    label: "Fuente",
  },
  {
    key: "status",
    label: "Estado",
    render: (client: Client) => (
      <StatusBadge variant={statusMap[client.status]}>
        {client.status}
      </StatusBadge>
    ),
  },
];

export default function Clients() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Clientes"
        subtitle="Base de datos de clientes activos"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Clientes</p>
            <p className="text-2xl font-semibold mt-1">342</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-semibold mt-1 text-success">298</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Nuevos este mes</p>
            <p className="text-2xl font-semibold mt-1 text-primary">24</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Valor medio</p>
            <p className="text-2xl font-semibold mt-1">€2,450</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input placeholder="Buscar clientes..." className="sm:w-80" />
          <Select>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="corporativo">Corporativo</SelectItem>
              <SelectItem value="pyme">PyME</SelectItem>
              <SelectItem value="emprendedor">Emprendedor</SelectItem>
              <SelectItem value="particular">Particular</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable columns={columns} data={clients} />
      </div>
    </div>
  );
}
