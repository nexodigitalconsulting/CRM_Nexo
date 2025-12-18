import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Rect, Circle, IText, Line, FabricImage } from 'fabric';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Type, Square, Circle as CircleIcon, Image as ImageIcon, 
  Minus, Trash2, Copy, MoveUp, MoveDown, Save, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Grid3X3, Layers, Palette, FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface PdfEditorCanvasProps {
  documentType: 'invoice' | 'contract' | 'quote';
  initialTemplate?: object;
  onSave?: (template: object) => void;
}

const TEMPLATE_BLOCKS = {
  invoice: [
    { id: 'header', label: 'Cabecera', icon: FileText },
    { id: 'company_info', label: 'Datos Empresa', icon: Grid3X3 },
    { id: 'client_info', label: 'Datos Cliente', icon: Grid3X3 },
    { id: 'invoice_meta', label: 'Nº Factura / Fecha', icon: FileText },
    { id: 'items_table', label: 'Tabla de Conceptos', icon: Grid3X3 },
    { id: 'totals', label: 'Totales', icon: Grid3X3 },
    { id: 'footer', label: 'Pie de página', icon: FileText },
  ],
  contract: [
    { id: 'header', label: 'Cabecera', icon: FileText },
    { id: 'parties', label: 'Partes Contratantes', icon: Grid3X3 },
    { id: 'services', label: 'Servicios', icon: Grid3X3 },
    { id: 'terms', label: 'Condiciones', icon: FileText },
    { id: 'signatures', label: 'Firmas', icon: Grid3X3 },
    { id: 'footer', label: 'Pie de página', icon: FileText },
  ],
  quote: [
    { id: 'header', label: 'Cabecera', icon: FileText },
    { id: 'company_info', label: 'Datos Empresa', icon: Grid3X3 },
    { id: 'client_info', label: 'Datos Cliente/Contacto', icon: Grid3X3 },
    { id: 'quote_meta', label: 'Nº Presupuesto / Fecha', icon: FileText },
    { id: 'items_table', label: 'Tabla de Servicios', icon: Grid3X3 },
    { id: 'totals', label: 'Totales', icon: Grid3X3 },
    { id: 'validity', label: 'Validez', icon: FileText },
    { id: 'footer', label: 'Pie de página', icon: FileText },
  ],
};

const VARIABLES = {
  invoice: [
    '{{company.name}}', '{{company.cif}}', '{{company.address}}', '{{company.email}}',
    '{{client.name}}', '{{client.cif}}', '{{client.address}}', '{{client.email}}',
    '{{invoice.number}}', '{{invoice.date}}', '{{invoice.due_date}}',
    '{{invoice.subtotal}}', '{{invoice.iva}}', '{{invoice.total}}',
    '{{company.iban}}', '{{company.logo}}',
  ],
  contract: [
    '{{company.name}}', '{{company.cif}}', '{{company.address}}',
    '{{client.name}}', '{{client.cif}}', '{{client.address}}',
    '{{contract.number}}', '{{contract.start_date}}', '{{contract.end_date}}',
    '{{contract.services}}', '{{contract.total}}',
    '{{current_date}}', '{{company.logo}}',
  ],
  quote: [
    '{{company.name}}', '{{company.cif}}', '{{company.address}}', '{{company.email}}',
    '{{client.name}}', '{{contact.name}}', '{{contact.email}}',
    '{{quote.number}}', '{{quote.date}}', '{{quote.valid_until}}',
    '{{quote.subtotal}}', '{{quote.iva}}', '{{quote.total}}',
    '{{company.logo}}',
  ],
};

export function PdfEditorCanvas({ documentType, initialTemplate, onSave }: PdfEditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [activeColor, setActiveColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(12);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // A4 proportions at 96 DPI (scaled)
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 595, // A4 width in points
      height: 842, // A4 height in points
      backgroundColor: '#ffffff',
      selection: true,
    });

    canvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0]));
    canvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0]));
    canvas.on('selection:cleared', () => setSelectedObject(null));
    canvas.on('object:modified', () => saveToHistory(canvas));

    setFabricCanvas(canvas);
    saveToHistory(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  const saveToHistory = useCallback((canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(json);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0 && fabricCanvas) {
      const newIndex = historyIndex - 1;
      fabricCanvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
        fabricCanvas.renderAll();
        setHistoryIndex(newIndex);
      });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvas) {
      const newIndex = historyIndex + 1;
      fabricCanvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
        fabricCanvas.renderAll();
        setHistoryIndex(newIndex);
      });
    }
  };

  // Tool handlers
  const addText = (text: string = 'Texto') => {
    if (!fabricCanvas) return;
    const textObj = new IText(text, {
      left: 50,
      top: 50,
      fontSize: fontSize,
      fill: activeColor,
      fontFamily: 'Helvetica',
    });
    fabricCanvas.add(textObj);
    fabricCanvas.setActiveObject(textObj);
    saveToHistory(fabricCanvas);
  };

  const addVariable = (variable: string) => {
    addText(variable);
  };

  const addRectangle = () => {
    if (!fabricCanvas) return;
    const rect = new Rect({
      left: 50,
      top: 50,
      width: 200,
      height: 100,
      fill: fillColor,
      stroke: activeColor,
      strokeWidth: 1,
    });
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    saveToHistory(fabricCanvas);
  };

  const addCircle = () => {
    if (!fabricCanvas) return;
    const circle = new Circle({
      left: 50,
      top: 50,
      radius: 50,
      fill: fillColor,
      stroke: activeColor,
      strokeWidth: 1,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    saveToHistory(fabricCanvas);
  };

  const addLine = () => {
    if (!fabricCanvas) return;
    const line = new Line([50, 50, 250, 50], {
      stroke: activeColor,
      strokeWidth: 2,
    });
    fabricCanvas.add(line);
    fabricCanvas.setActiveObject(line);
    saveToHistory(fabricCanvas);
  };

  const addTable = (rows: number = 5, cols: number = 4) => {
    if (!fabricCanvas) return;
    const cellWidth = 120;
    const cellHeight = 25;
    const startX = 50;
    const startY = 100;

    // Create table cells
    for (let r = 0; r <= rows; r++) {
      const line = new Line(
        [startX, startY + r * cellHeight, startX + cols * cellWidth, startY + r * cellHeight],
        { stroke: '#333', strokeWidth: 1 }
      );
      fabricCanvas.add(line);
    }

    for (let c = 0; c <= cols; c++) {
      const line = new Line(
        [startX + c * cellWidth, startY, startX + c * cellWidth, startY + rows * cellHeight],
        { stroke: '#333', strokeWidth: 1 }
      );
      fabricCanvas.add(line);
    }

    // Add header texts
    const headers = ['Concepto', 'Cantidad', 'Precio', 'Total'];
    headers.forEach((header, i) => {
      const text = new IText(header, {
        left: startX + i * cellWidth + 5,
        top: startY + 5,
        fontSize: 10,
        fill: '#000',
        fontWeight: 'bold',
      });
      fabricCanvas.add(text);
    });

    saveToHistory(fabricCanvas);
    toast.success('Tabla añadida');
  };

  const deleteSelected = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.remove(selectedObject);
    setSelectedObject(null);
    saveToHistory(fabricCanvas);
  };

  const duplicateSelected = () => {
    if (!fabricCanvas || !selectedObject) return;
    selectedObject.clone().then((cloned: any) => {
      cloned.set({
        left: (selectedObject.left || 0) + 20,
        top: (selectedObject.top || 0) + 20,
      });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      saveToHistory(fabricCanvas);
    });
  };

  const bringForward = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.bringObjectForward(selectedObject);
    fabricCanvas.renderAll();
  };

  const sendBackward = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.sendObjectBackwards(selectedObject);
    fabricCanvas.renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    const template = fabricCanvas.toJSON();
    onSave?.(template);
    toast.success('Plantilla guardada');
  };

  const updateSelectedStyle = (property: string, value: any) => {
    if (!selectedObject) return;
    selectedObject.set(property, value);
    fabricCanvas?.renderAll();
  };

  return (
    <div className="flex gap-4 h-[800px]">
      {/* Left Panel - Tools & Blocks */}
      <Card className="w-64 flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Herramientas</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <Tabs defaultValue="elements">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="elements" className="text-xs">Elementos</TabsTrigger>
              <TabsTrigger value="blocks" className="text-xs">Bloques</TabsTrigger>
              <TabsTrigger value="variables" className="text-xs">Variables</TabsTrigger>
            </TabsList>

            <TabsContent value="elements" className="space-y-2 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => addText()} className="gap-1">
                  <Type className="h-3 w-3" /> Texto
                </Button>
                <Button variant="outline" size="sm" onClick={addRectangle} className="gap-1">
                  <Square className="h-3 w-3" /> Rect
                </Button>
                <Button variant="outline" size="sm" onClick={addCircle} className="gap-1">
                  <CircleIcon className="h-3 w-3" /> Círculo
                </Button>
                <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
                  <Minus className="h-3 w-3" /> Línea
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTable()} className="gap-1 col-span-2">
                  <Grid3X3 className="h-3 w-3" /> Tabla
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">Color trazo</Label>
                <Input
                  type="color"
                  value={activeColor}
                  onChange={(e) => {
                    setActiveColor(e.target.value);
                    updateSelectedStyle('stroke', e.target.value);
                    if (selectedObject?.type === 'i-text') {
                      updateSelectedStyle('fill', e.target.value);
                    }
                  }}
                  className="h-8 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Color relleno</Label>
                <Input
                  type="color"
                  value={fillColor}
                  onChange={(e) => {
                    setFillColor(e.target.value);
                    updateSelectedStyle('fill', e.target.value);
                  }}
                  className="h-8 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tamaño texto: {fontSize}px</Label>
                <Input
                  type="range"
                  min={8}
                  max={72}
                  value={fontSize}
                  onChange={(e) => {
                    const size = parseInt(e.target.value);
                    setFontSize(size);
                    updateSelectedStyle('fontSize', size);
                  }}
                  className="h-8"
                />
              </div>
            </TabsContent>

            <TabsContent value="blocks" className="mt-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {TEMPLATE_BLOCKS[documentType].map((block) => (
                    <Button
                      key={block.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-xs"
                      onClick={() => {
                        addText(`[${block.label}]`);
                        toast.info(`Bloque "${block.label}" añadido`);
                      }}
                    >
                      <block.icon className="h-3 w-3" />
                      {block.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="variables" className="mt-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {VARIABLES[documentType].map((variable) => (
                    <Button
                      key={variable}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs font-mono"
                      onClick={() => addVariable(variable)}
                    >
                      {variable}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <Card className="mb-2">
          <CardContent className="p-2 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
              <Redo className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="icon" onClick={duplicateSelected} disabled={!selectedObject}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={deleteSelected} disabled={!selectedObject}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="icon" onClick={bringForward} disabled={!selectedObject}>
              <MoveUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={sendBackward} disabled={!selectedObject}>
              <MoveDown className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            {selectedObject?.type === 'i-text' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => updateSelectedStyle('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => updateSelectedStyle('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => updateSelectedStyle('underline', !selectedObject.underline)}
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="ghost" size="icon" onClick={() => updateSelectedStyle('textAlign', 'left')}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => updateSelectedStyle('textAlign', 'center')}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => updateSelectedStyle('textAlign', 'right')}>
                  <AlignRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <div className="flex-1" />
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Guardar Plantilla
            </Button>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card className="flex-1 overflow-auto">
          <CardContent className="p-4 flex justify-center items-start min-h-full bg-muted/30">
            <div className="shadow-lg">
              <canvas ref={canvasRef} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Properties */}
      <Card className="w-56 flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Propiedades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {selectedObject ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <p className="text-sm font-medium capitalize">{selectedObject.type}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedObject.left || 0)}
                    onChange={(e) => {
                      updateSelectedStyle('left', parseInt(e.target.value));
                    }}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedObject.top || 0)}
                    onChange={(e) => {
                      updateSelectedStyle('top', parseInt(e.target.value));
                    }}
                    className="h-8"
                  />
                </div>
              </div>
              {(selectedObject.width || selectedObject.radius) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Ancho</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedObject.width * (selectedObject.scaleX || 1))}
                      onChange={(e) => {
                        updateSelectedStyle('width', parseInt(e.target.value));
                        updateSelectedStyle('scaleX', 1);
                      }}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Alto</Label>
                    <Input
                      type="number"
                      value={Math.round((selectedObject.height || selectedObject.radius * 2) * (selectedObject.scaleY || 1))}
                      onChange={(e) => {
                        if (selectedObject.type === 'circle') {
                          updateSelectedStyle('radius', parseInt(e.target.value) / 2);
                        } else {
                          updateSelectedStyle('height', parseInt(e.target.value));
                        }
                        updateSelectedStyle('scaleY', 1);
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs">Opacidad</Label>
                <Input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={selectedObject.opacity || 1}
                  onChange={(e) => updateSelectedStyle('opacity', parseFloat(e.target.value))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Rotación</Label>
                <Input
                  type="range"
                  min={0}
                  max={360}
                  value={selectedObject.angle || 0}
                  onChange={(e) => updateSelectedStyle('angle', parseInt(e.target.value))}
                  className="h-8"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              Selecciona un elemento para ver sus propiedades
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
