import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { FilterableDataTable, Column } from "@/components/ui/filterable-data-table";
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
import { Plus, Filter, Download, Building2, Mail, Edit, Trash2, Loader2, Eye } from "lucide-react";
import { useClients, useDeleteClient, Client } from "@/hooks/useClients";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { ClientDetailDialog } from "@/components/clients/ClientDetailDialog";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import { entityExportConfigs } from "@/lib/exportUtils";
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
  activo: "active",
  inactivo: "inactive",
};

const segmentLabels: Record<string, string> = {
  corporativo: "Corporativo",
  pyme: "PYME",
  autonomo: "Autónomo",
  particular: "Particular",
};

const segmentColors: Record<string, string> = {
  corporativo: "bg-primary/10 text-primary",
  pyme: "bg-success/10 text-success",
  autonomo: "bg-warning/10 text-warning",
  particular: "bg-muted text-muted-foreground",
};

// Define ALL column configurations for visibility control (includes all DB fields)
const columnConfigs: ColumnConfig[] = [
  { key: "client_number", label: "ID", defaultVisible: true },
  { key: "name", label: "Nombre", defaultVisible: true },
  { key: "cif", label: "CIF/NIF", defaultVisible: false },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "phone", label: "Teléfono", defaultVisible: false },
  { key: "address", label: "Dirección", defaultVisible: false },
  { key: "city", label: "Ciudad", defaultVisible: false },
  { key: "postal_code", label: "Código Postal", defaultVisible: false },
  { key: "province", label: "Provincia", defaultVisible: false },
  { key: "country", label: "País", defaultVisible: false },
  { key: "iban", label: "IBAN", defaultVisible: false },
  { key: "segment", label: "Segmento", defaultVisible: true },
  { key: "source", label: "Fuente", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
  { key: "notes", label: "Notas", defaultVisible: false },
  { key: "created_at", label: "Fecha Creación", defaultVisible: false },
  { key: "updated_at", label: "Última Actualización", defaultVisible: false },
  { key: "actions", label: "Acciones", defaultVisible: true },
];

export default function Clients() {
  const { data: clients, isLoading, error } = useClients();
  const deleteClient = useDeleteClient();
  const { data: defaultView } = useDefaultTableView("clients");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  
  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnConfigs.filter(c => c.defaultVisible).map(c => c.key)
  );

  // Load default view if exists
  useEffect(() => {
    if (defaultView?.visible_columns) {
      setVisibleColumns(defaultView.visible_columns);
    }
  }, [defaultView]);

  const handleView = (client: Client) => {
    setViewingClient(client);
    setDetailDialogOpen(true);
  };

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

  const columns: Column<Client>[] = [
    {
      key: "client_number",
      label: "ID",
      render: (client: Client) => (
        <span className="font-mono text-xs text-muted-foreground">CL-{String(client.client_number).padStart(4, "0")}</span>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      render: (client: Client) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <p className="font-medium text-foreground">{client.name}</p>
        </div>
      ),
    },
    {
      key: "cif",
      label: "CIF/NIF",
      render: (client: Client) => <span className="text-sm font-mono">{client.cif || "-"}</span>,
    },
    {
      key: "email",
      label: "Email",
      render: (client: Client) => (
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{client.email || "-"}</span>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Teléfono",
      render: (client: Client) => <span className="text-sm">{client.phone || "-"}</span>,
    },
    {
      key: "address",
      label: "Dirección",
      render: (client: Client) => <span className="text-sm truncate max-w-[200px]">{client.address || "-"}</span>,
    },
    {
      key: "city",
      label: "Ciudad",
      render: (client: Client) => <span className="text-sm">{client.city || "-"}</span>,
    },
    {
      key: "postal_code",
      label: "Código Postal",
      render: (client: Client) => <span className="text-sm font-mono">{client.postal_code || "-"}</span>,
    },
    {
      key: "province",
      label: "Provincia",
      render: (client: Client) => <span className="text-sm">{client.province || "-"}</span>,
    },
    {
      key: "country",
      label: "País",
      render: (client: Client) => <span className="text-sm">{client.country || "-"}</span>,
    },
    {
      key: "iban",
      label: "IBAN",
      render: (client: Client) => <span className="text-sm font-mono">{client.iban || "-"}</span>,
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
        <StatusBadge variant={statusMap[client.status || "activo"]}>
          {client.status === "activo" ? "Activo" : "Inactivo"}
        </StatusBadge>
      ),
    },
    {
      key: "notes",
      label: "Notas",
      render: (client: Client) => <span className="text-sm truncate max-w-[150px]">{client.notes || "-"}</span>,
    },
    {
      key: "created_at",
      label: "Fecha Creación",
      render: (client: Client) => (
        <span className="text-sm text-muted-foreground">
          {client.created_at ? new Date(client.created_at).toLocaleDateString("es-ES") : "-"}
        </span>
      ),
    },
    {
      key: "updated_at",
      label: "Última Actualización",
      render: (client: Client) => (
        <span className="text-sm text-muted-foreground">
          {client.updated_at ? new Date(client.updated_at).toLocaleDateString("es-ES") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (client: Client) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(client)}>
            <Eye className="h-4 w-4" />
          </Button>
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

  const activeCount = clients?.filter((c) => c.status === "activo").length || 0;

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
              {clients?.filter((c) => c.segment === "corporativo").length || 0}
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
              <SelectItem value="corporativo">Corporativo</SelectItem>
              <SelectItem value="pyme">PYME</SelectItem>
              <SelectItem value="autonomo">Autónomo</SelectItem>
              <SelectItem value="particular">Particular</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <TableViewManager
              entityName="clients"
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              tableName="clients"
              filters={{ status: statusFilter, segment: segmentFilter }}
            />
            <ExportDropdown
              data={filteredClients}
              columns={entityExportConfigs.clients.columns}
              filename={entityExportConfigs.clients.filename}
            />
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <FilterableDataTable 
            columns={columns} 
            data={clients || []} 
            visibleColumns={visibleColumns}
          />
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

      {viewingClient && (
        <ClientDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          client={viewingClient}
          onEdit={() => handleEdit(viewingClient)}
        />
      )}
    </div>
  );
}
