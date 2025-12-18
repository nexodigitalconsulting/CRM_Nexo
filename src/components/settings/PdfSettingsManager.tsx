import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePdfSettings, useUpdatePdfSettings, PdfSettingsUpdate } from "@/hooks/usePdfSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Loader2, FileText, Palette, Eye, Save, Layout, Type, Image, CheckCircle, AlertCircle, PenTool } from "lucide-react";
import { PdfTemplateEditor } from "./PdfTemplateEditor";

type DocumentType = 'invoice' | 'quote' | 'contract';

const documentLabels: Record<DocumentType, string> = {
  invoice: 'Factura',
  quote: 'Presupuesto',
  contract: 'Contrato',
};

export function PdfSettingsManager() {
  const { data: settings, isLoading } = usePdfSettings();
  const { data: companySettings } = useCompanySettings();
  const updateSettings = useUpdatePdfSettings();
  
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>('invoice');
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
  
  const hasLogo = !!companySettings?.logo_url;
  
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
            Editor de Documentos PDF
          </h3>
          <p className="text-sm text-muted-foreground">
            Personaliza el aspecto de facturas, presupuestos y contratos
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
          {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </div>

      {/* Document Type Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Tipo de documento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(Object.keys(documentLabels) as DocumentType[]).map((type) => (
              <Button
                key={type}
                variant={selectedDocument === type ? "default" : "outline"}
                onClick={() => setSelectedDocument(type)}
                className="flex-1"
              >
                {documentLabels[type]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            La configuración se aplica a todos los tipos de documentos
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="colors" className="gap-1">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Colores</span>
              </TabsTrigger>
              <TabsTrigger value="layout" className="gap-1">
                <Layout className="h-4 w-4" />
                <span className="hidden sm:inline">Diseño</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="gap-1">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Contenido</span>
              </TabsTrigger>
              <TabsTrigger value="typography" className="gap-1">
                <Type className="h-4 w-4" />
                <span className="hidden sm:inline">Texto</span>
              </TabsTrigger>
              <TabsTrigger value="visual-editor" className="gap-1">
                <PenTool className="h-4 w-4" />
                <span className="hidden sm:inline">Editor</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="colors" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Color primario</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary_color"
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="flex-1 font-mono text-sm"
                          placeholder="#3366cc"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Títulos y totales</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="secondary_color">Color secundario</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary_color"
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="flex-1 font-mono text-sm"
                          placeholder="#666666"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Texto secundario</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="accent_color">Color acento</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accent_color"
                          type="color"
                          value={formData.accent_color}
                          onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={formData.accent_color}
                          onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                          className="flex-1 font-mono text-sm"
                          placeholder="#0066cc"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Enlaces y detalles</p>
                    </div>
                  </div>
                  
                  {/* Color Preview */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm font-medium mb-3">Vista previa de colores</p>
                    <div className="flex gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-md border"
                          style={{ backgroundColor: formData.primary_color }}
                        />
                        <span className="text-sm" style={{ color: formData.primary_color }}>
                          Título Principal
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-md border"
                          style={{ backgroundColor: formData.secondary_color }}
                        />
                        <span className="text-sm" style={{ color: formData.secondary_color }}>
                          Texto secundario
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-md border"
                          style={{ backgroundColor: formData.accent_color }}
                        />
                        <span className="text-sm" style={{ color: formData.accent_color }}>
                          Enlace
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="layout" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  {/* Logo Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Image className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <Label>Logo de empresa</Label>
                          <p className="text-xs text-muted-foreground">
                            Mostrar logo en la cabecera del documento
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.show_logo}
                        onCheckedChange={(checked) => setFormData({ ...formData, show_logo: checked })}
                        disabled={!hasLogo}
                      />
                    </div>
                    
                    {!hasLogo && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          No hay logo configurado. Súbelo en Configuración → Empresa
                        </span>
                      </div>
                    )}
                    
                    {hasLogo && formData.show_logo && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700 dark:text-green-400">Logo configurado</span>
                          {companySettings?.logo_url && (
                            <img 
                              src={companySettings.logo_url} 
                              alt="Logo" 
                              className="h-8 object-contain ml-auto"
                            />
                          )}
                        </div>
                        
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
                              <SelectItem value="left">← Izquierda</SelectItem>
                              <SelectItem value="center">↔ Centro</SelectItem>
                              <SelectItem value="right">→ Derecha</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Header Style */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Estilo de cabecera</Label>
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
                        <SelectItem value="classic">
                          <div className="flex flex-col">
                            <span>Clásico</span>
                            <span className="text-xs text-muted-foreground">Formal con líneas separadoras</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="modern">
                          <div className="flex flex-col">
                            <span>Moderno</span>
                            <span className="text-xs text-muted-foreground">Limpio y espacioso</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="minimal">
                          <div className="flex flex-col">
                            <span>Minimalista</span>
                            <span className="text-xs text-muted-foreground">Solo lo esencial</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="content" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>Columna de descuentos</Label>
                      <p className="text-xs text-muted-foreground">
                        Mostrar columna de descuento en la tabla de servicios
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_discounts_column}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_discounts_column: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-t">
                    <div>
                      <Label>Sección de notas</Label>
                      <p className="text-xs text-muted-foreground">
                        Incluir observaciones en el documento
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_notes}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_notes: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-t">
                    <div>
                      <Label>IBAN en pie de página</Label>
                      <p className="text-xs text-muted-foreground">
                        Mostrar cuenta bancaria para pagos
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_iban_footer}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_iban_footer: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="typography" className="space-y-4 mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
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
                        <SelectItem value="8">8pt - Muy pequeño (máxima información)</SelectItem>
                        <SelectItem value="9">9pt - Pequeño</SelectItem>
                        <SelectItem value="10">10pt - Normal (recomendado)</SelectItem>
                        <SelectItem value="11">11pt - Medio</SelectItem>
                        <SelectItem value="12">12pt - Grande (mejor legibilidad)</SelectItem>
                        <SelectItem value="14">14pt - Muy grande</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El tamaño base afecta a todo el texto del documento proporcionalmente
                    </p>
                  </div>
                  
                  {/* Font Size Preview */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm font-medium mb-3">Vista previa de tamaño</p>
                    <div className="space-y-2 bg-white dark:bg-background p-3 rounded border">
                      <p style={{ fontSize: `${(formData.font_size_base || 10) + 8}px` }} className="font-bold">
                        FACTURA #2024001
                      </p>
                      <p style={{ fontSize: `${formData.font_size_base || 10}px` }}>
                        Servicio de consultoría - Cantidad: 1 - Total: 1.500,00 €
                      </p>
                      <p style={{ fontSize: `${(formData.font_size_base || 10) - 2}px` }} className="text-muted-foreground">
                        Observaciones del documento
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visual-editor" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Editor Visual Avanzado
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <PdfTemplateEditor documentType={selectedDocument} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vista previa
                </span>
                <Badge variant="secondary">{documentLabels[selectedDocument]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mini PDF Preview */}
              <div 
                className="aspect-[1/1.414] bg-white rounded-lg border shadow-sm p-3 text-[6px] overflow-hidden"
                style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
              >
                {/* Header */}
                <div className="flex justify-between mb-2">
                  <div>
                    {formData.show_logo && hasLogo && (
                      <div 
                        className="w-8 h-4 bg-muted rounded mb-1 flex items-center justify-center text-[4px]"
                        style={{ 
                          marginLeft: formData.logo_position === 'center' ? 'auto' : 0,
                          marginRight: formData.logo_position === 'center' ? 'auto' : 
                                      formData.logo_position === 'right' ? 0 : 'auto'
                        }}
                      >
                        LOGO
                      </div>
                    )}
                    <div 
                      className="font-bold"
                      style={{ color: formData.primary_color, fontSize: '8px' }}
                    >
                      {companySettings?.name || 'Mi Empresa'}
                    </div>
                    <div style={{ color: formData.secondary_color }}>
                      CIF: B12345678
                    </div>
                  </div>
                  <div className="text-right">
                    <div 
                      className="font-bold"
                      style={{ color: formData.primary_color, fontSize: '7px' }}
                    >
                      {selectedDocument === 'invoice' ? 'FACTURA' : 
                       selectedDocument === 'quote' ? 'PRESUPUESTO' : 'CONTRATO'}
                    </div>
                    <div className="font-bold text-[8px]">#2024001</div>
                  </div>
                </div>
                
                {/* Separator */}
                <div className="border-t my-1" />
                
                {/* Client */}
                <div className="mb-2">
                  <div className="font-bold mb-0.5" style={{ color: formData.secondary_color }}>CLIENTE</div>
                  <div className="font-bold">Cliente Ejemplo S.L.</div>
                  <div style={{ color: formData.secondary_color }}>CIF: A12345678</div>
                </div>
                
                {/* Table */}
                <div className="border rounded overflow-hidden mb-2">
                  <div className="bg-gray-100 p-0.5 flex text-[5px] font-bold">
                    <div className="flex-1">Descripción</div>
                    <div className="w-6 text-center">Cant.</div>
                    <div className="w-8 text-right">Precio</div>
                    {formData.show_discounts_column && <div className="w-6 text-right">Dto.</div>}
                    <div className="w-8 text-right">Total</div>
                  </div>
                  <div className="p-0.5 flex text-[5px]">
                    <div className="flex-1">Servicio ejemplo</div>
                    <div className="w-6 text-center">1</div>
                    <div className="w-8 text-right">100€</div>
                    {formData.show_discounts_column && <div className="w-6 text-right">-</div>}
                    <div className="w-8 text-right">100€</div>
                  </div>
                  <div className="p-0.5 flex text-[5px] bg-gray-50">
                    <div className="flex-1">Otro servicio</div>
                    <div className="w-6 text-center">2</div>
                    <div className="w-8 text-right">50€</div>
                    {formData.show_discounts_column && <div className="w-6 text-right">10%</div>}
                    <div className="w-8 text-right">90€</div>
                  </div>
                </div>
                
                {/* Totals */}
                <div className="text-right mb-2">
                  <div className="flex justify-end gap-2">
                    <span style={{ color: formData.secondary_color }}>Subtotal:</span>
                    <span>190,00 €</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <span style={{ color: formData.secondary_color }}>IVA (21%):</span>
                    <span>39,90 €</span>
                  </div>
                  <div className="border-t mt-0.5 pt-0.5">
                    <div className="flex justify-end gap-2 font-bold">
                      <span>TOTAL:</span>
                      <span style={{ color: formData.primary_color }}>229,90 €</span>
                    </div>
                  </div>
                </div>
                
                {/* Notes */}
                {formData.show_notes && (
                  <div className="mb-2">
                    <div className="font-bold text-[5px]" style={{ color: formData.secondary_color }}>
                      Observaciones:
                    </div>
                    <div className="text-[4px]" style={{ color: formData.secondary_color }}>
                      Notas adicionales del documento...
                    </div>
                  </div>
                )}
                
                {/* Footer */}
                <div className="absolute bottom-2 left-3 right-3 text-center border-t pt-1">
                  <div className="text-[4px]" style={{ color: formData.secondary_color }}>
                    {formData.show_iban_footer ? 'IBAN: ES00 0000 0000 0000 0000 0000' : companySettings?.name || 'Mi Empresa'}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-3">
                Vista previa simplificada. El PDF real incluirá todos los detalles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
