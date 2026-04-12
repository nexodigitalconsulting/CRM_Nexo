"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { 
  useEntityConfigurations, 
  useUpdateEntityConfiguration, 
  type EntityField,
  type EntityConfiguration 
} from "@/hooks/useEntityConfigurations";
import { 
  Settings2, 
  Plus, 
  Trash2, 
  GripVertical, 
  Edit2,
  Building2,
  Users,
  Megaphone,
  FileText,
  Receipt,
  Calendar
} from "lucide-react";
import { toast } from "sonner";

import { Wallet, ShoppingCart, Package, Briefcase, FolderOpen, Tag } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Users,
  Megaphone,
  FileText,
  Receipt,
  Calendar,
  Wallet,
  ShoppingCart,
  Package,
  Briefcase,
  FolderOpen,
  Tag,
};

const fieldTypes = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto Multilínea" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Teléfono" },
  { value: "url", label: "URL" },
  { value: "number", label: "Número" },
  { value: "currency", label: "Moneda" },
  { value: "percent", label: "Porcentaje" },
  { value: "date", label: "Fecha" },
  { value: "datetime", label: "Fecha/Hora" },
  { value: "select", label: "Selector" },
  { value: "checkbox", label: "Checkbox" },
  { value: "formula", label: "Fórmula" },
];

const iconOptions = [
  { value: "Building2", label: "Edificio" },
  { value: "Users", label: "Usuarios" },
  { value: "Megaphone", label: "Megáfono" },
  { value: "FileText", label: "Documento" },
  { value: "Receipt", label: "Factura" },
  { value: "Calendar", label: "Calendario" },
  { value: "Wallet", label: "Cartera" },
  { value: "ShoppingCart", label: "Carrito" },
  { value: "Package", label: "Paquete" },
  { value: "Briefcase", label: "Maletín" },
  { value: "FolderOpen", label: "Carpeta" },
  { value: "Tag", label: "Etiqueta" },
];

export function EntityConfigManager() {
  const { data: entities, isLoading } = useEntityConfigurations();
  const updateEntity = useUpdateEntityConfiguration();
  const [selectedEntity, setSelectedEntity] = useState<EntityConfiguration | null>(null);
  const [editingFields, setEditingFields] = useState<EntityField[]>([]);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [newField, setNewField] = useState<EntityField>({
    name: "",
    label: "",
    type: "text",
    required: false,
    options: [],
  });

  const handleEditEntity = (entity: EntityConfiguration) => {
    setSelectedEntity(entity);
    setEditingFields(entity.fields || []);
  };

  const handleAddField = () => {
    if (!newField.name || !newField.label) {
      toast.error("Nombre y etiqueta son requeridos");
      return;
    }

    const fieldName = newField.name.toLowerCase().replace(/\s+/g, "_");
    
    if (editingFields.some(f => f.name === fieldName)) {
      toast.error("Ya existe un campo con ese nombre");
      return;
    }

    setEditingFields([...editingFields, { ...newField, name: fieldName }]);
    setNewField({ name: "", label: "", type: "text", required: false, options: [] });
    setShowFieldDialog(false);
    toast.success("Campo añadido");
  };

  const handleRemoveField = (index: number) => {
    const field = editingFields[index];
    if (field.required && selectedEntity?.is_system) {
      toast.error("No se pueden eliminar campos requeridos del sistema");
      return;
    }
    setEditingFields(editingFields.filter((_, i) => i !== index));
  };

  const handleToggleRequired = (index: number) => {
    const updated = [...editingFields];
    updated[index] = { ...updated[index], required: !updated[index].required };
    setEditingFields(updated);
  };

  const handleSaveFields = async () => {
    if (!selectedEntity) return;

    try {
      await updateEntity.mutateAsync({
        id: selectedEntity.id,
        entity_name: selectedEntity.entity_name,
        fields: editingFields,
      });
      setSelectedEntity(null);
    } catch (error) {
      console.error("Error saving fields:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configuración de Entidades</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los campos y configuración de cada entidad del sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities?.map((entity) => {
          const IconComponent = iconMap[entity.icon || "FileText"] || FileText;
          return (
            <Card key={entity.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{entity.display_name}</CardTitle>
                  </div>
                  {entity.is_system && (
                    <Badge variant="secondary" className="text-xs">Sistema</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {entity.fields?.length || 0} campos configurados
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {entity.fields?.slice(0, 4).map((field) => (
                      <Badge key={field.name} variant="outline" className="text-xs">
                        {field.label}
                      </Badge>
                    ))}
                    {(entity.fields?.length || 0) > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{(entity.fields?.length || 0) - 4} más
                      </Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => handleEditEntity(entity)}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configurar Campos
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para editar campos de una entidad */}
      <Dialog open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurar: {selectedEntity?.display_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {selectedEntity?.is_system 
                  ? "Entidad del sistema - algunos campos no se pueden eliminar"
                  : "Entidad personalizada - puedes modificar todos los campos"
                }
              </p>
              <Button size="sm" onClick={() => setShowFieldDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Añadir Campo
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Requerido</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editingFields.map((field, index) => (
                  <TableRow key={field.name}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{field.name}</TableCell>
                    <TableCell>{field.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {fieldTypes.find(t => t.value === field.type)?.label || field.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={field.required}
                        onCheckedChange={() => handleToggleRequired(index)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedEntity(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveFields} disabled={updateEntity.isPending}>
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para añadir nuevo campo */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Campo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre Interno</Label>
              <Input
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                placeholder="nombre_campo"
              />
              <p className="text-xs text-muted-foreground">
                Se usará como identificador (sin espacios, minúsculas)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <Input
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                placeholder="Nombre del Campo"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Campo</Label>
              <Select
                value={newField.type}
                onValueChange={(value) => setNewField({ ...newField, type: value as EntityField["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newField.required}
                onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
              />
              <Label>Campo Requerido</Label>
            </div>

            {newField.type === "select" && (
              <div className="space-y-2">
                <Label>Opciones (separadas por coma)</Label>
                <Input
                  value={newField.options?.join(", ") || ""}
                  onChange={(e) => setNewField({ 
                    ...newField, 
                    options: e.target.value.split(",").map(o => o.trim()).filter(Boolean)
                  })}
                  placeholder="opcion1, opcion2, opcion3"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowFieldDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddField}>
                Añadir Campo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
