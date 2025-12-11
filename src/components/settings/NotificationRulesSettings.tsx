import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, FileText, Clock, Edit2 } from "lucide-react";
import { 
  useNotificationRules, 
  useUpdateNotificationRule,
  useEmailTemplates,
  useUpdateEmailTemplate,
  NotificationRule,
  EmailTemplate
} from "@/hooks/useEmailSettings";

const RULE_LABELS: Record<string, { name: string; icon: string }> = {
  invoice_due_3days: { name: "Facturas por vencer", icon: "📄" },
  invoice_overdue: { name: "Facturas vencidas", icon: "⚠️" },
  contract_pending: { name: "Contratos pendientes de firma", icon: "📝" },
  contract_expiring: { name: "Contratos por vencer", icon: "🔄" },
  quote_no_response: { name: "Presupuestos sin respuesta", icon: "📋" },
};

const TEMPLATE_LABELS: Record<string, string> = {
  invoice_send: "Envío de Factura",
  invoice_due_reminder: "Recordatorio Vencimiento",
  invoice_overdue: "Factura Vencida",
  contract_pending: "Contrato Pendiente",
  contract_expiring: "Renovación Contrato",
  quote_followup: "Seguimiento Presupuesto",
};

export function NotificationRulesSettings() {
  const { data: rules, isLoading: loadingRules } = useNotificationRules();
  const { data: templates, isLoading: loadingTemplates } = useEmailTemplates();
  const updateRule = useUpdateNotificationRule();
  const updateTemplate = useUpdateEmailTemplate();
  
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
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
            Configura las notificaciones automáticas que se enviarán a tus clientes.
          </p>
          
          {rules?.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{RULE_LABELS[rule.rule_type]?.icon || "📧"}</span>
                <div>
                  <p className="font-medium">{RULE_LABELS[rule.rule_type]?.name || rule.name}</p>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
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
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={() => handleToggleRule(rule)}
                />
              </div>
            </div>
          ))}
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
