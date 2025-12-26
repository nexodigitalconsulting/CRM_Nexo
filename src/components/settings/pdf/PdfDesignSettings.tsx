import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Type, Layout, FileSignature, Palette } from "lucide-react";

interface PdfDesignSettingsProps {
  titleText: string;
  titleSize: number;
  clientBoxColor: string;
  tableHeaderColor: string;
  showFooterLegal: boolean;
  footerLegalText: string;
  lineSpacing: number;
  sectionSpacing: number;
  rowHeight: number;
  clientBoxPadding: number;
  docMargins: number;
  showTableBorders: boolean;
  tableBorderColor: string;
  showTotalsLines: boolean;
  totalsLineColor: string;
  onChange: (field: string, value: string | number | boolean) => void;
}

export function PdfDesignSettings({
  titleText,
  titleSize,
  clientBoxColor,
  tableHeaderColor,
  showFooterLegal,
  footerLegalText,
  lineSpacing,
  sectionSpacing,
  rowHeight,
  clientBoxPadding,
  docMargins,
  showTableBorders,
  tableBorderColor,
  showTotalsLines,
  totalsLineColor,
  onChange,
}: PdfDesignSettingsProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Settings2 className="h-4 w-4" />
        <span>Diseño avanzado</span>
      </div>

      {/* Título */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium flex items-center gap-1">
          <Type className="h-3 w-3" />
          Título
        </h4>
        <div className="space-y-2">
          <Input
            value={titleText}
            onChange={(e) => onChange('titleText', e.target.value)}
            placeholder="FACTURA"
            className="h-8 text-sm"
          />
          <div className="space-y-1">
            <Label className="text-xs">Tamaño: {titleSize}px</Label>
            <Input
              type="range"
              min="20"
              max="40"
              value={titleSize}
              onChange={(e) => onChange('titleSize', Number(e.target.value))}
              className="w-full h-6"
            />
          </div>
        </div>
      </div>

      {/* Colores elementos */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium flex items-center gap-1">
          <Palette className="h-3 w-3" />
          Elementos
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Caja cliente</Label>
            <Input
              type="color"
              value={clientBoxColor}
              onChange={(e) => onChange('clientBoxColor', e.target.value)}
              className="w-full h-8 p-0.5 cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cabecera tabla</Label>
            <Input
              type="color"
              value={tableHeaderColor}
              onChange={(e) => onChange('tableHeaderColor', e.target.value)}
              className="w-full h-8 p-0.5 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Espaciado */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium flex items-center gap-1">
          <Layout className="h-3 w-3" />
          Espaciado
        </h4>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Líneas: {lineSpacing}px</Label>
            <Input
              type="range"
              min="10"
              max="22"
              value={lineSpacing}
              onChange={(e) => onChange('lineSpacing', Number(e.target.value))}
              className="w-full h-6"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Secciones: {sectionSpacing}px</Label>
            <Input
              type="range"
              min="16"
              max="50"
              value={sectionSpacing}
              onChange={(e) => onChange('sectionSpacing', Number(e.target.value))}
              className="w-full h-6"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Filas tabla: {rowHeight}px</Label>
            <Input
              type="range"
              min="18"
              max="36"
              value={rowHeight}
              onChange={(e) => onChange('rowHeight', Number(e.target.value))}
              className="w-full h-6"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Márgenes: {docMargins}px</Label>
            <Input
              type="range"
              min="30"
              max="80"
              value={docMargins}
              onChange={(e) => onChange('docMargins', Number(e.target.value))}
              className="w-full h-6"
            />
          </div>
        </div>
      </div>

      {/* Bordes */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium">Líneas y bordes</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Bordes tabla</Label>
            <Switch
              checked={showTableBorders}
              onCheckedChange={(checked) => onChange('showTableBorders', checked)}
            />
          </div>
          {showTableBorders && (
            <Input
              type="color"
              value={tableBorderColor}
              onChange={(e) => onChange('tableBorderColor', e.target.value)}
              className="w-full h-6 p-0.5 cursor-pointer"
            />
          )}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Líneas totales</Label>
            <Switch
              checked={showTotalsLines}
              onCheckedChange={(checked) => onChange('showTotalsLines', checked)}
            />
          </div>
        </div>
      </div>

      {/* Pie legal */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium flex items-center gap-1">
            <FileSignature className="h-3 w-3" />
            Pie legal
          </h4>
          <Switch
            checked={showFooterLegal}
            onCheckedChange={(checked) => onChange('showFooterLegal', checked)}
          />
        </div>
        {showFooterLegal && (
          <Textarea
            value={footerLegalText}
            onChange={(e) => onChange('footerLegalText', e.target.value)}
            placeholder="Texto legal..."
            rows={3}
            className="text-xs"
          />
        )}
      </div>
    </div>
  );
}
