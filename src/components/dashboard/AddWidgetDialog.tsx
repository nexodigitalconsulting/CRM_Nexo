"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardWidget, WidgetType, WidgetSize } from "@/hooks/useDashboardWidgets";
import {
  BarChart3,
  Hash,
  Table,
  Activity,
  Users,
  Building2,
  FileText,
  Receipt,
  Megaphone,
} from "lucide-react";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (widget: Omit<DashboardWidget, "id" | "order">) => void;
}

const widgetTypes: { value: WidgetType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { value: "stat", label: "Estadística", icon: Hash, description: "Muestra un valor numérico con tendencia" },
  { value: "chart", label: "Gráfico", icon: BarChart3, description: "Visualización de datos en gráfico" },
  { value: "table", label: "Tabla", icon: Table, description: "Lista de registros recientes" },
  { value: "activity", label: "Actividad", icon: Activity, description: "Historial de actividad reciente" },
];

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

export function AddWidgetDialog({ open, onOpenChange, onAdd }: AddWidgetDialogProps) {
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
  const [title, setTitle] = useState("");
  const [entity, setEntity] = useState("");
  const [size, setSize] = useState<WidgetSize>("small");

  const handleAdd = () => {
    if (!selectedType || !title) return;

    onAdd({
      type: selectedType,
      title,
      entity: entity || undefined,
      config: {},
      size,
    });

    // Reset form
    setSelectedType(null);
    setTitle("");
    setEntity("");
    setSize("small");
    onOpenChange(false);
  };

  const handleReset = () => {
    setSelectedType(null);
    setTitle("");
    setEntity("");
    setSize("small");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleReset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Añadir Widget</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Widget Type Selection */}
          <div className="space-y-3">
            <Label>Tipo de Widget</Label>
            <div className="grid grid-cols-2 gap-3">
              {widgetTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedType === type.value ? "border-primary ring-2 ring-primary/20" : ""
                    }`}
                    onClick={() => setSelectedType(type.value)}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {selectedType && (
            <>
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
              {(selectedType === "stat" || selectedType === "chart" || selectedType === "table") && (
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
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={!selectedType || !title}>
              Añadir Widget
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
