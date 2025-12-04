import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateService, useUpdateService, Service, ServiceInsert } from "@/hooks/useServices";
import { Loader2 } from "lucide-react";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

const initialFormState: ServiceInsert = {
  name: "",
  description: "",
  category: "",
  price: 0,
  iva_percent: 21,
  status: "active",
};

export function ServiceFormDialog({ open, onOpenChange, service }: ServiceFormDialogProps) {
  const [formData, setFormData] = useState<ServiceInsert>(initialFormState);
  const createService = useCreateService();
  const updateService = useUpdateService();
  
  const isEditing = !!service;
  const isLoading = createService.isPending || updateService.isPending;

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || "",
        category: service.category || "",
        price: service.price,
        iva_percent: service.iva_percent || 21,
        status: service.status || "active",
      });
    } else {
      setFormData(initialFormState);
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && service) {
        await updateService.mutateAsync({ id: service.id, ...formData });
      } else {
        await createService.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Servicio *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Input
              id="category"
              value={formData.category || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="Marketing, Desarrollo, Consultoría..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iva_percent">IVA (%)</Label>
              <Select
                value={String(formData.iva_percent || 21)}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, iva_percent: parseFloat(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Exento)</SelectItem>
                  <SelectItem value="4">4% (Superreducido)</SelectItem>
                  <SelectItem value="10">10% (Reducido)</SelectItem>
                  <SelectItem value="21">21% (General)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={formData.status || "active"}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as ServiceInsert["status"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="development">En desarrollo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Servicio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
