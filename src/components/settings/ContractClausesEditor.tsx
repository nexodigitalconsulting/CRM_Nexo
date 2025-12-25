import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Scale, Plus, Trash2, RotateCcw, GripVertical, Eye, EyeOff,
  ChevronDown, Info, Copy
} from "lucide-react";
import { LegalClause, DEFAULT_LEGAL_CLAUSES } from "@/lib/pdf/pdfUtils";
import { toast } from "sonner";

// Variables disponibles para cláusulas
const CLAUSE_VARIABLES = [
  { key: 'company_name', label: 'Nombre empresa', example: 'Mi Empresa S.L.' },
  { key: 'company_cif', label: 'CIF empresa', example: 'B12345678' },
  { key: 'company_address', label: 'Dirección empresa', example: 'Calle Principal 123' },
  { key: 'client_name', label: 'Nombre cliente', example: 'Cliente S.A.' },
  { key: 'client_cif', label: 'CIF cliente', example: 'A87654321' },
  { key: 'client_address', label: 'Dirección cliente', example: 'Av. Comercial 456' },
  { key: 'start_date', label: 'Fecha inicio', example: '01/01/2025' },
  { key: 'end_date', label: 'Fecha fin', example: '31/12/2025' },
  { key: 'billing_period', label: 'Periodo facturación', example: 'Mensual' },
  { key: 'total', label: 'Importe total', example: '1.500,00 €' },
  { key: 'current_date', label: 'Fecha actual', example: '25/12/2024' },
];

interface ContractClausesEditorProps {
  clauses: LegalClause[];
  onChange: (clauses: LegalClause[]) => void;
}

export function ContractClausesEditor({ clauses, onChange }: ContractClausesEditorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClauseNumber, setNewClauseNumber] = useState('');
  const [newClauseTitle, setNewClauseTitle] = useState('');
  const [newClauseContent, setNewClauseContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const visibleCount = clauses.filter(c => c.visible).length;

  const handleToggleVisibility = (id: string) => {
    onChange(clauses.map(c => 
      c.id === id ? { ...c, visible: !c.visible } : c
    ));
  };

  const handleUpdateClause = (id: string, updates: Partial<LegalClause>) => {
    onChange(clauses.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const handleDeleteClause = (id: string) => {
    onChange(clauses.filter(c => c.id !== id));
    toast.success('Cláusula eliminada');
  };

  const handleAddClause = () => {
    if (!newClauseTitle.trim() || !newClauseContent.trim()) {
      toast.error('Completa el título y contenido');
      return;
    }

    const newClause: LegalClause = {
      id: `custom_${Date.now()}`,
      number: newClauseNumber || `CLÁUSULA ${clauses.length + 1}`,
      title: newClauseTitle.toUpperCase(),
      content: newClauseContent,
      visible: true,
    };

    onChange([...clauses, newClause]);
    setNewClauseNumber('');
    setNewClauseTitle('');
    setNewClauseContent('');
    setShowAddDialog(false);
    toast.success('Cláusula añadida');
  };

  const handleRestoreDefaults = () => {
    onChange(DEFAULT_LEGAL_CLAUSES.map(c => ({ ...c })));
    toast.success('Cláusulas restauradas');
  };

  const insertVariable = (variable: string, targetField: 'title' | 'content') => {
    const varText = `{{${variable}}}`;
    if (targetField === 'title') {
      setNewClauseTitle(prev => prev + varText);
    } else {
      setNewClauseContent(prev => prev + varText);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Cláusulas del Contrato
          </span>
          <Badge variant="secondary">
            {visibleCount} de {clauses.length} activas
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Edita el contenido de cada cláusula. Usa variables como {'{'}{'{'} client_name {'}'}{'}'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddDialog(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Añadir cláusula
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRestoreDefaults}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </Button>
        </div>

        {/* Variables hint */}
        <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
          <p className="text-xs font-medium mb-2 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Variables disponibles:
          </p>
          <div className="flex flex-wrap gap-1">
            {CLAUSE_VARIABLES.slice(0, 6).map((v) => (
              <Badge 
                key={v.key} 
                variant="outline" 
                className="text-xs cursor-help font-mono"
                title={`Ejemplo: ${v.example}`}
              >
                {`{{${v.key}}}`}
              </Badge>
            ))}
            <Badge variant="outline" className="text-xs">
              +{CLAUSE_VARIABLES.length - 6} más
            </Badge>
          </div>
        </div>

        {/* Clauses List */}
        <ScrollArea className="h-[400px] pr-4">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {clauses.map((clause, index) => (
              <AccordionItem 
                key={clause.id} 
                value={clause.id}
                className={`border rounded-lg px-3 ${!clause.visible ? 'opacity-60' : ''}`}
              >
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">
                        {clause.number} - {clause.title}
                      </span>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {clause.content.substring(0, 60)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleVisibility(clause.id)}
                      >
                        {clause.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Número</Label>
                        <Input
                          value={clause.number}
                          onChange={(e) => handleUpdateClause(clause.id, { number: e.target.value })}
                          placeholder="PRIMERA"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={clause.title}
                          onChange={(e) => handleUpdateClause(clause.id, { title: e.target.value })}
                          placeholder="OBJETO DEL CONTRATO"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Contenido</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                              <Plus className="h-3 w-3" />
                              Insertar variable
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {CLAUSE_VARIABLES.map((v) => (
                              <DropdownMenuItem
                                key={v.key}
                                onClick={() => {
                                  handleUpdateClause(clause.id, { 
                                    content: clause.content + `{{${v.key}}}` 
                                  });
                                }}
                              >
                                <Copy className="h-3 w-3 mr-2" />
                                {v.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Textarea
                        value={clause.content}
                        onChange={(e) => handleUpdateClause(clause.id, { content: e.target.value })}
                        rows={4}
                        className="text-sm resize-none"
                        placeholder="El prestador se compromete a..."
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={clause.visible}
                          onCheckedChange={(v) => handleUpdateClause(clause.id, { visible: v })}
                        />
                        <Label className="text-xs">
                          {clause.visible ? 'Visible en PDF' : 'Oculta'}
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        onClick={() => handleDeleteClause(clause.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        {/* Add Clause Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva Cláusula</DialogTitle>
              <DialogDescription>
                Añade una cláusula personalizada al contrato
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Número (ej: OCTAVA)</Label>
                  <Input
                    value={newClauseNumber}
                    onChange={(e) => setNewClauseNumber(e.target.value)}
                    placeholder="OCTAVA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={newClauseTitle}
                    onChange={(e) => setNewClauseTitle(e.target.value)}
                    placeholder="CONFIDENCIALIDAD"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Contenido</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        <Plus className="h-3 w-3" />
                        Variable
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {CLAUSE_VARIABLES.map((v) => (
                        <DropdownMenuItem
                          key={v.key}
                          onClick={() => insertVariable(v.key, 'content')}
                        >
                          {v.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Textarea
                  value={newClauseContent}
                  onChange={(e) => setNewClauseContent(e.target.value)}
                  rows={5}
                  placeholder="Ambas partes se comprometen a mantener la confidencialidad sobre toda la información..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddClause}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir cláusula
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
