import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Copy, Trash2, Star, FileSignature } from "lucide-react";
import { PdfTemplate } from "@/hooks/usePdfTemplates";

interface PdfTemplateSelectorProps {
  templates: PdfTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  hasUnsavedChanges?: boolean;
}

export function PdfTemplateSelector({
  templates,
  selectedId,
  onSelect,
  onNew,
  onDuplicate,
  onSetDefault,
  onDelete,
  hasUnsavedChanges,
}: PdfTemplateSelectorProps) {
  const selectedTemplate = templates.find(t => t.id === selectedId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FileSignature className="h-4 w-4" />
        <span>Plantilla</span>
      </div>

      <Select value={selectedId || ''} onValueChange={onSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona plantilla" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                {template.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                {template.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onNew} className="flex-1">
          <Plus className="h-3 w-3 mr-1" /> Nueva
        </Button>
        
        {selectedTemplate && (
          <Button variant="outline" size="sm" onClick={onDuplicate} className="flex-1">
            <Copy className="h-3 w-3 mr-1" /> Duplicar
          </Button>
        )}
      </div>

      {selectedTemplate && (
        <div className="flex flex-wrap gap-2">
          {!selectedTemplate.is_default && (
            <Button variant="outline" size="sm" onClick={onSetDefault} className="flex-1">
              <Star className="h-3 w-3 mr-1" /> Predeterminada
            </Button>
          )}
          
          {templates.length > 1 && (
            <Button variant="outline" size="sm" onClick={onDelete} className="flex-1">
              <Trash2 className="h-3 w-3 mr-1" /> Eliminar
            </Button>
          )}
        </div>
      )}

      {selectedTemplate?.is_default && (
        <Badge variant="secondary" className="gap-1 w-full justify-center">
          <Star className="h-3 w-3 fill-current" /> Predeterminada
        </Badge>
      )}

      {hasUnsavedChanges && (
        <Badge variant="outline" className="text-amber-600 border-amber-300 w-full justify-center">
          Cambios sin guardar
        </Badge>
      )}
    </div>
  );
}
