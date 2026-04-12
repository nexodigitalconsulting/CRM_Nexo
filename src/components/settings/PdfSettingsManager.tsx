"use client";

import { useState, useEffect, useCallback } from "react";
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
  Loader2, FileText, Layout,
  Plus, Trash2, Copy, Star,
  FileSignature, Wand2
} from "lucide-react";
import { toast } from "sonner";
import { VisualPdfDesigner } from "./pdf-editor";
import { embedPdfConfigInTemplate, extractPdfConfigFromTemplate } from "@/hooks/useDefaultTemplate";
import { PdfConfig, PdfSections, getDefaultSections, LegalClause, DEFAULT_LEGAL_CLAUSES, BlockType, DEFAULT_SECTION_ORDER, DEFAULT_CONTRACT_SECTION_ORDER } from "@/lib/pdf/pdfUtils";

type DocumentType = 'invoice' | 'quote' | 'contract';

const documentLabels: Record<DocumentType, string> = {
  invoice: 'Factura',
  quote: 'Presupuesto',
  contract: 'Contrato',
};

const defaultTitles: Record<DocumentType, string> = {
  invoice: 'FACTURA',
  quote: 'PRESUPUESTO',
  contract: 'CONTRATO',
};

export function PdfSettingsManager() {
  const { data: companySettings } = useCompanySettings();
  // Visual-only mode - Classic editor removed
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>('invoice');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState('#3366cc');
  const [secondaryColor, setSecondaryColor] = useState('#666666');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Single source of truth for saving + cross-mode consistency.
  // Classic UI still edits the per-field states below, but we always keep configDraft in sync.
  const [configDraft, setConfigDraft] = useState<PdfConfig>({
    primary_color: '#3366cc',
    secondary_color: '#666666',
    title_text: defaultTitles.invoice,
    sections: getDefaultSections(),
    section_order: DEFAULT_SECTION_ORDER,
  });

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

  // Legal clauses for contracts
  const [legalClauses, setLegalClauses] = useState<LegalClause[]>(DEFAULT_LEGAL_CLAUSES);

  // Section order for visual editor
  const [sectionOrder, setSectionOrder] = useState<BlockType[]>(DEFAULT_SECTION_ORDER);

  const { data: templates = [], isLoading } = usePdfTemplates(selectedDocument);
  const createTemplate = useCreatePdfTemplate();
  const updateTemplate = useUpdatePdfTemplate();
  const deleteTemplate = useDeletePdfTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Normalize config so the PDF generator (which relies heavily on sections.*)
  // always receives the same values edited in the UI (Visual + Classic).
  const normalizeConfigForPdf = useCallback(
    (cfg: PdfConfig): PdfConfig => {
      const defaultSections = getDefaultSections();
      const mergedSections: PdfSections = cfg.sections
        ? {
            ...defaultSections,
            ...cfg.sections,
            header: { ...defaultSections.header, ...cfg.sections.header },
            title: { ...defaultSections.title, ...cfg.sections.title },
            dates: { ...defaultSections.dates, ...cfg.sections.dates },
            client: { ...defaultSections.client, ...cfg.sections.client },
            table: { ...defaultSections.table, ...cfg.sections.table },
            totals: { ...defaultSections.totals, ...cfg.sections.totals },
            footer: { ...defaultSections.footer, ...cfg.sections.footer },
            legal: { ...defaultSections.legal, ...cfg.sections.legal },
            signatures: { ...defaultSections.signatures, ...cfg.sections.signatures },
          }
        : defaultSections;

      // Bridge legacy/top-level fields into sections, because Fact2 generator reads sections.*
      if (cfg.client_box_color) mergedSections.client.background_color = cfg.client_box_color;
      if (typeof cfg.client_box_padding === 'number') mergedSections.client.padding = cfg.client_box_padding;
      if (typeof cfg.row_height === 'number') mergedSections.table.row_height = cfg.row_height;
      if (typeof cfg.show_table_borders === 'boolean') mergedSections.table.show_borders = cfg.show_table_borders;
      if (cfg.table_border_color) mergedSections.table.border_color = cfg.table_border_color;
      if (typeof cfg.show_totals_lines === 'boolean') mergedSections.totals.show_lines = cfg.show_totals_lines;
      if (cfg.totals_line_color) mergedSections.totals.line_color = cfg.totals_line_color;

      return {
        ...cfg,
        sections: mergedSections,
      };
    },
    [],
  );

  // Build the current PdfConfig from Classic UI state
  const currentConfigBase: PdfConfig = {
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    accent_color: primaryColor,
    show_logo: true,
    logo_position: 'left',
    show_iban_footer: true,
    show_notes: true,
    show_discounts_column: false,
    header_style: 'classic',
    font_size_base: 10,
    title_text: titleText,
    title_size: titleSize,
    client_box_color: clientBoxColor,
    table_header_color: tableHeaderColor,
    show_footer_legal: showFooterLegal,
    footer_legal_lines: footerLegalText.split('\n').filter((line) => line.trim()),
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
    section_order: sectionOrder,
    legal_clauses: selectedDocument === 'contract' ? legalClauses : undefined,
  };

  const currentConfig = normalizeConfigForPdf(currentConfigBase);

  // REMOVED: The useEffect that synchronized configDraft from currentConfig
  // was causing state overwrites when using Visual editor.
  // Now configDraft is ONLY updated by:
  // 1. loadExtendedConfig (when loading a template)
  // 2. VisualPdfDesigner's onConfigChange

  // Load config from template content
  const loadExtendedConfig = useCallback((content: string) => {
    const templateData = {
      content,
      id: '',
      name: '',
      entity_type: selectedDocument,
      variables: null,
      is_default: false,
      is_active: true,
      created_at: '',
      updated_at: '',
    };

    const parsed = extractPdfConfigFromTemplate(templateData as any);

    // Normalize/merge with defaults so both editors see the same complete config.
    const defaultSections = getDefaultSections();
    const normalized: PdfConfig = {
      primary_color: parsed.primary_color ?? '#3366cc',
      secondary_color: parsed.secondary_color ?? '#666666',
      accent_color: parsed.accent_color ?? (parsed.primary_color ?? '#3366cc'),
      show_logo: parsed.show_logo ?? true,
      logo_position: parsed.logo_position ?? 'left',
      show_iban_footer: parsed.show_iban_footer ?? true,
      show_notes: parsed.show_notes ?? true,
      show_discounts_column: parsed.show_discounts_column ?? false,
      header_style: parsed.header_style ?? 'classic',
      font_size_base: parsed.font_size_base ?? 10,
      title_text: parsed.title_text ?? defaultTitles[selectedDocument],
      title_size: parsed.title_size ?? 28,
      client_box_color: parsed.client_box_color ?? '#f1f5f9',
      table_header_color: parsed.table_header_color ?? '#3b82f6',
      show_footer_legal: parsed.show_footer_legal ?? false,
      footer_legal_lines: parsed.footer_legal_lines ?? [],
      line_spacing: parsed.line_spacing ?? 14,
      section_spacing: parsed.section_spacing ?? 28,
      row_height: parsed.row_height ?? 22,
      client_box_padding: parsed.client_box_padding ?? 14,
      margins: parsed.margins ?? 50,
      show_table_borders: parsed.show_table_borders ?? true,
      table_border_color: parsed.table_border_color ?? '#e5e7eb',
      show_totals_lines: parsed.show_totals_lines ?? true,
      totals_line_color: parsed.totals_line_color ?? '#e5e7eb',
      sections: parsed.sections ? { ...defaultSections, ...parsed.sections } : defaultSections,
      section_order:
        parsed.section_order && parsed.section_order.length > 0
          ? parsed.section_order
          : selectedDocument === 'contract'
            ? DEFAULT_CONTRACT_SECTION_ORDER
            : DEFAULT_SECTION_ORDER,
      legal_clauses: parsed.legal_clauses ?? DEFAULT_LEGAL_CLAUSES,
    };

    // Update both the per-field state (Classic UI) and the draft (used for Visual/save).
    setConfigDraft(normalized);

    setPrimaryColor(normalized.primary_color ?? '#3366cc');
    setSecondaryColor(normalized.secondary_color ?? '#666666');
    setTitleText(normalized.title_text ?? defaultTitles[selectedDocument]);
    setTitleSize(normalized.title_size ?? 28);
    setClientBoxColor(normalized.client_box_color ?? '#f1f5f9');
    setTableHeaderColor(normalized.table_header_color ?? '#3b82f6');
    setShowFooterLegal(normalized.show_footer_legal ?? false);
    setFooterLegalText((normalized.footer_legal_lines ?? []).join('\n'));

    setLineSpacing(normalized.line_spacing ?? 14);
    setSectionSpacing(normalized.section_spacing ?? 28);
    setRowHeight(normalized.row_height ?? 22);
    setClientBoxPadding(normalized.client_box_padding ?? 14);
    setDocMargins(normalized.margins ?? 50);

    setShowTableBorders(normalized.show_table_borders ?? true);
    setTableBorderColor(normalized.table_border_color ?? '#e5e7eb');

    setShowTotalsLines(normalized.show_totals_lines ?? true);
    setTotalsLineColor(normalized.totals_line_color ?? '#e5e7eb');

    setSections((normalized.sections ?? defaultSections) as PdfSections);

    setSectionOrder(
      (normalized.section_order ??
        (selectedDocument === 'contract' ? DEFAULT_CONTRACT_SECTION_ORDER : DEFAULT_SECTION_ORDER)) as BlockType[],
    );

    setLegalClauses(normalized.legal_clauses ?? DEFAULT_LEGAL_CLAUSES);
  }, [selectedDocument]);

  // Select default template on load
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplateId(defaultTemplate.id);
      setEditedName(defaultTemplate.name);
      loadExtendedConfig(defaultTemplate.content);
    }
  }, [templates, selectedTemplateId, loadExtendedConfig]);

  // Reset when document type changes
  useEffect(() => {
    setSelectedTemplateId(null);
    setHasUnsavedChanges(false);
    setTitleText(defaultTitles[selectedDocument]);
    // Reset section order for document type
    setSectionOrder(selectedDocument === 'contract' ? DEFAULT_CONTRACT_SECTION_ORDER : DEFAULT_SECTION_ORDER);
  }, [selectedDocument]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
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

  const handleSave = async () => {
    if (!selectedTemplateId) return;
    try {
      // Save EXACTLY what the Visual editor produced (configDraft), normalized to what
      // the pdf-lib generator actually consumes.
      const rawToSave = configDraft ?? currentConfig;
      const configToSave = normalizeConfigForPdf(rawToSave);
      const contentWithConfig = embedPdfConfigInTemplate('', configToSave);

      await updateTemplate.mutateAsync({
        id: selectedTemplateId,
        updates: {
          name: editedName,
          content: contentWithConfig,
        },
      });

      setHasUnsavedChanges(false);
      console.log('[PdfSettingsManager] Saved template with PDF_CONFIG:', configToSave);
      toast.success('Plantilla guardada correctamente');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar la plantilla');
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Introduce un nombre para la plantilla');
      return;
    }
    try {
      const defaultConfig: PdfConfig = {
        primary_color: '#3366cc',
        secondary_color: '#666666',
        title_text: defaultTitles[selectedDocument],
        sections: getDefaultSections(),
      };
      const defaultContent = embedPdfConfigInTemplate('', defaultConfig);
      
      await createTemplate.mutateAsync({
        name: newTemplateName,
        entity_type: selectedDocument,
        content: defaultContent,
        is_default: templates.length === 0,
        is_active: true,
        created_by: null,
        variables: null,
      });
      setNewTemplateName('');
      setShowNewDialog(false);
      toast.success('Plantilla creada');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Error al crear la plantilla');
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate) return;
    try {
      const contentWithConfig = embedPdfConfigInTemplate('', currentConfig);
      await createTemplate.mutateAsync({
        name: `${selectedTemplate.name} (copia)`,
        entity_type: selectedDocument,
        content: contentWithConfig,
        is_default: false,
        is_active: true,
        created_by: null,
        variables: null,
      });
      toast.success('Plantilla duplicada');
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
      toast.success('Plantilla eliminada');
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
      toast.success('Plantilla establecida como predeterminada');
    } catch (error) {
      console.error('Error setting default:', error);
    }
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
            Editor de Plantillas PDF
          </h3>
          <p className="text-sm text-muted-foreground">
            Personaliza las plantillas para facturas, presupuestos y contratos
          </p>
        </div>
        {/* Visual editor badge - removed Classic mode toggle */}
        <Badge variant="secondary" className="gap-1">
          <Wand2 className="h-4 w-4" />
          Editor Visual
        </Badge>
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
        </CardContent>
      </Card>

      {/* Template Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Plantilla
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedTemplateId || ''} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecciona una plantilla" />
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

            <Button variant="outline" size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nueva
            </Button>
            
            {selectedTemplate && (
              <>
                <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-1" /> Duplicar
                </Button>
                
                {!selectedTemplate.is_default && (
                  <Button variant="outline" size="sm" onClick={handleSetDefault}>
                    <Star className="h-4 w-4 mr-1" /> Predeterminada
                  </Button>
                )}
                
                {templates.length > 1 && (
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                  </Button>
                )}
              </>
            )}

            {selectedTemplate?.is_default && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-current" /> Predeterminada
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visual Editor - Now the only mode */}
      {selectedTemplate && (
        <VisualPdfDesigner
          documentType={selectedDocument}
          initialConfig={configDraft}
          templateName={editedName}
          onConfigChange={(config) => {
            // Normalize to what the real pdf-lib generator uses (sections.*)
            const normalized = normalizeConfigForPdf(config);

            // IMPORTANT: store the full normalized config immediately so Save never persists stale state
            setConfigDraft(normalized);
            setHasUnsavedChanges(true);
          }}
          onNameChange={(name) => {
            setEditedName(name);
            setHasUnsavedChanges(true);
          }}
          onSave={handleSave}
          isSaving={updateTemplate.isPending}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      )}

      {/* Classic Editor removed - Visual-only mode */}

      {/* Empty state */}
      {!selectedTemplate && templates.length === 0 && (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No hay plantillas</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crea tu primera plantilla para {documentLabels[selectedDocument].toLowerCase()}
          </p>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Crear plantilla
          </Button>
        </Card>
      )}

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
