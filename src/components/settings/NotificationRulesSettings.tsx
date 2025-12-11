import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Bell, FileText, Clock, Edit2, History, CheckCircle, XCircle } from "lucide-react";
import { 
  useNotificationRules, 
  useUpdateNotificationRule,
  useEmailTemplates,
  useUpdateEmailTemplate,
  useNotificationHistory,
  NotificationRule,
  EmailTemplate
} from "@/hooks/useEmailSettings";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  contract_pending: "Contrato Pendiente",
  contract_expiring: "Renovación Contrato",
  quote_followup: "Seguimiento Presupuesto",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Enviado", variant: "default" },
  pending: { label: "Pendiente", variant: "secondary" },
  failed: { label: "Error", variant: "destructive" },
  manual_send: { label: "Manual", variant: "outline" },
};

export function NotificationRulesSettings() {
  const { data: rules, isLoading: loadingRules } = useNotificationRules();
  const { data: templates, isLoading: loadingTemplates } = useEmailTemplates();
  const { data: history, isLoading: loadingHistory } = useNotificationHistory();
  const updateRule = useUpdateNotificationRule();
  const updateTemplate = useUpdateEmailTemplate();
  
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
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

  // Get templates for a specific entity type
  const getTemplatesForEntity = (entityType: string) => {
    return templates?.filter(t => {
      if (entityType === "invoice") return t.template_type.includes("invoice");
      if (entityType === "contract") return t.template_type.includes("contract");
      if (entityType === "quote") return t.template_type.includes("quote");
      return false;
    }) || [];
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
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reglas de Notificación Automática
          </CardTitle>
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
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggleRule(rule)}
                  />
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
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <Skeleton className="h-[200px] w-full" />
          ) : history && history.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {history.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-3">
                      {log.status === "sent" ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : log.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium capitalize">
                          {log.entity_type} - {log.rule_type.replace(/_/g, " ")}
                        </p>
                        {log.error_message && (
                          <p className="text-xs text-destructive">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_LABELS[log.status]?.variant || "secondary"}>
                        {STATUS_LABELS[log.status]?.label || log.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
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
              <p>No hay notificaciones enviadas</p>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
