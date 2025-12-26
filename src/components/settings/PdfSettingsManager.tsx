import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  usePdfTemplates,
  useCreatePdfTemplate,
  useUpdatePdfTemplate,
  useDeletePdfTemplate,
  useSetDefaultTemplate,
} from "@/hooks/usePdfTemplates";
import { 
  Loader2, FileText, Palette, Eye, Layout, 
  Building2, User, Calendar, DollarSign, Hash, Mail, Phone, MapPin,
  Table2, FileSignature, Settings2, Layers, Code
} from "lucide-react";
import { toast } from "sonner";
import { PdfPreview } from "./PdfPreview";
import { PdfSectionEditor } from "./PdfSectionEditor";
import { PdfSettingsPanel, PanelSectionContent } from "./PdfSettingsPanel";
import { PdfDocumentSelector } from "./pdf/PdfDocumentSelector";
import { PdfTemplateSelector } from "./pdf/PdfTemplateSelector";
import { PdfColorSettings } from "./pdf/PdfColorSettings";
import { PdfDesignSettings } from "./pdf/PdfDesignSettings";
import { embedPdfConfigInTemplate, extractPdfConfigFromTemplate } from "@/hooks/useDefaultTemplate";
import { PdfConfig, PdfSections, getDefaultSections } from "@/lib/pdf/pdfUtils";
import { cn } from "@/lib/utils";

type DocumentType = 'invoice' | 'quote' | 'contract';

const documentLabels: Record<DocumentType, string> = {
  invoice: 'Factura',
  quote: 'Presupuesto',
  contract: 'Contrato',
};

// Variables disponibles
const VARIABLES = {
  common: [
    { key: 'company_name', label: 'Nombre empresa', icon: Building2 },
    { key: 'company_cif', label: 'CIF empresa', icon: Hash },
    { key: 'company_address', label: 'Dirección empresa', icon: MapPin },
    { key: 'company_email', label: 'Email empresa', icon: Mail },
    { key: 'company_phone', label: 'Teléfono empresa', icon: Phone },
    { key: 'company_iban', label: 'IBAN empresa', icon: DollarSign },
    { key: 'client_name', label: 'Nombre cliente', icon: User },
    { key: 'client_cif', label: 'CIF cliente', icon: Hash },
    { key: 'client_address', label: 'Dirección cliente', icon: MapPin },
  ],
  invoice: [
    { key: 'invoice_number', label: 'Nº Factura', icon: Hash },
    { key: 'issue_date', label: 'Fecha emisión', icon: Calendar },
    { key: 'due_date', label: 'Vencimiento', icon: Calendar },
    { key: 'subtotal', label: 'Subtotal', icon: DollarSign },
    { key: 'iva_amount', label: 'IVA', icon: DollarSign },
    { key: 'total', label: 'Total', icon: DollarSign },
  ],
  contract: [
    { key: 'contract_number', label: 'Nº Contrato', icon: Hash },
    { key: 'start_date', label: 'Fecha inicio', icon: Calendar },
    { key: 'end_date', label: 'Fecha fin', icon: Calendar },
    { key: 'subtotal', label: 'Subtotal', icon: DollarSign },
    { key: 'total', label: 'Total', icon: DollarSign },
  ],
  quote: [
    { key: 'quote_number', label: 'Nº Presupuesto', icon: Hash },
    { key: 'quote_date', label: 'Fecha', icon: Calendar },
    { key: 'valid_until', label: 'Válido hasta', icon: Calendar },
    { key: 'subtotal', label: 'Subtotal', icon: DollarSign },
    { key: 'total', label: 'Total', icon: DollarSign },
  ],
};

// Default template generator
const getDefaultTemplate = (type: DocumentType, primaryColor: string, secondaryColor: string): string => {
  const baseTemplate = `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937;">
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
    <div>{{company_logo}}<h2 style="margin: 10px 0 0 0; color: #333;">{{company_name}}</h2></div>
    <div style="text-align: right; font-size: 12px; color: ${secondaryColor};">
      <p style="margin: 4px 0;">{{company_address}}</p>
      <p style="margin: 4px 0;">CIF: {{company_cif}}</p>
    </div>
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <h1 style="margin: 0; color: ${primaryColor}; font-size: 28px;">${documentLabels[type].toUpperCase()}</h1>
  </div>
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: ${secondaryColor}; text-transform: uppercase;">Cliente</h3>
    <p style="margin: 4px 0; font-weight: bold;">{{client_name}}</p>
    <p style="margin: 4px 0; font-size: 13px;">{{client_address}}</p>
    <p style="margin: 4px 0; font-size: 13px;">CIF: {{client_cif}}</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
    <thead>
      <tr style="background: ${primaryColor}; color: white;">
        <th style="padding: 12px; text-align: left;">Descripción</th>
        <th style="padding: 12px; text-align: center; width: 60px;">Cant.</th>
        <th style="padding: 12px; text-align: right; width: 100px;">Precio</th>
        <th style="padding: 12px; text-align: right; width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>{{services_rows}}</tbody>
  </table>
  <div style="margin-left: auto; width: 250px;">
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: ${secondaryColor};">Subtotal:</span><span>{{subtotal}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: ${primaryColor};">
      <span>TOTAL:</span><span>{{total}}</span>
    </div>
  </div>
</div>`;
  return baseTemplate;
};

export function PdfSettingsManager() {
  const { data: companySettings } = useCompanySettings();
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>('invoice');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [editedName, setEditedName] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState('#3366cc');
  const [secondaryColor, setSecondaryColor] = useState('#666666');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  
  // Extended design settings
  const [titleText, setTitleText] = useState('FACTURA');
  const [titleSize, setTitleSize] = useState(28);
  const [clientBoxColor, setClientBoxColor] = useState('#f1f5f9');
  const [tableHeaderColor, setTableHeaderColor] = useState('#3b82f6');
  const [showFooterLegal, setShowFooterLegal] = useState(false);
  const [footerLegalText, setFooterLegalText] = useState('');
  
  // Spacing settings
  const [lineSpacing, setLineSpacing] = useState(14);
  const [sectionSpacing, setSectionSpacing] = useState(28);
  const [rowHeight, setRowHeight] = useState(22);
  const [clientBoxPadding, setClientBoxPadding] = useState(14);
  const [docMargins, setDocMargins] = useState(50);

  // Lines
  const [showTableBorders, setShowTableBorders] = useState(true);
  const [tableBorderColor, setTableBorderColor] = useState('#e5e7eb');
  const [showTotalsLines, setShowTotalsLines] = useState(true);
  const [totalsLineColor, setTotalsLineColor] = useState('#e5e7eb');

  // Section-based configuration
  const [sections, setSections] = useState<PdfSections>(getDefaultSections());

  const { data: templates = [], isLoading } = usePdfTemplates(selectedDocument);
  const createTemplate = useCreatePdfTemplate();
  const updateTemplate = useUpdatePdfTemplate();
  const deleteTemplate = useDeletePdfTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Load extended config when template is selected
  const loadExtendedConfig = useCallback((content: string) => {
    const templateData = { content, id: '', name: '', entity_type: selectedDocument, variables: null, is_default: false, is_active: true, created_at: '', updated_at: '' };
    const config = extractPdfConfigFromTemplate(templateData as any);
    
    if (config.primary_color) setPrimaryColor(config.primary_color);
    if (config.secondary_color) setSecondaryColor(config.secondary_color);
    if (config.title_text) setTitleText(config.title_text);
    if (config.title_size) setTitleSize(config.title_size);
    if (config.client_box_color) setClientBoxColor(config.client_box_color);
    if (config.table_header_color) setTableHeaderColor(config.table_header_color);
    setShowFooterLegal(config.show_footer_legal ?? false);
    if (config.footer_legal_lines) setFooterLegalText(config.footer_legal_lines.join('\n'));
    
    if (config.line_spacing) setLineSpacing(config.line_spacing);
    if (config.section_spacing) setSectionSpacing(config.section_spacing);
    if (config.row_height) setRowHeight(config.row_height);
    if (config.client_box_padding) setClientBoxPadding(config.client_box_padding);
    if (config.margins) setDocMargins(config.margins);

    setShowTableBorders(config.show_table_borders ?? true);
    if (config.table_border_color) setTableBorderColor(config.table_border_color);
    setShowTotalsLines(config.show_totals_lines ?? true);
    if (config.totals_line_color) setTotalsLineColor(config.totals_line_color);

    if (config.sections) {
      setSections({ ...getDefaultSections(), ...config.sections });
    } else {
      setSections(getDefaultSections());
    }
  }, [selectedDocument]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplateId(defaultTemplate.id);
      setEditedContent(defaultTemplate.content);
      setEditedName(defaultTemplate.name);
      loadExtendedConfig(defaultTemplate.content);
    }
  }, [templates, selectedTemplateId, loadExtendedConfig]);

  useEffect(() => {
    setSelectedTemplateId(null);
    setHasUnsavedChanges(false);
    const defaultTitles: Record<DocumentType, string> = {
      invoice: 'FACTURA',
      quote: 'PRESUPUESTO',
      contract: 'CONTRATO'
    };
    setTitleText(defaultTitles[selectedDocument]);
  }, [selectedDocument]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setEditedContent(template.content);
      setEditedName(template.name);
      loadExtendedConfig(template.content);
      setHasUnsavedChanges(false);
    }
  };

  const handleColorChange = (type: 'primary' | 'secondary', color: string) => {
    if (type === 'primary') {
      setPrimaryColor(color);
    } else {
      setSecondaryColor(color);
    }
    setHasUnsavedChanges(true);
  };

  const handleDesignChange = (field: string, value: string | number | boolean) => {
    const setters: Record<string, (v: any) => void> = {
      titleText: setTitleText,
      titleSize: setTitleSize,
      clientBoxColor: setClientBoxColor,
      tableHeaderColor: setTableHeaderColor,
      showFooterLegal: setShowFooterLegal,
      footerLegalText: setFooterLegalText,
      lineSpacing: setLineSpacing,
      sectionSpacing: setSectionSpacing,
      rowHeight: setRowHeight,
      docMargins: setDocMargins,
      showTableBorders: setShowTableBorders,
      tableBorderColor: setTableBorderColor,
      showTotalsLines: setShowTotalsLines,
      totalsLineColor: setTotalsLineColor,
    };
    setters[field]?.(value);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!selectedTemplateId) return;
    try {
      const pdfConfig: PdfConfig = {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: primaryColor,
        show_logo: true,
        logo_position: 'left',
        show_iban_footer: editedContent.includes('{{company_iban}}'),
        show_notes: editedContent.includes('{{notes}}'),
        show_discounts_column: editedContent.includes('{{discount'),
        header_style: 'classic',
        font_size_base: 10,
        title_text: titleText,
        title_size: titleSize,
        client_box_color: clientBoxColor,
        table_header_color: tableHeaderColor,
        show_footer_legal: showFooterLegal,
        footer_legal_lines: footerLegalText.split('\n').filter(line => line.trim()),
        line_spacing: lineSpacing,
        section_spacing: sectionSpacing,
        row_height: rowHeight,
        client_box_padding: clientBoxPadding,
        margins: docMargins,
        show_table_borders: showTableBorders,
        table_border_color: tableBorderColor,
        show_totals_lines: showTotalsLines,
        totals_line_color: totalsLineColor,
        sections: sections,
      };

      const contentWithConfig = embedPdfConfigInTemplate(editedContent, pdfConfig);

      await updateTemplate.mutateAsync({
        id: selectedTemplateId,
        updates: {
          name: editedName,
          content: contentWithConfig,
        },
      });
      
      setEditedContent(contentWithConfig);
      setHasUnsavedChanges(false);
      toast.success('Plantilla actualizada');
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Introduce un nombre para la plantilla');
      return;
    }
    try {
      const defaultContent = getDefaultTemplate(selectedDocument, primaryColor, secondaryColor);
      await createTemplate.mutateAsync({
        name: newTemplateName,
        entity_type: selectedDocument,
        content: defaultContent,
        is_default: templates.length === 0,
      });
      setNewTemplateName('');
      setShowNewDialog(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate) return;
    try {
      await createTemplate.mutateAsync({
        name: `${selectedTemplate.name} (copia)`,
        entity_type: selectedDocument,
        content: editedContent,
        is_default: false,
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;
    try {
      await deleteTemplate.mutateAsync(selectedTemplateId);
      setSelectedTemplateId(null);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSetDefault = async () => {
    if (!selectedTemplateId) return;
    try {
      await setDefaultTemplate.mutateAsync({
        id: selectedTemplateId,
        entityType: selectedDocument,
      });
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const allVariables = [...VARIABLES.common, ...(VARIABLES[selectedDocument] || [])];

  // Panel sections for sidebar
  const panelSections = [
    {
      id: 'document',
      title: 'Documento',
      icon: <FileText className="h-4 w-4" />,
      defaultOpen: true,
      content: (
        <PanelSectionContent>
          <PdfDocumentSelector 
            selected={selectedDocument} 
            onChange={setSelectedDocument} 
          />
        </PanelSectionContent>
      ),
    },
    {
      id: 'template',
      title: 'Plantilla',
      icon: <FileSignature className="h-4 w-4" />,
      defaultOpen: true,
      content: (
        <PanelSectionContent>
          <PdfTemplateSelector
            templates={templates}
            selectedId={selectedTemplateId}
            onSelect={handleTemplateSelect}
            onNew={() => setShowNewDialog(true)}
            onDuplicate={handleDuplicate}
            onSetDefault={handleSetDefault}
            onDelete={() => setShowDeleteDialog(true)}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        </PanelSectionContent>
      ),
    },
    {
      id: 'sections',
      title: 'Secciones',
      icon: <Layers className="h-4 w-4" />,
      content: (
        <PanelSectionContent>
          <PdfSectionEditor 
            sections={sections} 
            onChange={(newSections) => {
              setSections(newSections);
              setHasUnsavedChanges(true);
            }}
            documentType={selectedDocument}
          />
        </PanelSectionContent>
      ),
    },
    {
      id: 'colors',
      title: 'Colores',
      icon: <Palette className="h-4 w-4" />,
      content: (
        <PanelSectionContent>
          <PdfColorSettings
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            templateName={editedName}
            onPrimaryChange={(c) => handleColorChange('primary', c)}
            onSecondaryChange={(c) => handleColorChange('secondary', c)}
            onNameChange={(n) => { setEditedName(n); setHasUnsavedChanges(true); }}
          />
        </PanelSectionContent>
      ),
    },
    {
      id: 'design',
      title: 'Diseño',
      icon: <Settings2 className="h-4 w-4" />,
      content: (
        <PanelSectionContent>
          <PdfDesignSettings
            titleText={titleText}
            titleSize={titleSize}
            clientBoxColor={clientBoxColor}
            tableHeaderColor={tableHeaderColor}
            showFooterLegal={showFooterLegal}
            footerLegalText={footerLegalText}
            lineSpacing={lineSpacing}
            sectionSpacing={sectionSpacing}
            rowHeight={rowHeight}
            clientBoxPadding={clientBoxPadding}
            docMargins={docMargins}
            showTableBorders={showTableBorders}
            tableBorderColor={tableBorderColor}
            showTotalsLines={showTotalsLines}
            totalsLineColor={totalsLineColor}
            onChange={handleDesignChange}
          />
        </PanelSectionContent>
      ),
    },
    {
      id: 'variables',
      title: 'Variables',
      icon: <Code className="h-4 w-4" />,
      content: (
        <PanelSectionContent>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Copia y pega estas variables en el contenido HTML
            </p>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {allVariables.map((v) => (
                  <Button
                    key={v.key}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-xs font-mono"
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${v.key}}}`);
                      toast.success('Variable copiada');
                    }}
                  >
                    <v.icon className="h-3 w-3 mr-2 shrink-0" />
                    <span className="truncate">{`{{${v.key}}}`}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </PanelSectionContent>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] bg-background rounded-lg border overflow-hidden">
      {/* Collapsible Sidebar Panel */}
      <PdfSettingsPanel
        sections={panelSections}
        collapsed={panelCollapsed}
        onCollapsedChange={setPanelCollapsed}
        onSave={handleSave}
        isSaving={updateTemplate.isPending}
        hasChanges={hasUnsavedChanges}
      />

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-background">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Vista previa</span>
            <Badge variant="secondary" className="ml-2">{documentLabels[selectedDocument]}</Badge>
          </div>
          {selectedTemplate && (
            <Badge variant="outline" className="text-xs">
              {selectedTemplate.name}
            </Badge>
          )}
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          {selectedTemplate ? (
            <div className="flex justify-center">
              <Card className="w-full max-w-3xl">
                <CardContent className="p-6">
                  <PdfPreview
                    content={editedContent}
                    documentType={selectedDocument}
                    scale={0.6}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No hay plantilla seleccionada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona o crea una plantilla para comenzar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla</DialogTitle>
            <DialogDescription>
              Crea una nueva plantilla para {documentLabels[selectedDocument].toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nombre de la plantilla</Label>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Ej: Plantilla moderna"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
              {createTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La plantilla "{selectedTemplate?.name}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
