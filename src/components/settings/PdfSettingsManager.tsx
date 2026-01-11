import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  Loader2, FileText, Palette, Eye, Save, Layout, Type, 
  Plus, Trash2, Copy, Star,
  FileSignature, Settings2, Layers, Scale, Wand2, Settings
} from "lucide-react";
import { toast } from "sonner";
import { PdfPreview } from "./PdfPreview";
import { PdfSectionEditor } from "./PdfSectionEditor";
import { ContractClausesEditor } from "./ContractClausesEditor";
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
  const [editorMode, setEditorMode] = useState<'visual' | 'classic'>('visual');
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

  // Keep configDraft aligned with Classic field states.
  // (Visual editor writes configDraft directly to avoid saving stale state.)
  useEffect(() => {
    setConfigDraft(currentConfig);
  }, [currentConfig]);

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
        <div className="flex items-center gap-4">
          {/* Editor Mode Toggle */}
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant={editorMode === 'visual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEditorMode('visual')}
              className="gap-1"
            >
              <Wand2 className="h-4 w-4" />
              Visual
            </Button>
            <Button
              variant={editorMode === 'classic' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEditorMode('classic')}
              className="gap-1"
            >
              <Settings className="h-4 w-4" />
              Clásico
            </Button>
          </div>
          {editorMode === 'classic' && (
            <>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  Cambios sin guardar
                </Badge>
              )}
              <Button 
                onClick={handleSave} 
                disabled={updateTemplate.isPending || !hasUnsavedChanges} 
                className="gap-2"
              >
                {updateTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </Button>
            </>
          )}
        </div>
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

      {/* Visual Editor Mode */}
      {selectedTemplate && editorMode === 'visual' && (
        <VisualPdfDesigner
          documentType={selectedDocument}
          initialConfig={configDraft ?? currentConfig}
          templateName={editedName}
          onConfigChange={(config) => {
            // Normalize to what the real pdf-lib generator uses (sections.*)
            const normalized = normalizeConfigForPdf(config);

            // IMPORTANT: store the full normalized config immediately so Save never persists stale state
            setConfigDraft(normalized);

            // Sync all fields to keep Classic UI consistent too
            if (normalized.primary_color !== undefined) setPrimaryColor(normalized.primary_color);
            if (normalized.secondary_color !== undefined) setSecondaryColor(normalized.secondary_color);
            if (normalized.title_text !== undefined) setTitleText(normalized.title_text);
            if (normalized.title_size !== undefined) setTitleSize(normalized.title_size);
            if (normalized.client_box_color !== undefined) setClientBoxColor(normalized.client_box_color);
            if (normalized.table_header_color !== undefined) setTableHeaderColor(normalized.table_header_color);
            if (normalized.sections !== undefined) setSections(normalized.sections);
            if (normalized.section_order !== undefined) setSectionOrder(normalized.section_order);
            if (normalized.legal_clauses !== undefined) setLegalClauses(normalized.legal_clauses);
            if (normalized.show_footer_legal !== undefined) setShowFooterLegal(normalized.show_footer_legal);
            if (normalized.footer_legal_lines !== undefined)
              setFooterLegalText(normalized.footer_legal_lines.join('\n'));
            if (normalized.line_spacing !== undefined) setLineSpacing(normalized.line_spacing);
            if (normalized.section_spacing !== undefined) setSectionSpacing(normalized.section_spacing);
            if (normalized.row_height !== undefined) setRowHeight(normalized.row_height);
            if (normalized.client_box_padding !== undefined) setClientBoxPadding(normalized.client_box_padding);
            if (normalized.margins !== undefined) setDocMargins(normalized.margins);
            if (normalized.show_table_borders !== undefined) setShowTableBorders(normalized.show_table_borders);
            if (normalized.table_border_color !== undefined) setTableBorderColor(normalized.table_border_color);
            if (normalized.show_totals_lines !== undefined) setShowTotalsLines(normalized.show_totals_lines);
            if (normalized.totals_line_color !== undefined) setTotalsLineColor(normalized.totals_line_color);

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

      {/* Classic Editor + Preview */}
      {selectedTemplate && editorMode === 'classic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Panel */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="sections" className="w-full">
              <TabsList className={`grid w-full ${selectedDocument === 'contract' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="sections" className="gap-1">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Secciones</span>
                </TabsTrigger>
                {selectedDocument === 'contract' && (
                  <TabsTrigger value="clauses" className="gap-1">
                    <Scale className="h-4 w-4" />
                    <span className="hidden sm:inline">Cláusulas</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="colors" className="gap-1">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Colores</span>
                </TabsTrigger>
                <TabsTrigger value="design" className="gap-1">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Diseño</span>
                </TabsTrigger>
              </TabsList>

              {/* Sections Tab */}
              <TabsContent value="sections" className="mt-4">
                <PdfSectionEditor 
                  sections={sections} 
                  onChange={(newSections) => {
                    setSections(newSections);
                    setHasUnsavedChanges(true);
                  }}
                  documentType={selectedDocument}
                />
              </TabsContent>

              {/* Clauses Tab - Contracts only */}
              {selectedDocument === 'contract' && (
                <TabsContent value="clauses" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <ContractClausesEditor 
                        clauses={legalClauses}
                        onChange={(newClauses) => {
                          setLegalClauses(newClauses);
                          setHasUnsavedChanges(true);
                        }}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Colors Tab */}
              <TabsContent value="colors" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label>Nombre de la plantilla</Label>
                      <Input
                        value={editedName}
                        onChange={(e) => {
                          setEditedName(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Nombre de la plantilla"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Color primario</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => handleColorChange('primary', e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={primaryColor}
                            onChange={(e) => handleColorChange('primary', e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Títulos, cabeceras y totales</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Color secundario</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => handleColorChange('secondary', e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={secondaryColor}
                            onChange={(e) => handleColorChange('secondary', e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Texto secundario y etiquetas</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm font-medium mb-3">Vista previa de colores</p>
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: primaryColor }} />
                          <span className="text-sm" style={{ color: primaryColor }}>Título Principal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: secondaryColor }} />
                          <span className="text-sm" style={{ color: secondaryColor }}>Texto secundario</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Design Tab */}
              <TabsContent value="design" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Title */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Título del documento
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Texto del título</Label>
                          <Input
                            value={titleText}
                            onChange={(e) => {
                              setTitleText(e.target.value);
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="FACTURA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tamaño (px): {titleSize}</Label>
                          <Input
                            type="range"
                            min="20"
                            max="40"
                            value={titleSize}
                            onChange={(e) => {
                              setTitleSize(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Element Colors */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Colores de elementos
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fondo caja cliente</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={clientBoxColor}
                              onChange={(e) => {
                                setClientBoxColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={clientBoxColor}
                              onChange={(e) => {
                                setClientBoxColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Cabecera de tabla</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={tableHeaderColor}
                              onChange={(e) => {
                                setTableHeaderColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={tableHeaderColor}
                              onChange={(e) => {
                                setTableHeaderColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Legal */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <FileSignature className="h-4 w-4" />
                          Pie legal
                        </h4>
                        <Switch
                          checked={showFooterLegal}
                          onCheckedChange={(checked) => {
                            setShowFooterLegal(checked);
                            setHasUnsavedChanges(true);
                          }}
                        />
                      </div>
                      {showFooterLegal && (
                        <div className="space-y-2">
                          <Label>Texto legal (una línea por fila)</Label>
                          <Textarea
                            value={footerLegalText}
                            onChange={(e) => {
                              setFooterLegalText(e.target.value);
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Esta factura ha sido emitida conforme a la legislación vigente."
                            rows={3}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Spacing */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        Espaciado
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Espaciado entre líneas: {lineSpacing}px</Label>
                          <Input
                            type="range"
                            min="10"
                            max="22"
                            value={lineSpacing}
                            onChange={(e) => {
                              setLineSpacing(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Espacio entre secciones: {sectionSpacing}px</Label>
                          <Input
                            type="range"
                            min="16"
                            max="50"
                            value={sectionSpacing}
                            onChange={(e) => {
                              setSectionSpacing(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Altura de filas tabla: {rowHeight}px</Label>
                          <Input
                            type="range"
                            min="18"
                            max="36"
                            value={rowHeight}
                            onChange={(e) => {
                              setRowHeight(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Padding caja cliente: {clientBoxPadding}px</Label>
                          <Input
                            type="range"
                            min="8"
                            max="28"
                            value={clientBoxPadding}
                            onChange={(e) => {
                              setClientBoxPadding(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Márgenes del documento: {docMargins}px</Label>
                          <Input
                            type="range"
                            min="30"
                            max="80"
                            value={docMargins}
                            onChange={(e) => {
                              setDocMargins(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                      
                      {/* Table Borders */}
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Mostrar líneas divisorias en tabla</Label>
                          <Switch
                            checked={showTableBorders}
                            onCheckedChange={(checked) => {
                              setShowTableBorders(checked);
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </div>
                        {showTableBorders && (
                          <div className="flex items-center gap-3">
                            <Label className="w-32">Color de líneas:</Label>
                            <Input
                              type="color"
                              value={tableBorderColor}
                              onChange={(e) => {
                                setTableBorderColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-12 h-8 p-0"
                            />
                            <span className="text-xs text-muted-foreground">{tableBorderColor}</span>
                          </div>
                        )}
                      </div>

                      {/* Totals Lines */}
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Mostrar líneas separadoras en Totales</Label>
                          <Switch
                            checked={showTotalsLines}
                            onCheckedChange={(checked) => {
                              setShowTotalsLines(checked);
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </div>
                        {showTotalsLines && (
                          <div className="flex items-center gap-3">
                            <Label className="w-32">Color de líneas:</Label>
                            <Input
                              type="color"
                              value={totalsLineColor}
                              onChange={(e) => {
                                setTotalsLineColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-12 h-8 p-0"
                            />
                            <span className="text-xs text-muted-foreground">{totalsLineColor}</span>
                          </div>
                        )}
                      </div>
                    </div>
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
                <PdfPreview
                  documentType={selectedDocument}
                  config={configDraft ?? currentConfig}
                  scale={0.45}
                />
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Vista previa del PDF generado
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
