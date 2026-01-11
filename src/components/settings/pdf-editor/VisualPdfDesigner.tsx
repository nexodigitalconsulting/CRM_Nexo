import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, Save, Palette, Layout, Type, 
  FileSignature, Settings2, Scale, Wand2
} from 'lucide-react';

import { DraggableSectionList } from './DraggableSectionList';
import { SectionPropertyPanel } from './SectionPropertyPanel';
import { LivePdfViewer } from './LivePdfViewer';
import { BlockType, PdfBlock, getDefaultBlocks } from './types';
import { PdfConfig, PdfSections, getDefaultSections, LegalClause, DEFAULT_LEGAL_CLAUSES } from '@/lib/pdf/pdfUtils';
import { ContractClausesEditor } from '../ContractClausesEditor';

interface VisualPdfDesignerProps {
  documentType: 'invoice' | 'quote' | 'contract';
  initialConfig: PdfConfig;
  templateName: string;
  onConfigChange: (config: PdfConfig) => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

const documentLabels = {
  invoice: 'Factura',
  quote: 'Presupuesto',
  contract: 'Contrato',
};

export function VisualPdfDesigner({
  documentType,
  initialConfig,
  templateName,
  onConfigChange,
  onNameChange,
  onSave,
  isSaving,
  hasUnsavedChanges,
}: VisualPdfDesignerProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<BlockType | null>(null);
  const [blocks, setBlocks] = useState<PdfBlock[]>(() => getDefaultBlocks(documentType));
  const [sections, setSections] = useState<PdfSections>(() => initialConfig.sections || getDefaultSections());
  const [legalClauses, setLegalClauses] = useState<LegalClause[]>(() => initialConfig.legal_clauses || DEFAULT_LEGAL_CLAUSES);
  
  // Design state
  const [primaryColor, setPrimaryColor] = useState(initialConfig.primary_color || '#3366cc');
  const [secondaryColor, setSecondaryColor] = useState(initialConfig.secondary_color || '#666666');
  const [titleText, setTitleText] = useState(initialConfig.title_text || documentLabels[documentType].toUpperCase());
  const [titleSize, setTitleSize] = useState(initialConfig.title_size || 28);
  const [clientBoxColor, setClientBoxColor] = useState(initialConfig.client_box_color || '#f1f5f9');
  const [tableHeaderColor, setTableHeaderColor] = useState(initialConfig.table_header_color || '#3b82f6');
  const [showFooterLegal, setShowFooterLegal] = useState(initialConfig.show_footer_legal || false);
  const [footerLegalText, setFooterLegalText] = useState((initialConfig.footer_legal_lines || []).join('\n'));

  // Reset blocks when document type changes
  useEffect(() => {
    setBlocks(getDefaultBlocks(documentType));
    setSelectedBlockId(null);
  }, [documentType]);

  // Sync config when any value changes
  useEffect(() => {
    const newConfig: PdfConfig = {
      ...initialConfig,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: primaryColor,
      title_text: titleText,
      title_size: titleSize,
      client_box_color: clientBoxColor,
      table_header_color: tableHeaderColor,
      show_footer_legal: showFooterLegal,
      footer_legal_lines: footerLegalText.split('\n').filter(l => l.trim()),
      sections,
      legal_clauses: documentType === 'contract' ? legalClauses : undefined,
    };
    onConfigChange(newConfig);
  }, [
    primaryColor, secondaryColor, titleText, titleSize,
    clientBoxColor, tableHeaderColor, showFooterLegal, footerLegalText,
    sections, legalClauses, documentType
  ]);

  const handleBlocksChange = (newBlocks: PdfBlock[]) => {
    setBlocks(newBlocks);
    // Update section visibility based on blocks
    const newSections = { ...sections };
    newBlocks.forEach(block => {
      if (block.id in newSections) {
        (newSections as any)[block.id] = {
          ...(newSections as any)[block.id],
          visible: block.visible,
        };
      }
    });
    setSections(newSections);
  };

  const handleSectionsChange = (newSections: PdfSections) => {
    setSections(newSections);
    // Sync visibility back to blocks
    setBlocks(blocks.map(block => ({
      ...block,
      visible: (newSections as any)[block.id]?.visible ?? block.visible,
    })));
  };

  const currentConfig: PdfConfig = {
    ...initialConfig,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    title_text: titleText,
    title_size: titleSize,
    client_box_color: clientBoxColor,
    table_header_color: tableHeaderColor,
    sections,
    legal_clauses: legalClauses,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Editor Visual de PDF
          </h3>
          <p className="text-sm text-muted-foreground">
            Arrastra secciones, edita propiedades y visualiza en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              Cambios sin guardar
            </Badge>
          )}
          <Button 
            onClick={onSave} 
            disabled={isSaving || !hasUnsavedChanges} 
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Main Layout: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Section List */}
        <div className="lg:col-span-4 space-y-4">
          <DraggableSectionList
            blocks={blocks}
            onBlocksChange={handleBlocksChange}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            documentType={documentType}
          />

          {/* Property Panel */}
          <SectionPropertyPanel
            selectedBlockId={selectedBlockId}
            sections={sections}
            onSectionsChange={handleSectionsChange}
            onClose={() => setSelectedBlockId(null)}
          />
        </div>

        {/* Middle: Settings Tabs */}
        <div className="lg:col-span-4">
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className={`grid w-full ${documentType === 'contract' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="colors" className="gap-1">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Colores</span>
              </TabsTrigger>
              <TabsTrigger value="design" className="gap-1">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Diseño</span>
              </TabsTrigger>
              {documentType === 'contract' && (
                <TabsTrigger value="clauses" className="gap-1">
                  <Scale className="h-4 w-4" />
                  <span className="hidden sm:inline">Cláusulas</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Colors Tab */}
            <TabsContent value="colors" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label>Nombre de la plantilla</Label>
                    <Input
                      value={templateName}
                      onChange={(e) => onNameChange(e.target.value)}
                      placeholder="Nombre de la plantilla"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Color primario</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Color secundario</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fondo cliente</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={clientBoxColor}
                          onChange={(e) => setClientBoxColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={clientBoxColor}
                          onChange={(e) => setClientBoxColor(e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cabecera tabla</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={tableHeaderColor}
                          onChange={(e) => setTableHeaderColor(e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={tableHeaderColor}
                          onChange={(e) => setTableHeaderColor(e.target.value)}
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm font-medium mb-3">Vista previa de colores</p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded border" style={{ backgroundColor: primaryColor }} />
                        <span className="text-xs">Primario</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded border" style={{ backgroundColor: secondaryColor }} />
                        <span className="text-xs">Secundario</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded border" style={{ backgroundColor: tableHeaderColor }} />
                        <span className="text-xs">Tabla</span>
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
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Título del documento
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Texto</Label>
                        <Input
                          value={titleText}
                          onChange={(e) => setTitleText(e.target.value)}
                          placeholder="FACTURA"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tamaño: {titleSize}px</Label>
                        <Input
                          type="range"
                          min="20"
                          max="40"
                          value={titleSize}
                          onChange={(e) => setTitleSize(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <FileSignature className="h-4 w-4" />
                        Pie legal
                      </h4>
                      <Switch
                        checked={showFooterLegal}
                        onCheckedChange={setShowFooterLegal}
                      />
                    </div>
                    {showFooterLegal && (
                      <Textarea
                        value={footerLegalText}
                        onChange={(e) => setFooterLegalText(e.target.value)}
                        placeholder="Texto legal..."
                        rows={3}
                        className="text-sm"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Clauses Tab - Contract only */}
            {documentType === 'contract' && (
              <TabsContent value="clauses" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <ContractClausesEditor
                      clauses={legalClauses}
                      onChange={setLegalClauses}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-4">
          <LivePdfViewer
            documentType={documentType}
            config={currentConfig}
            selectedSection={selectedBlockId}
            onSectionClick={setSelectedBlockId}
            scale={0.45}
          />
        </div>
      </div>
    </div>
  );
}
