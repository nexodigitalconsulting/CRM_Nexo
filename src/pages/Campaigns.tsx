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
import { Plus, Megaphone, Calendar, MapPin, Globe, Trash2, Edit2, Mail, Phone, Building2 } from "lucide-react";
import { useCampaigns, useDeleteCampaign, type Campaign } from "@/hooks/useCampaigns";
import { CampaignFormDialog } from "@/components/campaigns/CampaignFormDialog";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import { entityExportConfigs } from "@/lib/exportUtils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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

const statusMap: Record<string, "active" | "pending" | "inactive"> = {
  active: "active",
  scheduled: "pending",
  completed: "inactive",
};

const statusLabels: Record<string, string> = {
  active: "Activo",
  scheduled: "Programado",
  completed: "Completado",
};

// Column configuration for view management
const columnConfigs: ColumnConfig[] = [
  { key: "campaign_number", label: "Nº Campaña", defaultVisible: true },
  { key: "name", label: "Nombre", defaultVisible: true },
  { key: "business_name", label: "Negocio", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "phone", label: "Teléfono", defaultVisible: true },
  { key: "category", label: "Categoría", defaultVisible: true },
  { key: "city", label: "Ciudad", defaultVisible: true },
  { key: "province", label: "Provincia", defaultVisible: false },
  { key: "postal_code", label: "Código Postal", defaultVisible: false },
  { key: "address", label: "Dirección", defaultVisible: false },
  { key: "website", label: "Web", defaultVisible: true },
  { key: "capture_date", label: "Fecha Captura", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
  { key: "place_id", label: "Place ID", defaultVisible: false },
  { key: "actions", label: "Acciones", defaultVisible: true },
];

export default function Campaigns() {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const { data: defaultView } = useDefaultTableView("campaigns");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );

  // Apply default view
  if (defaultView && visibleColumns.length === columnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultView.visible_columns as string[];
    if (cols.length > 0) setVisibleColumns(cols);
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    const matchesSearch = 
      campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleEdit = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDialogOpen(true);
  };

  const handleDelete = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (campaignToDelete) {
      await deleteCampaign.mutateAsync(campaignToDelete.id);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  const columns = [
    {
      key: "campaign_number",
      label: "Nº Campaña",
      render: (campaign: Campaign) => (
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium text-foreground">
            CP-{String(campaign.campaign_number).padStart(4, "0")}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      render: (campaign: Campaign) => (
        <span className="font-medium">{campaign.name}</span>
      ),
    },
    {
      key: "business_name",
      label: "Negocio",
      render: (campaign: Campaign) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="truncate max-w-[180px]">{campaign.business_name || "-"}</span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (campaign: Campaign) => (
        campaign.email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate max-w-[180px]">{campaign.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: "phone",
      label: "Teléfono",
      render: (campaign: Campaign) => (
        campaign.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{campaign.phone}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: "category",
      label: "Categoría",
      render: (campaign: Campaign) => (
        <span className="text-sm line-clamp-2">{campaign.category || "-"}</span>
      ),
    },
    {
      key: "city",
      label: "Ciudad",
      render: (campaign: Campaign) => (
        <span className="text-sm">{campaign.city || "-"}</span>
      ),
    },
    {
      key: "province",
      label: "Provincia",
      render: (campaign: Campaign) => (
        <span className="text-sm">{campaign.province || "-"}</span>
      ),
    },
    {
      key: "postal_code",
      label: "Código Postal",
      render: (campaign: Campaign) => (
        <span className="text-sm font-mono">{campaign.postal_code || "-"}</span>
      ),
    },
    {
      key: "address",
      label: "Dirección",
      render: (campaign: Campaign) => (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="line-clamp-1">{campaign.address || "-"}</span>
        </div>
      ),
    },
    {
      key: "website",
      label: "Web",
      render: (campaign: Campaign) => (
        campaign.website ? (
          <a 
            href={campaign.website.startsWith("http") ? campaign.website : `https://${campaign.website}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Globe className="h-4 w-4" />
            <span className="truncate max-w-[100px]">Ver web</span>
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: "capture_date",
      label: "Fecha Captura",
      render: (campaign: Campaign) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {campaign.capture_date 
              ? format(new Date(campaign.capture_date), "dd MMM yyyy", { locale: es })
              : "-"
            }
          </span>
        </div>
      ),
    },
    {
      key: "place_id",
      label: "Place ID",
      render: (campaign: Campaign) => (
        <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px] block">
          {campaign.place_id || "-"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (campaign: Campaign) => (
        <StatusBadge variant={statusMap[campaign.status || "active"]}>
          {statusLabels[campaign.status || "active"]}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (campaign: Campaign) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive"
            onClick={() => handleDelete(campaign)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter columns based on visibility
  const visibleColumnsList = columns.filter((col) => visibleColumns.includes(col.key));

  return (
    <div className="animate-fade-in">
      <Header
        title="Campañas"
        subtitle="Leads y negocios capturados desde n8n"
        actions={
          <Button className="gap-2" onClick={() => { setSelectedCampaign(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nueva Campaña
          </Button>
        }
      />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Registros</p>
            <p className="text-2xl font-semibold mt-1">{campaigns.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {campaigns.filter((c) => c.status === "active").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Con Email</p>
            <p className="text-2xl font-semibold mt-1">
              {campaigns.filter((c) => c.email).length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Con Teléfono</p>
            <p className="text-2xl font-semibold mt-1">
              {campaigns.filter((c) => c.phone).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Input 
            placeholder="Buscar por nombre, negocio, ciudad, categoría o email..." 
            className="sm:w-96"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="scheduled">Programado</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <TableViewManager
              entityName="campaigns"
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              tableName="campaigns"
              filters={{ status: statusFilter }}
            />
            <ExportDropdown
              data={filteredCampaigns}
              columns={entityExportConfigs.campaigns.columns as any}
              filename={entityExportConfigs.campaigns.filename}
              tableName="campaigns"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando campañas...</div>
        ) : (
          <DataTable columns={visibleColumnsList} data={filteredCampaigns} />
        )}
      </div>

      <CampaignFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        campaign={selectedCampaign}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campaña?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la campaña "{campaignToDelete?.name}".
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
