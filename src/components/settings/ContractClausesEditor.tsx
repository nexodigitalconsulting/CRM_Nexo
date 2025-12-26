import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Plus, Trash2, RotateCcw, ChevronDown, ChevronUp, GripVertical, 
  Info, Variable, FileText 
} from "lucide-react";
import { LegalClause, DEFAULT_LEGAL_CLAUSES } from "@/lib/pdf/pdfUtils";

interface ContractClausesEditorProps {
  clauses: LegalClause[];
  onChange: (clauses: LegalClause[]) => void;
}

// Variables disponibles para las cláusulas
const CLAUSE_VARIABLES = [
  { key: 'company_name', label: 'Nombre empresa', example: 'Mi Empresa S.L.' },
  { key: 'company_cif', label: 'CIF empresa', example: 'B12345678' },
  { key: 'company_address', label: 'Dirección empresa', example: 'Calle Principal 123' },
  { key: 'client_name', label: 'Nombre cliente', example: 'Cliente S.A.' },
  { key: 'client_cif', label: 'CIF cliente', example: 'A87654321' },
  { key: 'client_address', label: 'Dirección cliente', example: 'Av. Comercial 456' },
  { key: 'contract_number', label: 'Nº contrato', example: 'C-2024-0015' },
  { key: 'start_date', label: 'Fecha inicio', example: '01/01/2025' },
  { key: 'end_date', label: 'Fecha fin', example: '31/12/2025' },
  { key: 'billing_period', label: 'Periodicidad', example: 'Mensual' },
  { key: 'total', label: 'Total', example: '14.520,00 €' },
  { key: 'subtotal', label: 'Subtotal', example: '12.000,00 €' },
  { key: 'iva_amount', label: 'IVA', example: '2.520,00 €' },
  { key: 'current_date', label: 'Fecha actual', example: '26/12/2024' },
];

const CLAUSE_NUMBERS = [
  'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 
  'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
  'UNDÉCIMA', 'DUODÉCIMA', 'DECIMOTERCERA', 'DECIMOCUARTA', 'DECIMOQUINTA'
];

export function ContractClausesEditor({ clauses, onChange }: ContractClausesEditorProps) {
  const [expandedClause, setExpandedClause] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(false);

  const handleClauseChange = (id: string, field: keyof LegalClause, value: string | boolean) => {
    const updated = clauses.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    );
    onChange(updated);
  };

  const handleToggleVisibility = (id: string) => {
    const updated = clauses.map(c => 
      c.id === id ? { ...c, visible: !c.visible } : c
    );
    onChange(updated);
  };

  const handleAddClause = () => {
    const visibleCount = clauses.filter(c => c.visible).length;
    const newClauseNumber = CLAUSE_NUMBERS[visibleCount] || `CLÁUSULA ${visibleCount + 1}`;
    
    const newClause: LegalClause = {
      id: `custom_${Date.now()}`,
      number: newClauseNumber,
      title: 'NUEVA CLÁUSULA',
      content: 'Contenido de la cláusula. Puedes usar variables como {{company_name}} o {{client_name}}.',
      visible: true,
    };
    
    onChange([...clauses, newClause]);
    setExpandedClause(newClause.id);
  };

  const handleDeleteClause = (id: string) => {
    // Solo permitir eliminar cláusulas personalizadas
    if (id.startsWith('custom_')) {
      onChange(clauses.filter(c => c.id !== id));
    }
  };

  const handleRestoreDefaults = () => {
    onChange([...DEFAULT_LEGAL_CLAUSES]);
  };

  const insertVariable = (clauseId: string, variable: string) => {
    const clause = clauses.find(c => c.id === clauseId);
    if (clause) {
      handleClauseChange(clauseId, 'content', clause.content + `{{${variable}}}`);
    }
  };

  // Renumerar cláusulas visibles
  const renumberVisibleClauses = () => {
    let visibleIndex = 0;
    const updated = clauses.map(c => {
      if (c.visible) {
        const newNumber = CLAUSE_NUMBERS[visibleIndex] || `CLÁUSULA ${visibleIndex + 1}`;
        visibleIndex++;
        return { ...c, number: newNumber };
      }
      return c;
    });
    onChange(updated);
  };

  const visibleCount = clauses.filter(c => c.visible).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <h4 className="text-sm font-medium">Cláusulas Legales</h4>
            <p className="text-xs text-muted-foreground">
              {visibleCount} de {clauses.length} cláusulas activas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowVariables(!showVariables)}
                >
                  <Variable className="h-4 w-4 mr-1" />
                  Variables
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver variables disponibles para usar en las cláusulas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" size="sm" onClick={renumberVisibleClauses}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Renumerar
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestoreDefaults}>
            Restaurar
          </Button>
          <Button size="sm" onClick={handleAddClause}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </Button>
        </div>
      </div>

      {/* Variables Help */}
      {showVariables && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Variables disponibles</p>
                <p className="text-muted-foreground text-xs">
                  Usa estas variables en el texto de las cláusulas. Se reemplazarán automáticamente por los datos reales.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CLAUSE_VARIABLES.map((v) => (
                <div key={v.key} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                  <code className="text-primary font-mono">{`{{${v.key}}}`}</code>
                  <span className="text-muted-foreground truncate ml-2">{v.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clauses List */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {clauses.map((clause, index) => (
            <Collapsible 
              key={clause.id}
              open={expandedClause === clause.id}
              onOpenChange={(open) => setExpandedClause(open ? clause.id : null)}
            >
              <Card className={!clause.visible ? 'opacity-50' : ''}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Switch 
                      checked={clause.visible}
                      onCheckedChange={() => handleToggleVisibility(clause.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {clause.number}
                        </Badge>
                        <span className="font-medium text-sm truncate">{clause.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {clause.content.substring(0, 80)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {clause.id.startsWith('custom_') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClause(clause.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {expandedClause === clause.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Número</Label>
                        <Input
                          value={clause.number}
                          onChange={(e) => handleClauseChange(clause.id, 'number', e.target.value)}
                          placeholder="PRIMERA"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={clause.title}
                          onChange={(e) => handleClauseChange(clause.id, 'title', e.target.value)}
                          placeholder="OBJETO DEL CONTRATO"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Contenido</Label>
                        <div className="flex gap-1">
                          {CLAUSE_VARIABLES.slice(0, 4).map((v) => (
                            <Button
                              key={v.key}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => insertVariable(clause.id, v.key)}
                            >
                              +{v.key}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        value={clause.content}
                        onChange={(e) => handleClauseChange(clause.id, 'content', e.target.value)}
                        placeholder="Contenido de la cláusula..."
                        rows={4}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Usa variables como <code className="text-primary">{"{{company_name}}"}</code> para datos dinámicos
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
