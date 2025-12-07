import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, Download, Megaphone, Calendar, MapPin, Building2, Globe, Trash2, Edit2 } from "lucide-react";
import { useCampaigns, useDeleteCampaign, type Campaign } from "@/hooks/useCampaigns";
import { CampaignFormDialog } from "@/components/campaigns/CampaignFormDialog";
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

export default function Campaigns() {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      key: "id",
      label: "ID",
      render: (campaign: Campaign) => (
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs">CP-{String(campaign.campaign_number).padStart(4, "0")}</span>
        </div>
      ),
    },
    {
      key: "business",
      label: "Negocio",
      render: (campaign: Campaign) => (
        <div>
          <p className="font-medium">{campaign.name}</p>
          {campaign.business_name && (
            <p className="text-xs text-muted-foreground line-clamp-1">{campaign.business_name}</p>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contacto",
      render: (campaign: Campaign) => (
        <div className="text-sm">
          {campaign.email && <p className="truncate max-w-[180px]">{campaign.email}</p>}
          {campaign.phone && <p className="text-muted-foreground">{campaign.phone}</p>}
        </div>
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
      key: "location",
      label: "Ubicación",
      render: (campaign: Campaign) => (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="line-clamp-1">
            {[campaign.city, campaign.province].filter(Boolean).join(", ") || "-"}
          </span>
        </div>
      ),
    },
    {
      key: "website",
      label: "Web",
      render: (campaign: Campaign) => (
        campaign.website ? (
          <a 
            href={campaign.website} 
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
      label: "Fecha",
      render: (campaign: Campaign) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {campaign.capture_date 
              ? new Date(campaign.capture_date).toLocaleDateString("es-ES")
              : "-"
            }
          </span>
        </div>
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
      label: "",
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

        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Buscar por nombre, negocio, ciudad o categoría..." 
            className="sm:w-96"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando campañas...</div>
        ) : (
          <DataTable columns={columns} data={filteredCampaigns} />
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
