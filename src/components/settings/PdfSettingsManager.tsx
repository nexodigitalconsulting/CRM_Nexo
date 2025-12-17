import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePdfSettings, useUpdatePdfSettings, PdfSettingsUpdate } from "@/hooks/usePdfSettings";
import { Loader2, FileText, Palette, Eye, Save, Info } from "lucide-react";

export function PdfSettingsManager() {
  const { data: settings, isLoading } = usePdfSettings();
  const updateSettings = useUpdatePdfSettings();
  
  const [formData, setFormData] = useState<PdfSettingsUpdate>({
    primary_color: "#3366cc",
    secondary_color: "#666666",
    accent_color: "#0066cc",
    show_logo: true,
    logo_position: "left",
    show_iban_footer: true,
    show_notes: true,
    show_discounts_column: true,
    header_style: "classic",
    font_size_base: 10,
  });
  
  useEffect(() => {
    if (settings) {
      setFormData({
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        accent_color: settings.accent_color,
        show_logo: settings.show_logo,
        logo_position: settings.logo_position,
        show_iban_footer: settings.show_iban_footer,
        show_notes: settings.show_notes,
        show_discounts_column: settings.show_discounts_column,
        header_style: settings.header_style,
        font_size_base: settings.font_size_base,
      });
    }
  }, [settings]);
  
  const handleSave = () => {
    if (!settings) return;
    updateSettings.mutate({ id: settings.id, settings: formData });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configuración de PDFs
          </h3>
          <p className="text-sm text-muted-foreground">
            Personaliza el aspecto de los documentos PDF generados (facturas, presupuestos, contratos)
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
          {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </div>
      
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Estos ajustes afectan a los PDFs generados para adjuntar en emails y descargas directas.
          Para impresión desde el navegador, se usan las plantillas HTML en "Plantillas".
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors Section */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Colores
          </h4>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Color primario</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1"
                  placeholder="#3366cc"
                />
              </div>
              <p className="text-xs text-muted-foreground">Usado en títulos y totales</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Color secundario</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="flex-1"
                  placeholder="#666666"
                />
              </div>
              <p className="text-xs text-muted-foreground">Usado en texto secundario</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accent_color">Color acento</Label>
              <div className="flex gap-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  className="flex-1"
                  placeholder="#0066cc"
                />
              </div>
              <p className="text-xs text-muted-foreground">Usado en enlaces y detalles</p>
            </div>
          </div>
        </div>

        {/* Display Options */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Opciones de visualización
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar logo</Label>
                <p className="text-xs text-muted-foreground">Incluir logo de empresa en cabecera</p>
              </div>
              <Switch
                checked={formData.show_logo}
                onCheckedChange={(checked) => setFormData({ ...formData, show_logo: checked })}
              />
            </div>
            
            {formData.show_logo && (
              <div className="space-y-2">
                <Label>Posición del logo</Label>
                <Select
                  value={formData.logo_position}
                  onValueChange={(value: 'left' | 'center' | 'right') => 
                    setFormData({ ...formData, logo_position: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Izquierda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Derecha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar IBAN en pie</Label>
                <p className="text-xs text-muted-foreground">Incluir IBAN de empresa en el footer</p>
              </div>
              <Switch
                checked={formData.show_iban_footer}
                onCheckedChange={(checked) => setFormData({ ...formData, show_iban_footer: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar notas</Label>
                <p className="text-xs text-muted-foreground">Incluir sección de observaciones</p>
              </div>
              <Switch
                checked={formData.show_notes}
                onCheckedChange={(checked) => setFormData({ ...formData, show_notes: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Mostrar columna descuentos</Label>
                <p className="text-xs text-muted-foreground">Columna de descuento en tabla</p>
              </div>
              <Switch
                checked={formData.show_discounts_column}
                onCheckedChange={(checked) => setFormData({ ...formData, show_discounts_column: checked })}
              />
            </div>
          </div>
        </div>

        {/* Style Options */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h4 className="font-medium">Estilo de cabecera</h4>
          
          <Select
            value={formData.header_style}
            onValueChange={(value: 'classic' | 'modern' | 'minimal') => 
              setFormData({ ...formData, header_style: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Clásico - Formal con líneas</SelectItem>
              <SelectItem value="modern">Moderno - Limpio y espacioso</SelectItem>
              <SelectItem value="minimal">Minimalista - Solo lo esencial</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Define el estilo visual general del documento
          </p>
        </div>

        {/* Typography */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h4 className="font-medium">Tipografía</h4>
          
          <div className="space-y-2">
            <Label>Tamaño de fuente base</Label>
            <Select
              value={String(formData.font_size_base)}
              onValueChange={(value) => 
                setFormData({ ...formData, font_size_base: Number(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8pt - Muy pequeño</SelectItem>
                <SelectItem value="9">9pt - Pequeño</SelectItem>
                <SelectItem value="10">10pt - Normal</SelectItem>
                <SelectItem value="11">11pt - Medio</SelectItem>
                <SelectItem value="12">12pt - Grande</SelectItem>
                <SelectItem value="14">14pt - Muy grande</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tamaño base para el texto del documento
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}