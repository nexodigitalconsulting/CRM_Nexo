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
import { Plus, Filter, Download, Mail, Phone } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  origin: string;
  status: string;
  captureDate: string;
}

const contacts: Contact[] = [
  {
    id: "CC-2024-0001",
    name: "María García López",
    email: "maria.garcia@email.com",
    phone: "+34 612 345 678",
    origin: "Formulario Web",
    status: "Nuevo",
    captureDate: "2024-12-01",
  },
  {
    id: "CC-2024-0002",
    name: "Carlos Martínez",
    email: "carlos.m@empresa.es",
    phone: "+34 623 456 789",
    origin: "WhatsApp",
    status: "Contactado",
    captureDate: "2024-11-28",
  },
  {
    id: "CC-2024-0003",
    name: "Ana Rodríguez",
    email: "ana.rodriguez@gmail.com",
    phone: "+34 634 567 890",
    origin: "Instagram",
    status: "En seguimiento",
    captureDate: "2024-11-25",
  },
  {
    id: "CC-2024-0004",
    name: "Pedro Sánchez Ruiz",
    email: "pedro.sr@outlook.com",
    phone: "+34 645 678 901",
    origin: "Facebook",
    status: "Convertido",
    captureDate: "2024-11-20",
  },
  {
    id: "CC-2024-0005",
    name: "Laura Fernández",
    email: "laura.f@empresa.com",
    phone: "+34 656 789 012",
    origin: "Webscraping",
    status: "Descartado",
    captureDate: "2024-11-15",
  },
];

const statusMap: Record<string, "new" | "active" | "pending" | "success" | "inactive"> = {
  Nuevo: "new",
  Contactado: "pending",
  "En seguimiento": "pending",
  Convertido: "success",
  Descartado: "inactive",
};

const columns = [
  {
    key: "id",
    label: "ID",
    render: (contact: Contact) => (
      <span className="font-mono text-xs text-muted-foreground">{contact.id}</span>
    ),
  },
  {
    key: "name",
    label: "Nombre",
    render: (contact: Contact) => (
      <span className="font-medium text-foreground">{contact.name}</span>
    ),
  },
  {
    key: "email",
    label: "Email",
    render: (contact: Contact) => (
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{contact.email}</span>
      </div>
    ),
  },
  {
    key: "phone",
    label: "Teléfono",
    render: (contact: Contact) => (
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{contact.phone}</span>
      </div>
    ),
  },
  {
    key: "origin",
    label: "Origen",
  },
  {
    key: "status",
    label: "Estado",
    render: (contact: Contact) => (
      <StatusBadge variant={statusMap[contact.status]}>
        {contact.status}
      </StatusBadge>
    ),
  },
  {
    key: "captureDate",
    label: "Fecha Captación",
    render: (contact: Contact) => (
      <span className="text-sm text-muted-foreground">
        {new Date(contact.captureDate).toLocaleDateString("es-ES")}
      </span>
    ),
  },
];

export default function Contacts() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Contactos"
        subtitle="Gestiona tus leads y contactos"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Contacto
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Buscar contactos..."
            className="sm:w-80"
          />
          <Select>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="nuevo">Nuevo</SelectItem>
              <SelectItem value="contactado">Contactado</SelectItem>
              <SelectItem value="seguimiento">En seguimiento</SelectItem>
              <SelectItem value="convertido">Convertido</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Origen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="web">Formulario Web</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
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
        <DataTable columns={columns} data={contacts} />
      </div>
    </div>
  );
}
