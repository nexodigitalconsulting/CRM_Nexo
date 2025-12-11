import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Send } from "lucide-react";
import { useSendEmail, useEmailTemplates, useEmailSettings } from "@/hooks/useEmailSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { toast } from "sonner";

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "invoice" | "contract" | "quote";
  entityId: string;
  entityNumber: number | string;
  clientName: string;
  clientEmail: string;
  total?: number;
  dueDate?: string;
}

const TEMPLATE_TYPE_MAP: Record<string, string> = {
  invoice: "invoice_send",
  contract: "contract_pending",
  quote: "quote_followup",
};

const ENTITY_NAME_MAP: Record<string, string> = {
  invoice: "Factura",
  contract: "Contrato",
  quote: "Presupuesto",
};

export function SendEmailDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityNumber,
  clientName,
  clientEmail,
  total,
  dueDate,
}: SendEmailDialogProps) {
  const { data: emailSettings } = useEmailSettings();
  const { data: templates } = useEmailTemplates();
  const { data: companySettings } = useCompanySettings();
  const sendEmail = useSendEmail();

  const template = templates?.find(t => t.template_type === TEMPLATE_TYPE_MAP[entityType]);
  
  const replaceVariables = (text: string) => {
    return text
      .replace(/{{client_name}}/g, clientName)
      .replace(/{{company_name}}/g, companySettings?.name || "La Empresa")
      .replace(/{{invoice_number}}/g, String(entityNumber))
      .replace(/{{contract_number}}/g, String(entityNumber))
      .replace(/{{quote_number}}/g, String(entityNumber))
      .replace(/{{total}}/g, String(total || 0))
      .replace(/{{due_date}}/g, dueDate || "")
      .replace(/{{end_date}}/g, dueDate || "")
      .replace(/{{days}}/g, "");
  };

  const [formData, setFormData] = useState({
    to: clientEmail,
    subject: template ? replaceVariables(template.subject) : `${ENTITY_NAME_MAP[entityType]} ${entityNumber}`,
    html: template ? replaceVariables(template.body_html) : "",
  });

  // Update form when template loads
  useState(() => {
    if (template) {
      setFormData({
        to: clientEmail,
        subject: replaceVariables(template.subject),
        html: replaceVariables(template.body_html),
      });
    }
  });

  const handleSend = () => {
    if (!formData.to) {
      toast.error("El cliente no tiene email configurado");
      return;
    }

    sendEmail.mutate({
      to: formData.to,
      subject: formData.subject,
      html: formData.html,
      entityType,
      entityId,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!emailSettings?.is_active) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar por Email
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              El envío de emails no está configurado.
            </p>
            <p className="text-sm">
              Ve a <span className="font-medium">Configuración → Correo</span> para configurar SMTP.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar {ENTITY_NAME_MAP[entityType]} por Email
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">Destinatario</Label>
            <Input
              id="email-to"
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="cliente@email.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email-subject">Asunto</Label>
            <Input
              id="email-subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email-body">Contenido</Label>
            <Textarea
              id="email-body"
              rows={10}
              value={formData.html}
              onChange={(e) => setFormData({ ...formData, html: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sendEmail.isPending || !formData.to}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendEmail.isPending ? "Enviando..." : "Enviar Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
