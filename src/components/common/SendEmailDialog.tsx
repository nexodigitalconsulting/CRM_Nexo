import { useState, useEffect, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Eye, FileText, Paperclip } from "lucide-react";
import { useSendEmail, useEmailTemplates, useEmailSettings } from "@/hooks/useEmailSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  pdfPreviewHtml?: string;
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

const ENTITY_PREFIX_MAP: Record<string, string> = {
  invoice: "FF",
  contract: "CN",
  quote: "PP",
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
  pdfPreviewHtml,
}: SendEmailDialogProps) {
  const { data: emailSettings } = useEmailSettings();
  const { data: templates } = useEmailTemplates();
  const { data: companySettings } = useCompanySettings();
  const sendEmail = useSendEmail();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  
  const template = templates?.find(t => t.template_type === TEMPLATE_TYPE_MAP[entityType]);
  
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
      .replace(/{{days}}/g, "");
  };

  const defaultSubject = template 
    ? replaceVariables(template.subject) 
    : `${ENTITY_NAME_MAP[entityType]} ${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}`;
  
  const defaultBody = template 
    ? replaceVariables(template.body_html)
    : `Estimado/a ${clientName},\n\nAdjunto encontrará el documento ${ENTITY_NAME_MAP[entityType]} ${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}.\n\nSaludos cordiales,\n${companySettings?.name || "La Empresa"}`;

  const [formData, setFormData] = useState({
    to: clientEmail || contactEmail || "",
    cc: contactEmail && clientEmail && contactEmail !== clientEmail ? contactEmail : "",
    subject: defaultSubject,
    html: defaultBody,
  });

  // Update form when template loads or dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        to: clientEmail || contactEmail || "",
        cc: contactEmail && clientEmail && contactEmail !== clientEmail ? contactEmail : "",
        subject: defaultSubject,
        html: defaultBody,
      });
    }
  }, [open, clientEmail, contactEmail, defaultSubject, defaultBody]);

  const handleSendClick = () => {
    if (!formData.to) {
      toast.error("El cliente no tiene email configurado");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = () => {
    sendEmail.mutate({
      to: formData.to,
      subject: formData.subject,
      html: formData.html,
      entityType,
      entityId,
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

  const documentNumber = `${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar {ENTITY_NAME_MAP[entityType]} por Email
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "compose" | "preview")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose" className="gap-2">
                <FileText className="h-4 w-4" />
                Redactar
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Vista Previa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="flex-1 overflow-auto space-y-4 mt-4">
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

                {formData.cc && (
                  <div className="space-y-2">
                    <Label htmlFor="email-cc">CC (Contacto)</Label>
                    <Input
                      id="email-cc"
                      type="email"
                      value={formData.cc}
                      onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                    />
                  </div>
                )}
                
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
                    Documento adjunto: <span className="font-medium text-foreground">{documentNumber}.pdf</span>
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
                    <p className="text-sm font-medium">{documentNumber}.pdf</p>
                    <p className="text-xs text-muted-foreground">
                      El documento se adjuntará automáticamente al email
                    </p>
                  </div>
                </div>
              </div>
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
                <p><span className="text-muted-foreground">Documento:</span> {documentNumber}.pdf</p>
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