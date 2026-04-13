"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, FileText, Clock, Edit2, History, CheckCircle, XCircle, Mail, ChevronLeft, ChevronRight, User, Plus, Trash2, Play, Loader2 } from "lucide-react";
import { 
  useNotificationRules, 
  useUpdateNotificationRule,
  useCreateNotificationRule,
  useDeleteNotificationRule,
  useEmailTemplates,
  useUpdateEmailTemplate,
  useNotificationHistory,
  useNotificationHistoryYears,
  NotificationRule,
  EmailTemplate
} from "@/hooks/useEmailSettings";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const RULE_LABELS: Record<string, { name: string; icon: string; entity: string }> = {
  invoice_due_3days: { name: "Facturas por vencer", icon: "📄", entity: "invoice" },
  invoice_overdue: { name: "Facturas vencidas", icon: "⚠️", entity: "invoice" },
  contract_pending: { name: "Contratos pendientes de firma", icon: "📝", entity: "contract" },
  contract_expiring: { name: "Contratos por vencer", icon: "🔄", entity: "contract" },
  quote_no_response: { name: "Presupuestos sin respuesta", icon: "📋", entity: "quote" },
};

const TEMPLATE_LABELS: Record<string, string> = {
  invoice_send: "Envío de Factura",
  invoice_due_reminder: "Recordatorio Vencimiento",
  invoice_overdue: "Factura Vencida",
  contract_send: "Envío de Contrato",
  contract_pending: "Contrato Pendiente",
  contract_expiring: "Renovación Contrato",
  quote_send: "Envío de Presupuesto",
  quote_followup: "Seguimiento Presupuesto",
};

const ENTITY_OPTIONS = [
  { value: "invoice", label: "Facturas" },
  { value: "contract", label: "Contratos" },
  { value: "quote", label: "Presupuestos" },
];

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Enviado", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
  failed: { label: "Error", variant: "destructive" },
  manual_send: { label: "Manual", variant: "outline" },
};

interface RunResult {
  sent: number;
  skipped: number;
  errors: number;
  details: string[];
}

export function NotificationRulesSettings() {
  const [historyYear, setHistoryYear] = useState<number | undefined>(undefined);
  const [historyPage, setHistoryPage] = useState(1);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const pageSize = 15;
  
  const { data: rules, isLoading: loadingRules } = useNotificationRules();
  const { data: templates, isLoading: loadingTemplates } = useEmailTemplates();
  const { data: historyData, isLoading: loadingHistory } = useNotificationHistory(historyYear, historyPage, pageSize);
  const { data: availableYears } = useNotificationHistoryYears();
  const updateRule = useUpdateNotificationRule();
  const createRule = useCreateNotificationRule();
  const deleteRule = useDeleteNotificationRule();
  const updateTemplate = useUpdateEmailTemplate();

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/cron/notifications", { method: "POST" });
      const data = await res.json() as RunResult;
      setLastRun(data);
      if (data.sent > 0) {
        toast.success(`${data.sent} email${data.sent !== 1 ? "s" : ""} enviado${data.sent !== 1 ? "s" : ""}`);
      } else if (data.errors > 0) {
        toast.error(`${data.errors} error${data.errors !== 1 ? "es" : ""} al enviar`);
      } else {
        toast.info("Sin notificaciones pendientes");
      }
    } catch {
      toast.error("Error al ejecutar las notificaciones");
    } finally {
      setRunning(false);
    }
  };
  
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: "",
    rule_type: "",
    description: "",
    days_threshold: 3,
    is_active: true,
    template_id: "",
  });
  const [templateForm, setTemplateForm] = useState({
    subject: "",
    body_html: "",
  });

  const handleToggleRule = (rule: NotificationRule) => {
    updateRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const handleDaysChange = (rule: NotificationRule, days: number) => {
    updateRule.mutate({ id: rule.id, days_threshold: days });
  };

  const handleTemplateAssign = (rule: NotificationRule, templateId: string) => {
    updateRule.mutate({ id: rule.id, template_id: templateId === "none" ? null : templateId });
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      subject: template.subject,
      body_html: template.body_html,
    });
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateTemplate.mutate({
        id: editingTemplate.id,
        subject: templateForm.subject,
        body_html: templateForm.body_html,
      }, {
        onSuccess: () => setEditingTemplate(null),
      });
    }
  };

  const handleOpenNewRule = () => {
    setEditingRule(null);
    setRuleForm({
      name: "",
      rule_type: "",
      description: "",
      days_threshold: 3,
      is_active: true,
      template_id: "",
    });
    setShowRuleDialog(true);
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      rule_type: rule.rule_type,
      description: rule.description || "",
      days_threshold: rule.days_threshold,
      is_active: rule.is_active,
      template_id: rule.template_id || "",
    });
    setShowRuleDialog(true);
  };

  const handleSaveRule = () => {
    if (!ruleForm.name || !ruleForm.rule_type) {
      toast.error("Nombre y tipo de regla son requeridos");
      return;
    }

    if (editingRule) {
      updateRule.mutate({
        id: editingRule.id,
        name: ruleForm.name,
        rule_type: ruleForm.rule_type,
        description: ruleForm.description || null,
        days_threshold: ruleForm.days_threshold,
        is_active: ruleForm.is_active,
        template_id: ruleForm.template_id || null,
      }, {
        onSuccess: () => setShowRuleDialog(false),
      });
    } else {
      createRule.mutate({
        name: ruleForm.name,
        rule_type: ruleForm.rule_type,
        description: ruleForm.description || null,
        days_threshold: ruleForm.days_threshold,
        is_active: ruleForm.is_active,
        template_id: ruleForm.template_id || null,
      }, {
        onSuccess: () => setShowRuleDialog(false),
      });
    }
  };

  const handleDeleteRule = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta regla?")) {
      deleteRule.mutate(id);
    }
  };

  // Get templates for a specific entity type
  const getTemplatesForEntity = (entityType: string) => {
    return templates?.filter(t => {
      if (entityType === "invoice") return t.template_type.includes("invoice");
      if (entityType === "contract") return t.template_type.includes("contract");
      if (entityType === "quote") return t.template_type.includes("quote");
      return false;
    }) || [];
  };

  const getEntityFromRuleType = (ruleType: string): string => {
    if (ruleType.includes("invoice")) return "invoice";
    if (ruleType.includes("contract")) return "contract";
    if (ruleType.includes("quote")) return "quote";
    return "invoice";
  };

  if (loadingRules || loadingTemplates) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Reglas de Notificación Automática
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunNow}
                disabled={running}
                className="gap-1"
                title="Evaluar todas las reglas activas y enviar emails ahora"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? "Ejecutando..." : "Ejecutar ahora"}
              </Button>
              <Button size="sm" onClick={handleOpenNewRule}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva Regla
              </Button>
            </div>
          </div>
          {lastRun && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
              <span className="text-success font-medium">✓ {lastRun.sent} enviados</span>
              <span>{lastRun.skipped} omitidos</span>
              {lastRun.errors > 0 && <span className="text-destructive font-medium">✗ {lastRun.errors} errores</span>}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Configura las notificaciones automáticas. Cada regla puede asociarse a una plantilla de email específica.
          </p>
          
          {rules?.map((rule) => {
            const ruleInfo = RULE_LABELS[rule.rule_type];
            const entityTemplates = ruleInfo ? getTemplatesForEntity(ruleInfo.entity) : [];
            const selectedTemplate = templates?.find(t => t.id === rule.template_id);
            
            return (
              <div
                key={rule.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ruleInfo?.icon || "📧"}</span>
                    <div>
                      <p className="font-medium">{ruleInfo?.name || rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleRule(rule)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 pl-11">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="w-20"
                      value={rule.days_threshold}
                      onChange={(e) => handleDaysChange(rule, parseInt(e.target.value) || 0)}
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">días</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Select 
                      value={rule.template_id || "none"} 
                      onValueChange={(v) => handleTemplateAssign(rule, v)}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Sin plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin plantilla</SelectItem>
                        {entityTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {TEMPLATE_LABELS[t.template_type] || t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTemplate(selectedTemplate)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Plantillas de Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Personaliza las plantillas de email. Variables disponibles: {`{{client_name}}, {{company_name}}, {{invoice_number}}, {{quote_number}}, {{contract_number}}, {{total}}, {{due_date}}, {{end_date}}, {{days}}`}
          </p>
          
          {templates?.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{TEMPLATE_LABELS[template.template_type] || template.name}</p>
                <p className="text-sm text-muted-foreground truncate max-w-md">
                  {template.subject}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={template.is_active}
                  onCheckedChange={(checked) => 
                    updateTemplate.mutate({ id: template.id, is_active: checked })
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Notificaciones
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select 
                value={historyYear?.toString() || "all"} 
                onValueChange={(v) => {
                  setHistoryYear(v === "all" ? undefined : parseInt(v));
                  setHistoryPage(1);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todos los años" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableYears?.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <Skeleton className="h-[300px] w-full" />
          ) : historyData?.data && historyData.data.length > 0 ? (
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {historyData.data.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {log.status === "sent" ? (
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : log.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium capitalize truncate">
                          {RULE_LABELS[log.rule_type]?.name || log.rule_type.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">{log.entity_type}</span>
                          {log.client && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 truncate">
                                <User className="h-3 w-3" />
                                {log.client.name}
                                {log.client.email && (
                                  <span className="flex items-center gap-0.5">
                                    <Mail className="h-3 w-3" />
                                    {log.client.email}
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={STATUS_LABELS[log.status]?.variant || "secondary"}>
                        {STATUS_LABELS[log.status]?.label || log.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {log.sent_at 
                          ? format(new Date(log.sent_at), "dd MMM yyyy HH:mm", { locale: es })
                          : format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: es })
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay notificaciones {historyYear ? `en ${historyYear}` : ""}</p>
            </div>
          )}
        </CardContent>
        {historyData && historyData.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">
              Página {historyPage} de {historyData.totalPages} ({historyData.totalCount} registros)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryPage(p => Math.min(historyData.totalPages, p + 1))}
                disabled={historyPage >= historyData.totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Dialog para editar plantilla */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar Plantilla: {editingTemplate && (TEMPLATE_LABELS[editingTemplate.template_type] || editingTemplate.name)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asunto del email</Label>
              <Input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contenido HTML</Label>
              <Textarea
                rows={12}
                value={templateForm.body_html}
                onChange={(e) => setTemplateForm({ ...templateForm, body_html: e.target.value })}
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Variables disponibles:</p>
              <code className="text-xs">
                {`{{client_name}}, {{company_name}}, {{invoice_number}}, {{quote_number}}, {{contract_number}}, {{total}}, {{due_date}}, {{end_date}}, {{days}}`}
              </code>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTemplate} disabled={updateTemplate.isPending}>
                {updateTemplate.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear/editar regla */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Editar Regla" : "Nueva Regla de Notificación"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la regla</Label>
              <Input
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="Ej: Recordatorio de factura"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de regla (identificador)</Label>
              <Input
                value={ruleForm.rule_type}
                onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                placeholder="Ej: invoice_reminder_7days"
              />
              <p className="text-xs text-muted-foreground">
                Usar formato: entidad_accion (ej: invoice_due_3days, contract_expiring)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                placeholder="Descripción de cuándo se activa esta regla"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Días de umbral</Label>
                <Input
                  type="number"
                  min={1}
                  value={ruleForm.days_threshold}
                  onChange={(e) => setRuleForm({ ...ruleForm, days_threshold: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Plantilla asociada</Label>
                <Select
                  value={ruleForm.template_id || "none"}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, template_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin plantilla</SelectItem>
                    {templates?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {TEMPLATE_LABELS[t.template_type] || t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={ruleForm.is_active}
                onCheckedChange={(checked) => setRuleForm({ ...ruleForm, is_active: checked })}
              />
              <Label>Regla activa</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveRule} disabled={createRule.isPending || updateRule.isPending}>
                {(createRule.isPending || updateRule.isPending) ? "Guardando..." : (editingRule ? "Actualizar" : "Crear Regla")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
