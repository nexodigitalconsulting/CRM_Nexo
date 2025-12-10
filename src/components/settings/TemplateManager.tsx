import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useSetDefaultTemplate,
  useDeleteTemplate,
  DocumentTemplate,
  renderTemplate,
} from "@/hooks/useTemplates";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Star,
  Eye,
  Code,
  Copy,
  Check,
  Building2,
  User,
  Receipt,
  FileSpreadsheet,
  Calendar,
  Hash,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

const entityTypeLabels: Record<string, string> = {
  contract: "Contrato",
  invoice: "Factura",
  quote: "Presupuesto",
};

// Variables organizadas por entidad con nombre CRM y variable DB
const variablesByEntity: Record<string, Record<string, { label: string; dbVar: string; icon: React.ElementType }[]>> = {
  contract: {
    "Datos de Empresa": [
      { label: "Nombre Empresa", dbVar: "company_name", icon: Building2 },
      { label: "CIF Empresa", dbVar: "company_cif", icon: Hash },
      { label: "Dirección Empresa", dbVar: "company_address", icon: Building2 },
    ],
    "Datos del Cliente": [
      { label: "Nombre Cliente", dbVar: "client_name", icon: User },
      { label: "CIF Cliente", dbVar: "client_cif", icon: Hash },
      { label: "Dirección Cliente", dbVar: "client_address", icon: Building2 },
    ],
    "Datos del Contrato": [
      { label: "Nº Contrato", dbVar: "contract_number", icon: Hash },
      { label: "Nombre Contrato", dbVar: "contract_name", icon: FileText },
      { label: "Fecha Inicio", dbVar: "start_date", icon: Calendar },
      { label: "Fecha Fin", dbVar: "end_date", icon: Calendar },
      { label: "Periodicidad", dbVar: "billing_period", icon: Calendar },
    ],
    "Importes": [
      { label: "Subtotal", dbVar: "subtotal", icon: DollarSign },
      { label: "% IVA", dbVar: "iva_percent", icon: DollarSign },
      { label: "Importe IVA", dbVar: "iva_amount", icon: DollarSign },
      { label: "Total", dbVar: "total", icon: DollarSign },
    ],
    "Servicios (Lista)": [
      { label: "Nombre Servicio", dbVar: "service_name", icon: FileSpreadsheet },
      { label: "Precio Servicio", dbVar: "service_price", icon: DollarSign },
    ],
    "Otros": [
      { label: "Notas", dbVar: "notes", icon: FileText },
    ],
  },
  invoice: {
    "Datos de Empresa": [
      { label: "Nombre Empresa", dbVar: "company_name", icon: Building2 },
      { label: "CIF Empresa", dbVar: "company_cif", icon: Hash },
      { label: "Dirección Empresa", dbVar: "company_address", icon: Building2 },
    ],
    "Datos del Cliente": [
      { label: "Nombre Cliente", dbVar: "client_name", icon: User },
      { label: "CIF Cliente", dbVar: "client_cif", icon: Hash },
      { label: "Dirección Cliente", dbVar: "client_address", icon: Building2 },
    ],
    "Datos de Factura": [
      { label: "Nº Factura", dbVar: "invoice_number", icon: Hash },
      { label: "Fecha Emisión", dbVar: "issue_date", icon: Calendar },
      { label: "Fecha Vencimiento", dbVar: "due_date", icon: Calendar },
      { label: "Método de Pago", dbVar: "payment_method", icon: Receipt },
    ],
    "Importes": [
      { label: "Subtotal", dbVar: "subtotal", icon: DollarSign },
      { label: "% IVA", dbVar: "iva_percent", icon: DollarSign },
      { label: "Importe IVA", dbVar: "iva_amount", icon: DollarSign },
      { label: "Total", dbVar: "total", icon: DollarSign },
    ],
    "Servicios (Lista)": [
      { label: "Nombre Servicio", dbVar: "service_name", icon: FileSpreadsheet },
      { label: "Cantidad", dbVar: "quantity", icon: Hash },
      { label: "Precio Unitario", dbVar: "unit_price", icon: DollarSign },
      { label: "Total Línea", dbVar: "line_total", icon: DollarSign },
    ],
    "Otros": [
      { label: "Notas", dbVar: "notes", icon: FileText },
    ],
  },
  quote: {
    "Datos de Empresa": [
      { label: "Nombre Empresa", dbVar: "company_name", icon: Building2 },
      { label: "CIF Empresa", dbVar: "company_cif", icon: Hash },
      { label: "Dirección Empresa", dbVar: "company_address", icon: Building2 },
    ],
    "Datos del Cliente": [
      { label: "Nombre Cliente", dbVar: "client_name", icon: User },
      { label: "Dirección Cliente", dbVar: "client_address", icon: Building2 },
    ],
    "Datos del Presupuesto": [
      { label: "Nº Presupuesto", dbVar: "quote_number", icon: Hash },
      { label: "Nombre Presupuesto", dbVar: "quote_name", icon: FileText },
      { label: "Válido hasta", dbVar: "valid_until", icon: Calendar },
    ],
    "Importes": [
      { label: "Subtotal", dbVar: "subtotal", icon: DollarSign },
      { label: "% IVA", dbVar: "iva_percent", icon: DollarSign },
      { label: "Importe IVA", dbVar: "iva_amount", icon: DollarSign },
      { label: "Total", dbVar: "total", icon: DollarSign },
    ],
    "Servicios (Lista)": [
      { label: "Nombre Servicio", dbVar: "service_name", icon: FileSpreadsheet },
      { label: "Cantidad", dbVar: "quantity", icon: Hash },
      { label: "Precio Unitario", dbVar: "unit_price", icon: DollarSign },
      { label: "Descuento", dbVar: "discount", icon: DollarSign },
      { label: "Total Línea", dbVar: "line_total", icon: DollarSign },
    ],
    "Otros": [
      { label: "Notas", dbVar: "notes", icon: FileText },
    ],
  },
};

const sampleData: Record<string, Record<string, any>> = {
  contract: {
    contract_number: "CN-2024-0001",
    company_name: "Mi Empresa SL",
    company_cif: "B12345678",
    company_address: "Calle Principal 123, Madrid",
    client_name: "Cliente Ejemplo SA",
    client_cif: "A87654321",
    client_address: "Avenida Secundaria 456, Barcelona",
    contract_name: "Contrato de Servicios Anuales",
    services: [
      { service_name: "Servicio Premium", service_price: "500.00" },
      { service_name: "Mantenimiento", service_price: "150.00" },
    ],
    subtotal: "650.00",
    iva_percent: "21",
    iva_amount: "136.50",
    total: "786.50",
    billing_period: "Mensual",
    start_date: "01/01/2024",
    end_date: "31/12/2024",
  },
  invoice: {
    invoice_number: "F-2024-0001",
    company_name: "Mi Empresa SL",
    company_cif: "B12345678",
    company_address: "Calle Principal 123, Madrid",
    client_name: "Cliente Ejemplo SA",
    client_cif: "A87654321",
    client_address: "Avenida Secundaria 456, Barcelona",
    services: [
      { service_name: "Servicio Premium", quantity: "1", unit_price: "500.00", line_total: "500.00" },
      { service_name: "Horas Extra", quantity: "5", unit_price: "50.00", line_total: "250.00" },
    ],
    subtotal: "750.00",
    iva_percent: "21",
    iva_amount: "157.50",
    total: "907.50",
    issue_date: "15/01/2024",
    due_date: "15/02/2024",
    payment_method: "Transferencia Bancaria",
  },
  quote: {
    quote_number: "P-2024-0001",
    company_name: "Mi Empresa SL",
    company_cif: "B12345678",
    company_address: "Calle Principal 123, Madrid",
    client_name: "Cliente Potencial SL",
    client_address: "Plaza Mayor 789, Valencia",
    quote_name: "Propuesta de Servicios Digitales",
    services: [
      { service_name: "Diseño Web", quantity: "1", unit_price: "2000.00", discount: "10", line_total: "1800.00" },
      { service_name: "SEO Mensual", quantity: "6", unit_price: "300.00", discount: "0", line_total: "1800.00" },
    ],
    subtotal: "3600.00",
    iva_percent: "21",
    iva_amount: "756.00",
    total: "4356.00",
    valid_until: "28/02/2024",
    notes: "Precios válidos para contratación antes de la fecha indicada.",
  },
};

export function TemplateManager() {
  const [selectedType, setSelectedType] = useState<"contract" | "invoice" | "quote">("contract");
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<DocumentTemplate | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");
  
  const [formData, setFormData] = useState({
    name: "",
    content: "",
  });

  const { data: templates, isLoading } = useTemplates(selectedType);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();
  const deleteTemplateMutation = useDeleteTemplate();

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setFormData({ name: "", content: "" });
    setEditorTab("edit");
    setIsEditorOpen(true);
  };

  const handleEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, content: template.content });
    setEditorTab("edit");
    setIsEditorOpen(true);
  };

  const handlePreviewTemplate = (template: DocumentTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error("Nombre y contenido son requeridos");
      return;
    }

    const variableRegex = /{{(\w+)}}/g;
    const matches = formData.content.matchAll(variableRegex);
    const variables = [...new Set([...matches].map(m => m[1]))];

    if (editingTemplate) {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        template: {
          name: formData.name,
          content: formData.content,
          variables,
        },
      });
    } else {
      await createTemplate.mutateAsync({
        name: formData.name,
        entity_type: selectedType,
        content: formData.content,
        variables,
      });
    }
    setIsEditorOpen(false);
  };

  const handleSetDefault = async (template: DocumentTemplate) => {
    await setDefaultTemplate.mutateAsync({
      id: template.id,
      entityType: template.entity_type,
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteTemplate) {
      await deleteTemplateMutation.mutateAsync(deleteTemplate.id);
      setDeleteTemplate(null);
    }
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    setCopiedVar(variable);
    toast.success(`Variable {{${variable}}} copiada`);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `{{${variable}}}`
    }));
  };

  const getPreviewHtml = () => {
    if (!previewTemplate) return "";
    return renderTemplate(previewTemplate.content, sampleData[previewTemplate.entity_type]);
  };

  const getEditorPreviewHtml = () => {
    if (!formData.content) return "";
    return renderTemplate(formData.content, sampleData[selectedType]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Plantillas de Documentos</h3>
          <p className="text-sm text-muted-foreground">
            Diseña y gestiona las plantillas para tus documentos PDF
          </p>
        </div>
        <Button onClick={handleNewTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Type Tabs */}
      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
        <TabsList>
          <TabsTrigger value="contract" className="gap-2">
            <FileText className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-2">
            <Receipt className="h-4 w-4" />
            Facturas
          </TabsTrigger>
          <TabsTrigger value="quote" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Presupuestos
          </TabsTrigger>
        </TabsList>

        {["contract", "invoice", "quote"].map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : templates && templates.length > 0 ? (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{template.name}</p>
                          {template.is_default && (
                            <Badge variant="secondary" className="gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              Predeterminada
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.variables?.length || 0} variables
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewTemplate(template)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Vista Previa
                      </Button>
                      {!template.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(template)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTemplate(template)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay plantillas para {entityTypeLabels[type]}</p>
                <Button
                  variant="link"
                  onClick={handleNewTemplate}
                  className="mt-2"
                >
                  Crear primera plantilla
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Plantilla" : `Nueva Plantilla de ${entityTypeLabels[selectedType]}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
            {/* Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="mb-4">
                <Label htmlFor="template-name">Nombre de la Plantilla</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Contrato Estándar"
                  className="mt-1"
                />
              </div>

              <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as any)} className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-fit">
                  <TabsTrigger value="edit" className="gap-2">
                    <Code className="h-4 w-4" />
                    Código HTML
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Vista Previa
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="flex-1 mt-2 min-h-0">
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Escribe el HTML de tu plantilla aquí..."
                    className="h-full min-h-[400px] font-mono text-sm resize-none"
                  />
                </TabsContent>

                <TabsContent value="preview" className="flex-1 mt-2 overflow-hidden min-h-0">
                  <ScrollArea className="h-full border rounded-lg bg-white">
                    <div
                      className="p-4"
                      dangerouslySetInnerHTML={{ __html: getEditorPreviewHtml() }}
                    />
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>

            {/* Variables Panel - Mejorado */}
            <div className="w-80 flex flex-col border-l pl-4">
              <Label className="mb-2 text-base font-semibold">Variables por Entidad</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Haz clic en una variable para copiarla o doble clic para insertarla
              </p>
              <ScrollArea className="flex-1">
                <Accordion type="multiple" defaultValue={Object.keys(variablesByEntity[selectedType])} className="w-full">
                  {Object.entries(variablesByEntity[selectedType]).map(([category, variables]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-sm font-medium py-2">
                        {category}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1">
                          {variables.map((variable) => {
                            const Icon = variable.icon;
                            return (
                              <button
                                key={variable.dbVar}
                                onClick={() => handleCopyVariable(variable.dbVar)}
                                onDoubleClick={() => insertVariable(variable.dbVar)}
                                className="w-full text-left px-2 py-2 text-sm rounded hover:bg-muted flex items-center justify-between group border border-transparent hover:border-border"
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div>
                                    <p className="text-xs font-medium">{variable.label}</p>
                                    <code className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                                      {`{{${variable.dbVar}}}`}
                                    </code>
                                  </div>
                                </div>
                                {copiedVar === variable.dbVar ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium mb-2">Sintaxis para listas (servicios):</p>
                  <div className="bg-muted p-2 rounded text-xs font-mono space-y-1">
                    <p className="text-primary">{`{{#services}}`}</p>
                    <p className="pl-2 text-muted-foreground">{`{{service_name}} - {{service_price}}`}</p>
                    <p className="text-primary">{`{{/services}}`}</p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={createTemplate.isPending || updateTemplate.isPending}
            >
              {editingTemplate ? "Guardar Cambios" : "Crear Plantilla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="bg-white border rounded-lg p-4">
              <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la plantilla "{deleteTemplate?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
