import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette } from "lucide-react";

interface PdfColorSettingsProps {
  primaryColor: string;
  secondaryColor: string;
  templateName: string;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  onNameChange: (name: string) => void;
}

export function PdfColorSettings({
  primaryColor,
  secondaryColor,
  templateName,
  onPrimaryChange,
  onSecondaryChange,
  onNameChange,
}: PdfColorSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
        <Palette className="h-4 w-4" />
        <span>Colores</span>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Nombre plantilla</Label>
        <Input
          value={templateName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nombre"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Color primario</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={primaryColor}
            onChange={(e) => onPrimaryChange(e.target.value)}
            className="w-10 h-8 p-0.5 cursor-pointer"
          />
          <Input
            value={primaryColor}
            onChange={(e) => onPrimaryChange(e.target.value)}
            className="flex-1 h-8 font-mono text-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Color secundario</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={secondaryColor}
            onChange={(e) => onSecondaryChange(e.target.value)}
            className="w-10 h-8 p-0.5 cursor-pointer"
          />
          <Input
            value={secondaryColor}
            onChange={(e) => onSecondaryChange(e.target.value)}
            className="flex-1 h-8 font-mono text-xs"
          />
        </div>
      </div>

      {/* Color preview */}
      <div className="border rounded-lg p-3 bg-muted/30">
        <p className="text-xs font-medium mb-2">Vista previa</p>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded border" style={{ backgroundColor: primaryColor }} />
            <span className="text-xs" style={{ color: primaryColor }}>Principal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded border" style={{ backgroundColor: secondaryColor }} />
            <span className="text-xs" style={{ color: secondaryColor }}>Secundario</span>
          </div>
        </div>
      </div>
    </div>
  );
}
