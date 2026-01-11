import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlockType, getSectionProperties } from './types';
import { PdfSections } from '@/lib/pdf/pdfUtils';

interface SectionPropertyPanelProps {
  selectedBlockId: BlockType | null;
  sections: PdfSections;
  onSectionsChange: (sections: PdfSections) => void;
  onClose: () => void;
}

const blockLabels: Record<BlockType, string> = {
  header: 'Cabecera',
  title: 'Título',
  dates: 'Fechas',
  client: 'Datos del Cliente',
  table: 'Tabla de Servicios',
  totals: 'Totales',
  notes: 'Notas',
  footer: 'Pie de Página',
  legal: 'Cláusulas Legales',
  signatures: 'Firmas',
};

export function SectionPropertyPanel({
  selectedBlockId,
  sections,
  onSectionsChange,
  onClose,
}: SectionPropertyPanelProps) {
  if (!selectedBlockId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Settings2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Selecciona una sección para editarla</p>
        </CardContent>
      </Card>
    );
  }

  const properties = getSectionProperties(selectedBlockId);
  
  // Get the section data based on block type
  const getSectionData = (): Record<string, any> => {
    switch (selectedBlockId) {
      case 'header': return sections.header;
      case 'title': return sections.title;
      case 'dates': return sections.dates;
      case 'client': return sections.client;
      case 'table': return sections.table;
      case 'totals': return sections.totals;
      case 'footer': return sections.footer;
      case 'legal': return sections.legal || {};
      case 'signatures': return sections.signatures || {};
      default: return {};
    }
  };

  const sectionData = getSectionData();

  const updateSection = (key: string, value: any) => {
    const updates: Partial<PdfSections> = {};
    
    switch (selectedBlockId) {
      case 'header':
        updates.header = { ...sections.header, [key]: value };
        break;
      case 'title':
        updates.title = { ...sections.title, [key]: value };
        break;
      case 'dates':
        updates.dates = { ...sections.dates, [key]: value };
        break;
      case 'client':
        updates.client = { ...sections.client, [key]: value };
        break;
      case 'table':
        updates.table = { ...sections.table, [key]: value };
        break;
      case 'totals':
        updates.totals = { ...sections.totals, [key]: value };
        break;
      case 'footer':
        updates.footer = { ...sections.footer, [key]: value };
        break;
      case 'legal':
        updates.legal = { ...sections.legal!, [key]: value };
        break;
      case 'signatures':
        updates.signatures = { ...sections.signatures!, [key]: value };
        break;
    }

    onSectionsChange({ ...sections, ...updates });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Propiedades
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Badge variant="secondary" className="w-fit">
          {blockLabels[selectedBlockId]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta sección no tiene propiedades editables
          </p>
        ) : (
          properties.map((prop) => {
            const value = sectionData[prop.key];
            
            if (prop.type === 'slider') {
              return (
                <div key={prop.key} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>{prop.label}</Label>
                    <span className="text-muted-foreground font-mono">
                      {value ?? prop.min}{prop.unit}
                    </span>
                  </div>
                  <Slider
                    value={[value ?? prop.min ?? 0]}
                    min={prop.min}
                    max={prop.max}
                    step={prop.step ?? 1}
                    onValueChange={([v]) => updateSection(prop.key, v)}
                    className="w-full"
                  />
                </div>
              );
            }

            if (prop.type === 'color') {
              return (
                <div key={prop.key} className="space-y-2">
                  <Label>{prop.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={value || '#f8f9fa'}
                      onChange={(e) => updateSection(prop.key, e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={value || '#f8f9fa'}
                      onChange={(e) => updateSection(prop.key, e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>
              );
            }

            if (prop.type === 'switch') {
              return (
                <div key={prop.key} className="flex items-center justify-between">
                  <Label>{prop.label}</Label>
                  <Switch
                    checked={value ?? true}
                    onCheckedChange={(v) => updateSection(prop.key, v)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              );
            }

            return null;
          })
        )}
      </CardContent>
    </Card>
  );
}
