import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardWidget, WidgetSize } from "@/hooks/useDashboardWidgets";
import {
  Users,
  Building2,
  FileText,
  Receipt,
  Megaphone,
} from "lucide-react";

interface EditWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: DashboardWidget | null;
  onSave: (widget: DashboardWidget) => void;
}

const entities = [
  { value: "contacts", label: "Contactos", icon: Users },
  { value: "clients", label: "Clientes", icon: Building2 },
  { value: "quotes", label: "Presupuestos", icon: FileText },
  { value: "invoices", label: "Facturas", icon: Receipt },
  { value: "expenses", label: "Gastos", icon: Receipt },
  { value: "campaigns", label: "Campañas", icon: Megaphone },
];

const sizes: { value: WidgetSize; label: string }[] = [
  { value: "small", label: "Pequeño (1 columna)" },
  { value: "medium", label: "Mediano (2 columnas)" },
  { value: "large", label: "Grande (3 columnas)" },
];

export function EditWidgetDialog({ open, onOpenChange, widget, onSave }: EditWidgetDialogProps) {
  const [title, setTitle] = useState("");
  const [entity, setEntity] = useState("");
  const [size, setSize] = useState<WidgetSize>("small");

  useEffect(() => {
    if (widget) {
      setTitle(widget.title);
      setEntity(widget.entity || "");
      setSize(widget.size);
    }
  }, [widget]);

  const handleSave = () => {
    if (!widget || !title) return;

    onSave({
      ...widget,
      title,
      entity: entity || undefined,
      size,
    });

    onOpenChange(false);
  };

  if (!widget) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Widget</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Título del Widget</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Total de Clientes"
            />
          </div>

          {/* Entity Selection */}
          {(widget.type === "stat" || widget.type === "chart" || widget.type === "table") && (
            <div className="space-y-2">
              <Label>Entidad</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una entidad" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((ent) => {
                    const Icon = ent.icon;
                    return (
                      <SelectItem key={ent.value} value={ent.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {ent.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Size */}
          <div className="space-y-2">
            <Label>Tamaño</Label>
            <Select value={size} onValueChange={(v) => setSize(v as WidgetSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizes.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
