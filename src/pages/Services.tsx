import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Package, MoreVertical, Loader2, LayoutGrid, List } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useServices, useDeleteService, Service } from "@/hooks/useServices";
import { ServiceFormDialog } from "@/components/services/ServiceFormDialog";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { useDefaultTableView } from "@/hooks/useTableViews";
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

const categoryColors: Record<string, string> = {
  Marketing: "bg-primary/10 text-primary",
  Desarrollo: "bg-success/10 text-success",
  Consultoría: "bg-warning/10 text-warning",
  Diseño: "bg-destructive/10 text-destructive",
  default: "bg-muted text-muted-foreground",
};

const statusMap: Record<string, "active" | "pending" | "inactive"> = {
  active: "active",
  development: "pending",
  inactive: "inactive",
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  development: "En desarrollo",
  inactive: "Inactivo",
};

const columnConfigs: ColumnConfig[] = [
  { key: "service_number", label: "ID", defaultVisible: true },
  { key: "name", label: "Nombre", defaultVisible: true },
  { key: "category", label: "Categoría", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
  { key: "description", label: "Descripción", defaultVisible: false },
  { key: "price", label: "Precio", defaultVisible: true },
  { key: "iva_percent", label: "% IVA", defaultVisible: true },
  { key: "price_with_iva", label: "Precio con IVA", defaultVisible: true },
  { key: "created_at", label: "Fecha Creación", defaultVisible: false },
  { key: "updated_at", label: "Última Actualización", defaultVisible: false },
  { key: "actions", label: "Acciones", defaultVisible: true },
];

export default function Services() {
  const { data: services, isLoading, error } = useServices();
  const deleteService = useDeleteService();
  const { data: defaultView } = useDefaultTableView("services");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );

  // Apply default view
  if (defaultView && visibleColumns.length === columnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultView.visible_columns as string[];
    if (cols.length > 0) setVisibleColumns(cols);
  }

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const handleDelete = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (serviceToDelete) {
      await deleteService.mutateAsync(serviceToDelete.id);
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const filteredServices = services?.filter((service) => {
    return service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const columns = [
    {
      key: "service_number",
      label: "ID",
      render: (service: Service) => (
        <span className="font-mono text-xs text-muted-foreground">SV-{String(service.service_number).padStart(4, "0")}</span>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      render: (service: Service) => <span className="font-medium">{service.name}</span>,
    },
    {
      key: "category",
      label: "Categoría",
      render: (service: Service) => (
        <span className={`status-badge ${categoryColors[service.category || ""] || categoryColors.default}`}>
          {service.category || "Sin categoría"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (service: Service) => (
        <StatusBadge variant={statusMap[service.status || "active"]}>
          {statusLabels[service.status || "active"]}
        </StatusBadge>
      ),
    },
    {
      key: "description",
      label: "Descripción",
      render: (service: Service) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {service.description || "-"}
        </span>
      ),
    },
    {
      key: "price",
      label: "Precio",
      render: (service: Service) => <span>{formatCurrency(service.price)}</span>,
    },
    {
      key: "iva_percent",
      label: "% IVA",
      render: (service: Service) => <span>{service.iva_percent || 21}%</span>,
    },
    {
      key: "price_with_iva",
      label: "Precio con IVA",
      render: (service: Service) => (
        <span className="font-semibold text-primary">
          {formatCurrency(service.price * (1 + (service.iva_percent || 21) / 100))}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Creación",
      render: (service: Service) => (
        <span className="text-sm text-muted-foreground">
          {service.created_at ? new Date(service.created_at).toLocaleDateString("es-ES") : "-"}
        </span>
      ),
    },
    {
      key: "updated_at",
      label: "Actualización",
      render: (service: Service) => (
        <span className="text-sm text-muted-foreground">
          {service.updated_at ? new Date(service.updated_at).toLocaleDateString("es-ES") : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (service: Service) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(service)}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSelectedService({ ...service, id: "" });
              setDialogOpen(true);
            }}>Duplicar</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(service)}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (error) {
    return <div className="p-6 text-destructive">Error al cargar servicios: {error.message}</div>;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Servicios"
        subtitle="Catálogo de servicios ofrecidos"
        actions={
          <Button className="gap-2" onClick={() => { setSelectedService(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Servicios</p>
            <p className="text-2xl font-semibold mt-1">{services?.length || 0}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {services?.filter((s) => s.status === "active").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">En Desarrollo</p>
            <p className="text-2xl font-semibold mt-1 text-warning">
              {services?.filter((s) => s.status === "development").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Precio Medio</p>
            <p className="text-2xl font-semibold mt-1">
              {services?.length ? formatCurrency(services.reduce((sum, s) => sum + s.price, 0) / services.length) : "€0"}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Buscar servicios..." 
            className="sm:w-80" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2 ml-auto">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="rounded-none"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="icon"
                className="rounded-none"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            <TableViewManager
              entityName="services"
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              filters={{}}
            />
            <ExportDropdown
              data={filteredServices}
              columns={columns.filter(c => c.key !== "actions").map(c => ({ key: c.key, label: c.label }))}
              filename="servicios"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "table" ? (
          <DataTable columns={columns} data={filteredServices} visibleColumns={visibleColumns} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
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
                        <DropdownMenuItem onClick={() => handleEdit(service)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedService({ ...service, id: "" });
                          setDialogOpen(true);
                        }}>Duplicar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(service)}>
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <span className={`status-badge ${categoryColors[service.category || ""] || categoryColors.default}`}>
                        {service.category || "Sin categoría"}
                      </span>
                      <StatusBadge variant={statusMap[service.status || "active"]}>
                        {statusLabels[service.status || "active"]}
                      </StatusBadge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {service.description || "Sin descripción"}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-bold text-foreground">
                          {formatCurrency(service.price)}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          + IVA ({service.iva_percent || 21}%)
                        </span>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(service.price * (1 + (service.iva_percent || 21) / 100))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ServiceFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        service={selectedService} 
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el servicio "{serviceToDelete?.name}".
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
