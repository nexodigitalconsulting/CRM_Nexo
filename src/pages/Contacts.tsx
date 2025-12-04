import { useState } from "react";
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
import { Plus, Filter, Download, Mail, Phone, Edit, Trash2, UserPlus, Loader2 } from "lucide-react";
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
  new: "new",
  contacted: "pending",
  follow_up: "pending",
  converted: "success",
  discarded: "inactive",
};

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  follow_up: "Seguimiento",
  converted: "Convertido",
  discarded: "Descartado",
};

export default function Contacts() {
  const { data: contacts, isLoading, error } = useContacts();
  const deleteContact = useDeleteContact();
  const convertToClient = useConvertToClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

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
        <StatusBadge variant={statusMap[contact.status || "new"]}>
          {statusLabels[contact.status || "new"]}
        </StatusBadge>
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
            {contact.status !== "converted" && (
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
              {contacts?.filter((c) => c.status === "new").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Seguimiento</p>
            <p className="text-2xl font-semibold mt-1 text-warning">
              {contacts?.filter((c) => c.status === "follow_up").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Convertidos</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {contacts?.filter((c) => c.status === "converted").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Tasa Conversión</p>
            <p className="text-2xl font-semibold mt-1">
              {contacts?.length ? Math.round((contacts.filter((c) => c.status === "converted").length / contacts.length) * 100) : 0}%
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
              <SelectItem value="new">Nuevo</SelectItem>
              <SelectItem value="contacted">Contactado</SelectItem>
              <SelectItem value="follow_up">Seguimiento</SelectItem>
              <SelectItem value="converted">Convertido</SelectItem>
              <SelectItem value="discarded">Descartado</SelectItem>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable columns={columns} data={filteredContacts} />
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
