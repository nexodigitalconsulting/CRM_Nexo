import { useState, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Eye, FileText, Paperclip } from "lucide-react";
import { useSendEmail, useEmailTemplates, useEmailSettings, EmailTemplate } from "@/hooks/useEmailSettings";
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
  contactEmail?: string;
  total?: number;
  dueDate?: string;
  pdfHtml?: string;
}

const TEMPLATE_TYPES_BY_ENTITY: Record<string, string[]> = {
  invoice: ["invoice_send", "invoice_due_reminder", "invoice_overdue"],
  contract: ["contract_send", "contract_pending", "contract_expiring"],
  quote: ["quote_send", "quote_followup"],
};

const ENTITY_NAME_MAP: Record<string, string> = {
  invoice: "Factura",
  contract: "Contrato",
  quote: "Presupuesto",
};

const ENTITY_PREFIX_MAP: Record<string, string> = {
  invoice: "FF",
  contract: "CN",
  quote: "PP",
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

export function SendEmailDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityNumber,
  clientName,
  clientEmail,
  contactEmail,
  total,
  dueDate,
  pdfHtml,
}: SendEmailDialogProps) {
  const { data: emailSettings } = useEmailSettings();
  const { data: templates } = useEmailTemplates();
  const { data: companySettings } = useCompanySettings();
  const sendEmail = useSendEmail();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "preview" | "document">("compose");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  
  // Get available templates for this entity type
  const availableTemplates = templates?.filter(t => 
    TEMPLATE_TYPES_BY_ENTITY[entityType]?.includes(t.template_type)
  ) || [];
  
  // Get the selected template or default to the first one
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId) || 
    availableTemplates[0];
  
  const replaceVariables = (text: string) => {
    return text
      .replace(/{{client_name}}/g, clientName)
      .replace(/{{company_name}}/g, companySettings?.name || "La Empresa")
      .replace(/{{invoice_number}}/g, `${ENTITY_PREFIX_MAP.invoice}-${String(entityNumber).padStart(4, "0")}`)
      .replace(/{{contract_number}}/g, `${ENTITY_PREFIX_MAP.contract}-${String(entityNumber).padStart(4, "0")}`)
      .replace(/{{quote_number}}/g, `${ENTITY_PREFIX_MAP.quote}-${String(entityNumber).padStart(4, "0")}`)
      .replace(/{{total}}/g, total ? `${total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}` : "")
      .replace(/{{due_date}}/g, dueDate || "")
      .replace(/{{end_date}}/g, dueDate || "")
      .replace(/{{valid_until}}/g, dueDate || "")
      .replace(/{{start_date}}/g, dueDate || "")
      .replace(/{{days}}/g, "");
  };

  const getDefaultContent = (template?: EmailTemplate) => {
    if (template) {
      return {
        subject: replaceVariables(template.subject),
        html: replaceVariables(template.body_html),
      };
    }
    return {
      subject: `${ENTITY_NAME_MAP[entityType]} ${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}`,
      html: `Estimado/a ${clientName},\n\nAdjunto encontrará el documento ${ENTITY_NAME_MAP[entityType]} ${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}.\n\nSaludos cordiales,\n${companySettings?.name || "La Empresa"}`,
    };
  };

  const [formData, setFormData] = useState({
    to: clientEmail || contactEmail || "",
    cc: contactEmail && clientEmail && contactEmail !== clientEmail ? contactEmail : "",
    subject: "",
    html: "",
  });

  // Update form when template changes
  useEffect(() => {
    if (open && selectedTemplate) {
      const content = getDefaultContent(selectedTemplate);
      setFormData(prev => ({
        ...prev,
        to: clientEmail || contactEmail || "",
        cc: contactEmail && clientEmail && contactEmail !== clientEmail ? contactEmail : "",
        subject: content.subject,
        html: content.html,
      }));
    }
  }, [open, selectedTemplate, clientEmail, contactEmail]);

  // Set default template when dialog opens
  useEffect(() => {
    if (open && availableTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(availableTemplates[0].id);
    }
    if (open) {
      setActiveTab("compose");
    }
  }, [open, availableTemplates]);

  const handleSendClick = () => {
    if (!formData.to) {
      toast.error("El cliente no tiene email configurado");
      return;
    }
    setShowConfirmDialog(true);
  };

  const documentNumber = `${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}`;

  const handleConfirmSend = () => {
    sendEmail.mutate({
      to: formData.to,
      cc: formData.cc || undefined,
      subject: formData.subject,
      html: formData.html,
      entityType,
      entityId,
      attachPdf: !!pdfHtml,
      pdfHtml: pdfHtml,
      pdfFilename: `${documentNumber}.pdf`,
    }, {
      onSuccess: () => {
        setShowConfirmDialog(false);
        onOpenChange(false);
        toast.success(`${ENTITY_NAME_MAP[entityType]} enviado correctamente`);
      },
      onError: (error) => {
        setShowConfirmDialog(false);
        toast.error(`Error al enviar: ${error.message}`);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar {ENTITY_NAME_MAP[entityType]} por Email
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "compose" | "preview" | "document")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="compose" className="gap-2">
                <FileText className="h-4 w-4" />
                Redactar
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Vista Previa
              </TabsTrigger>
              <TabsTrigger value="document" className="gap-2">
                <Paperclip className="h-4 w-4" />
                Documento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="flex-1 overflow-auto space-y-4 mt-4">
              <div className="space-y-4">
                {/* Template Selector */}
                {availableTemplates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Plantilla de Email</Label>
                    <Select 
                      value={selectedTemplateId} 
                      onValueChange={(id) => setSelectedTemplateId(id)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {TEMPLATE_LABELS[t.template_type] || t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
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
                  <Label htmlFor="email-cc">CC (opcional)</Label>
                  <Input
                    id="email-cc"
                    type="email"
                    value={formData.cc}
                    onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                    placeholder="contacto@email.com"
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

                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Documento adjunto: <span className="font-medium text-foreground">{documentNumber}.html</span>
                    <span className="text-xs ml-2">(imprimible como PDF)</span>
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Para:</span> {formData.to}</p>
                    {formData.cc && (
                      <p><span className="text-muted-foreground">CC:</span> {formData.cc}</p>
                    )}
                    <p><span className="text-muted-foreground">Asunto:</span> {formData.subject}</p>
                  </div>
                </div>
                
                <div className="border rounded-lg p-6 bg-background min-h-[200px]">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.html.replace(/\n/g, '<br/>') }}
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{documentNumber}.html</p>
                    <p className="text-xs text-muted-foreground">
                      El documento se adjuntará automáticamente al email
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="document" className="flex-1 overflow-auto mt-4">
              {pdfHtml ? (
                <div className="border rounded-lg overflow-hidden h-[500px]">
                  <iframe
                    srcDoc={pdfHtml}
                    className="w-full h-full bg-white"
                    title="Vista previa del documento"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted/20">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay vista previa disponible</p>
                    <p className="text-sm text-muted-foreground">El documento se generará al enviar</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendClick}
              disabled={sendEmail.isPending || !formData.to}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>¿Estás seguro de que deseas enviar este email?</p>
              <div className="bg-muted rounded-lg p-3 mt-2 text-sm">
                <p><span className="text-muted-foreground">Para:</span> {formData.to}</p>
                {formData.cc && <p><span className="text-muted-foreground">CC:</span> {formData.cc}</p>}
                <p><span className="text-muted-foreground">Asunto:</span> {formData.subject}</p>
                <p><span className="text-muted-foreground">Documento:</span> {documentNumber}.html</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSend}
              disabled={sendEmail.isPending}
            >
              {sendEmail.isPending ? "Enviando..." : "Confirmar y Enviar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
