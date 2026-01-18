import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { FilterableDataTable } from "@/components/ui/filterable-data-table";
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
import { Plus, Filter, Mail, Phone, Edit, Trash2, UserPlus, Loader2, MapPin } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import { entityExportConfigs } from "@/lib/exportUtils";
import { useContacts, useDeleteContact, useConvertToClient, Contact } from "@/hooks/useContacts";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusMap: Record<string, "new" | "active" | "pending" | "success" | "inactive"> = {
  nuevo: "new",
  reunion_agendada: "pending",
  propuesta_enviada: "active",
  ganado: "success",
  perdido: "inactive",
};

const statusLabels: Record<string, string> = {
  nuevo: "Nuevo",
  reunion_agendada: "Reunión Agendada",
  propuesta_enviada: "Propuesta Enviada",
  ganado: "Ganado",
  perdido: "Perdido",
};

const columnConfigs: ColumnConfig[] = [
  { key: "contact_number", label: "ID", defaultVisible: true },
  { key: "name", label: "Nombre", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "phone", label: "Teléfono", defaultVisible: true },
  { key: "source", label: "Origen", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
  { key: "meeting_date", label: "Fecha Reunión", defaultVisible: false },
  { key: "presentation_url", label: "URL Presentación", defaultVisible: false },
  { key: "quote_url", label: "URL Presupuesto", defaultVisible: false },
  { key: "place_id", label: "Place ID", defaultVisible: false },
  { key: "notes", label: "Notas", defaultVisible: false },
  { key: "created_at", label: "Fecha Captación", defaultVisible: true },
  { key: "actions", label: "Acciones", defaultVisible: true },
];

export default function Contacts() {
  const { data: contacts, isLoading, error } = useContacts();
  const deleteContact = useDeleteContact();
  const convertToClient = useConvertToClient();
  const { data: defaultView } = useDefaultTableView("contacts");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );

  // Apply default view
  if (defaultView && visibleColumns.length === columnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultView.visible_columns as string[];
    if (cols.length > 0) setVisibleColumns(cols);
  }

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (contactToDelete) {
      await deleteContact.mutateAsync(contactToDelete.id);
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    }
  };

  const handleConvert = async (contact: Contact) => {
    await convertToClient.mutateAsync(contact);
  };

  const filteredContacts = contacts?.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
    const matchesSource = sourceFilter === "all" || contact.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  }) || [];

  const columns = [
    {
      key: "contact_number",
      label: "ID",
      render: (contact: Contact) => (
        <span className="font-mono text-xs text-muted-foreground">CC-{String(contact.contact_number).padStart(4, "0")}</span>
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
          <span className="text-sm">{contact.email || "-"}</span>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Teléfono",
      render: (contact: Contact) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{contact.phone || "-"}</span>
        </div>
      ),
    },
    {
      key: "source",
      label: "Origen",
      render: (contact: Contact) => <span className="text-sm capitalize">{contact.source || "-"}</span>,
    },
    {
      key: "status",
      label: "Estado",
      render: (contact: Contact) => (
        <StatusBadge variant={statusMap[contact.status || "nuevo"]}>
          {statusLabels[contact.status || "nuevo"]}
        </StatusBadge>
      ),
    },
    {
      key: "meeting_date",
      label: "Fecha Reunión",
      render: (contact: Contact) => (
        <span className="text-sm text-muted-foreground">
          {contact.meeting_date ? new Date(contact.meeting_date).toLocaleDateString("es-ES") : "-"}
        </span>
      ),
    },
    {
      key: "presentation_url",
      label: "Presentación",
      render: (contact: Contact) => (
        contact.presentation_url ? (
          <a href={contact.presentation_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
            Ver
          </a>
        ) : <span className="text-sm text-muted-foreground">-</span>
      ),
    },
    {
      key: "quote_url",
      label: "Presupuesto",
      render: (contact: Contact) => (
        contact.quote_url ? (
          <a href={contact.quote_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
            Ver
          </a>
        ) : <span className="text-sm text-muted-foreground">-</span>
      ),
    },
    {
      key: "place_id",
      label: "Place ID",
      render: (contact: Contact) => (
        contact.place_id ? (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[80px]">{contact.place_id}</span>
          </div>
        ) : <span className="text-sm text-muted-foreground">-</span>
      ),
    },
    {
      key: "notes",
      label: "Notas",
      render: (contact: Contact) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px] block">{contact.notes || "-"}</span>
      ),
    },
    {
      key: "created_at",
      label: "Fecha Captación",
      render: (contact: Contact) => (
        <span className="text-sm text-muted-foreground">
          {contact.created_at ? new Date(contact.created_at).toLocaleDateString("es-ES") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (contact: Contact) => (
        <TooltipProvider>
          <div className="flex gap-1">
            {contact.status !== "ganado" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-success" 
                    onClick={() => handleConvert(contact)}
                    disabled={convertToClient.isPending}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Convertir a cliente</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(contact)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(contact)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  if (error) {
    return <div className="p-6 text-destructive">Error al cargar contactos: {error.message}</div>;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Contactos"
        subtitle="Gestiona tus leads y contactos"
        actions={
          <Button className="gap-2" onClick={() => { setSelectedContact(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo Contacto
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold mt-1">{contacts?.length || 0}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Nuevos</p>
            <p className="text-2xl font-semibold mt-1 text-primary">
              {contacts?.filter((c) => c.status === "nuevo").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Reuniones</p>
            <p className="text-2xl font-semibold mt-1 text-warning">
              {contacts?.filter((c) => c.status === "reunion_agendada").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Ganados</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {contacts?.filter((c) => c.status === "ganado").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Tasa Conversión</p>
            <p className="text-2xl font-semibold mt-1">
              {contacts?.length ? Math.round((contacts.filter((c) => c.status === "ganado").length / contacts.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Buscar contactos..."
            className="sm:w-80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="nuevo">Nuevo</SelectItem>
              <SelectItem value="reunion_agendada">Reunión Agendada</SelectItem>
              <SelectItem value="propuesta_enviada">Propuesta Enviada</SelectItem>
              <SelectItem value="ganado">Ganado</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Origen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="referido">Referido</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="telefono">Teléfono</SelectItem>
              <SelectItem value="evento">Evento</SelectItem>
              <SelectItem value="campaña">Campaña</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <TableViewManager
              entityName="contacts"
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              filters={{ status: statusFilter, source: sourceFilter }}
            />
            <ExportDropdown
              data={filteredContacts}
              columns={entityExportConfigs.contacts.columns as any}
              filename={entityExportConfigs.contacts.filename}
            />
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <FilterableDataTable columns={columns} data={contacts || []} visibleColumns={visibleColumns} />
        )}
      </div>

      <ContactFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        contact={selectedContact} 
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el contacto "{contactToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
