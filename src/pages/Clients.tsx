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
import { Plus, Filter, Download, Building2, Mail, Edit, Trash2, Loader2 } from "lucide-react";
import { useClients, useDeleteClient, Client } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
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

const statusMap: Record<string, "active" | "inactive"> = {
  active: "active",
  inactive: "inactive",
};

const segmentLabels: Record<string, string> = {
  corporate: "Corporativo",
  pyme: "PYME",
  entrepreneur: "Autónomo",
  individual: "Particular",
};

const segmentColors: Record<string, string> = {
  corporate: "bg-primary/10 text-primary",
  pyme: "bg-success/10 text-success",
  entrepreneur: "bg-warning/10 text-warning",
  individual: "bg-muted text-muted-foreground",
};

export default function Clients() {
  const { data: clients, isLoading, error } = useClients();
  const deleteClient = useDeleteClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  const handleDelete = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      await deleteClient.mutateAsync(clientToDelete.id);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const filteredClients = clients?.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesSegment = segmentFilter === "all" || client.segment === segmentFilter;
    return matchesSearch && matchesStatus && matchesSegment;
  }) || [];

  const columns = [
    {
      key: "client_number",
      label: "ID",
      render: (client: Client) => (
        <span className="font-mono text-xs text-muted-foreground">CL-{String(client.client_number).padStart(4, "0")}</span>
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
            <p className="text-xs text-muted-foreground">{client.cif || "-"}</p>
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
            <span className="text-sm">{client.email || "-"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{client.phone || "-"}</p>
        </div>
      ),
    },
    {
      key: "segment",
      label: "Segmento",
      render: (client: Client) => (
        <span className={`status-badge ${segmentColors[client.segment || "pyme"]}`}>
          {segmentLabels[client.segment || "pyme"]}
        </span>
      ),
    },
    {
      key: "source",
      label: "Fuente",
      render: (client: Client) => <span className="text-sm">{client.source || "-"}</span>,
    },
    {
      key: "status",
      label: "Estado",
      render: (client: Client) => (
        <StatusBadge variant={statusMap[client.status || "active"]}>
          {client.status === "active" ? "Activo" : "Inactivo"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (client: Client) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(client)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(client)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = clients?.filter((c) => c.status === "active").length || 0;

  if (error) {
    return <div className="p-6 text-destructive">Error al cargar clientes: {error.message}</div>;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Clientes"
        subtitle="Base de datos de clientes activos"
        actions={
          <Button className="gap-2" onClick={() => { setSelectedClient(null); setDialogOpen(true); }}>
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
            <p className="text-2xl font-semibold mt-1">{clients?.length || 0}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-semibold mt-1 text-success">{activeCount}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Corporativos</p>
            <p className="text-2xl font-semibold mt-1 text-primary">
              {clients?.filter((c) => c.segment === "corporate").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">PYMEs</p>
            <p className="text-2xl font-semibold mt-1">
              {clients?.filter((c) => c.segment === "pyme").length || 0}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Buscar clientes..." 
            className="sm:w-80" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="corporate">Corporativo</SelectItem>
              <SelectItem value="pyme">PYME</SelectItem>
              <SelectItem value="entrepreneur">Autónomo</SelectItem>
              <SelectItem value="individual">Particular</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
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
          <DataTable columns={columns} data={filteredClients} />
        )}
      </div>

      <ClientFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        client={selectedClient} 
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cliente "{clientToDelete?.name}".
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
