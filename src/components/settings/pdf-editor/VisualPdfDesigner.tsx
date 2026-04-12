"use client";

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
import { BlockType, PdfBlock, getDefaultBlocks, getOrderFromBlocks, getBlocksFromOrder } from './types';
import { PdfConfig, PdfSections, getDefaultSections, LegalClause, DEFAULT_LEGAL_CLAUSES, DEFAULT_SECTION_ORDER, DEFAULT_CONTRACT_SECTION_ORDER } from '@/lib/pdf/pdfUtils';
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
  
  // Derive all values directly from initialConfig - single source of truth
  const sections = initialConfig.sections || getDefaultSections();
  const legalClauses = initialConfig.legal_clauses || DEFAULT_LEGAL_CLAUSES;
  const primaryColor = initialConfig.primary_color || '#3366cc';
  const secondaryColor = initialConfig.secondary_color || '#666666';
  const titleText = initialConfig.title_text || documentLabels[documentType].toUpperCase();
  const titleSize = initialConfig.title_size || 28;
  const clientBoxColor = initialConfig.client_box_color || '#f1f5f9';
  const tableHeaderColor = initialConfig.table_header_color || '#3b82f6';
  const showFooterLegal = initialConfig.show_footer_legal || false;
  const footerLegalText = (initialConfig.footer_legal_lines || []).join('\n');
  
  // Derive blocks from section_order
  const blocks = (initialConfig.section_order && initialConfig.section_order.length > 0)
    ? getBlocksFromOrder(initialConfig.section_order, documentType)
    : getDefaultBlocks(documentType);

  // Reset selection when document type changes
  useEffect(() => {
    setSelectedBlockId(null);
  }, [documentType]);

  // Helper to update config - all changes go through parent
  const updateConfig = useCallback((updates: Partial<PdfConfig>) => {
    onConfigChange({
      ...initialConfig,
      ...updates,
    });
  }, [initialConfig, onConfigChange]);

  const handleBlocksChange = (newBlocks: PdfBlock[]) => {
    const newSectionOrder = getOrderFromBlocks(newBlocks);
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
    updateConfig({ 
      section_order: newSectionOrder,
      sections: newSections,
    });
  };

  const handleSectionsChange = (newSections: PdfSections) => {
    // Sync visibility back to section_order by rebuilding blocks
    const updatedBlocks = blocks.map(block => ({
      ...block,
      visible: (newSections as any)[block.id]?.visible ?? block.visible,
    }));
    updateConfig({
      sections: newSections,
      section_order: getOrderFromBlocks(updatedBlocks),
    });
  };

  // Current config for preview (derived from initialConfig)
  const currentConfig: PdfConfig = {
    ...initialConfig,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    title_text: titleText,
    title_size: titleSize,
    client_box_color: clientBoxColor,
    table_header_color: tableHeaderColor,
    section_order: getOrderFromBlocks(blocks),
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
                          onChange={(e) => updateConfig({ primary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => updateConfig({ primary_color: e.target.value })}
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
                          onChange={(e) => updateConfig({ secondary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={secondaryColor}
                          onChange={(e) => updateConfig({ secondary_color: e.target.value })}
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
                          onChange={(e) => updateConfig({ client_box_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={clientBoxColor}
                          onChange={(e) => updateConfig({ client_box_color: e.target.value })}
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
                          onChange={(e) => updateConfig({ table_header_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={tableHeaderColor}
                          onChange={(e) => updateConfig({ table_header_color: e.target.value })}
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
                          onChange={(e) => updateConfig({ title_text: e.target.value })}
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
                          onChange={(e) => updateConfig({ title_size: Number(e.target.value) })}
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
                        onCheckedChange={(checked) => updateConfig({ show_footer_legal: checked })}
                      />
                    </div>
                    {showFooterLegal && (
                      <Textarea
                        value={footerLegalText}
                        onChange={(e) => updateConfig({ 
                          footer_legal_lines: e.target.value.split('\n').filter(l => l.trim()) 
                        })}
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
                      onChange={(newClauses) => updateConfig({ legal_clauses: newClauses })}
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
            blocks={blocks}
          />
        </div>
      </div>
    </div>
  );
}
