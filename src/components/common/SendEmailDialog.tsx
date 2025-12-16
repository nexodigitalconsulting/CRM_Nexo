import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, Eye, FileText, Paperclip, Loader2 } from "lucide-react";
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
  entityData?: Record<string, unknown>;
  pdfHtml?: string;
  isLoadingDocument?: boolean;
  onSendSuccess?: () => void;
}

const TEMPLATE_TYPES_BY_ENTITY: Record<string, string[]> = {
  invoice: ["invoice_send", "invoice_due_reminder", "invoice_overdue"],
  contract: ["contract_send", "contract_pending", "contract_expiring"],
  quote: ["quote_send", "quote_followup"],
};

const ENTITY_NAME_MAP: Record<string, string> = { invoice: "Factura", contract: "Contrato", quote: "Presupuesto" };
const ENTITY_PREFIX_MAP: Record<string, string> = { invoice: "FF", contract: "CN", quote: "PP" };
const TEMPLATE_LABELS: Record<string, string> = {
  invoice_send: "Envío de Factura", invoice_due_reminder: "Recordatorio Vencimiento", invoice_overdue: "Factura Vencida",
  contract_send: "Envío de Contrato", contract_pending: "Contrato Pendiente", contract_expiring: "Renovación Contrato",
  quote_send: "Envío de Presupuesto", quote_followup: "Seguimiento Presupuesto",
};

type TabType = "compose" | "preview" | "document";

export function SendEmailDialog({ open, onOpenChange, entityType, entityId, entityNumber, clientName, clientEmail, contactEmail, total, dueDate, pdfHtml, isLoadingDocument, onSendSuccess }: SendEmailDialogProps) {
  const { data: emailSettings } = useEmailSettings();
  const { data: templates } = useEmailTemplates();
  const { data: companySettings } = useCompanySettings();
  const sendEmail = useSendEmail();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("compose");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formData, setFormData] = useState({ to: "", cc: "", subject: "", html: "" });
  
  const availableTemplates = templates?.filter(t => TEMPLATE_TYPES_BY_ENTITY[entityType]?.includes(t.template_type)) || [];
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId) || availableTemplates[0];
  
  const replaceVariables = (text: string) => text
    .replace(/{{client_name}}/g, clientName)
    .replace(/{{company_name}}/g, companySettings?.name || "La Empresa")
    .replace(/{{invoice_number}}/g, `${ENTITY_PREFIX_MAP.invoice}-${String(entityNumber).padStart(4, "0")}`)
    .replace(/{{contract_number}}/g, `${ENTITY_PREFIX_MAP.contract}-${String(entityNumber).padStart(4, "0")}`)
    .replace(/{{quote_number}}/g, `${ENTITY_PREFIX_MAP.quote}-${String(entityNumber).padStart(4, "0")}`)
    .replace(/{{total}}/g, total ? `${total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}` : "")
    .replace(/{{due_date}}/g, dueDate || "").replace(/{{end_date}}/g, dueDate || "").replace(/{{valid_until}}/g, dueDate || "")
    .replace(/{{start_date}}/g, dueDate || "").replace(/{{days}}/g, "");

  const getDefaultContent = (template?: EmailTemplate) => {
    if (template) return { subject: replaceVariables(template.subject), html: replaceVariables(template.body_html) };
    return {
      subject: `${ENTITY_NAME_MAP[entityType]} ${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}`,
      html: `Estimado/a ${clientName},\n\nAdjunto encontrará el documento ${ENTITY_NAME_MAP[entityType]} ${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}.\n\nSaludos cordiales,\n${companySettings?.name || "La Empresa"}`,
    };
  };

  useEffect(() => {
    if (open) {
      setActiveTab("compose");
      const defaultTemplate = availableTemplates[0];
      if (defaultTemplate && !selectedTemplateId) setSelectedTemplateId(defaultTemplate.id);
      const template = templates?.find(t => t.id === selectedTemplateId) || defaultTemplate;
      const content = getDefaultContent(template);
      setFormData({ to: clientEmail || contactEmail || "", cc: contactEmail && clientEmail && contactEmail !== clientEmail ? contactEmail : "", subject: content.subject, html: content.html });
    }
  }, [open]);

  useEffect(() => {
    if (open && selectedTemplateId && selectedTemplate) {
      const content = getDefaultContent(selectedTemplate);
      setFormData(prev => ({ ...prev, subject: content.subject, html: content.html }));
    }
  }, [selectedTemplateId]);

  const handleSendClick = () => { if (!formData.to) { toast.error("El cliente no tiene email configurado"); return; } setShowConfirmDialog(true); };
  const documentNumber = `${ENTITY_PREFIX_MAP[entityType]}-${String(entityNumber).padStart(4, "0")}`;

  const handleConfirmSend = () => {
    sendEmail.mutate({ to: formData.to, cc: formData.cc || undefined, subject: formData.subject, html: formData.html, entityType, entityId, attachPdf: !!pdfHtml, pdfHtml, pdfFilename: `${documentNumber}.html` }, {
      onSuccess: () => { setShowConfirmDialog(false); onOpenChange(false); toast.success(`${ENTITY_NAME_MAP[entityType]} enviado correctamente`); onSendSuccess?.(); },
      onError: (error) => { setShowConfirmDialog(false); toast.error(`Error al enviar: ${error.message}`); },
    });
  };

  if (!emailSettings?.is_active) {
    return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Enviar por Email</DialogTitle></DialogHeader><div className="py-6 text-center"><p className="text-muted-foreground mb-4">El envío de emails no está configurado.</p><p className="text-sm">Ve a <span className="font-medium">Configuración → Correo</span> para configurar SMTP.</p></div></DialogContent></Dialog>);
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "compose": return (<div className="space-y-4">{availableTemplates.length > 0 && (<div className="space-y-2"><Label>Plantilla de Email</Label><Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}><SelectTrigger><SelectValue placeholder="Seleccionar plantilla" /></SelectTrigger><SelectContent>{availableTemplates.map((t) => (<SelectItem key={t.id} value={t.id}>{TEMPLATE_LABELS[t.template_type] || t.name}</SelectItem>))}</SelectContent></Select></div>)}<div className="space-y-2"><Label>Destinatario</Label><Input type="email" value={formData.to} onChange={(e) => setFormData({ ...formData, to: e.target.value })} placeholder="cliente@email.com" /></div><div className="space-y-2"><Label>CC (opcional)</Label><Input type="email" value={formData.cc} onChange={(e) => setFormData({ ...formData, cc: e.target.value })} placeholder="contacto@email.com" /></div><div className="space-y-2"><Label>Asunto</Label><Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} /></div><div className="space-y-2"><Label>Contenido</Label><Textarea rows={8} value={formData.html} onChange={(e) => setFormData({ ...formData, html: e.target.value })} /></div><div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border"><Paperclip className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Documento: <span className="font-medium text-foreground">{documentNumber}.html</span><span className="text-xs ml-2">(imprimir como PDF)</span></span></div></div>);
      case "preview": return (<div className="space-y-4"><div className="bg-muted/30 rounded-lg p-4 border"><div className="space-y-2 text-sm"><p><span className="text-muted-foreground">Para:</span> {formData.to}</p>{formData.cc && <p><span className="text-muted-foreground">CC:</span> {formData.cc}</p>}<p><span className="text-muted-foreground">Asunto:</span> {formData.subject}</p></div></div><div className="border rounded-lg p-6 bg-background min-h-[200px]"><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.html.replace(/\n/g, '<br/>') }} /></div><div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20"><FileText className="h-5 w-5 text-primary" /><div><p className="text-sm font-medium">{documentNumber}.html</p><p className="text-xs text-muted-foreground">Se adjuntará al email</p></div></div></div>);
      case "document": if (isLoadingDocument) return (<div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/20"><div className="text-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Cargando...</p></div></div>); if (pdfHtml) return (<div className="border rounded-lg overflow-hidden h-[400px]"><iframe srcDoc={pdfHtml} className="w-full h-full bg-white" title="Vista previa" /></div>); return (<div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted/20"><div className="text-center"><FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No hay vista previa</p></div></div>);
    }
  };

  return (<><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Enviar {ENTITY_NAME_MAP[entityType]} por Email</DialogTitle></DialogHeader><div className="space-y-4"><div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-lg"><button type="button" onClick={() => setActiveTab("compose")} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "compose" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><FileText className="h-4 w-4" />Redactar</button><button type="button" onClick={() => setActiveTab("preview")} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Eye className="h-4 w-4" />Vista Previa</button><button type="button" onClick={() => setActiveTab("document")} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "document" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Paperclip className="h-4 w-4" />Documento</button></div><div className="max-h-[60vh] overflow-y-auto">{renderTabContent()}</div></div><div className="flex justify-end gap-2 pt-4 border-t"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSendClick} disabled={sendEmail.isPending || !formData.to} className="gap-2"><Send className="h-4 w-4" />Enviar</Button></div></DialogContent></Dialog><AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar envío</AlertDialogTitle><AlertDialogDescription asChild><div className="space-y-2"><p>¿Enviar este email?</p><div className="bg-muted rounded-lg p-3 mt-2 text-sm"><p><span className="text-muted-foreground">Para:</span> {formData.to}</p>{formData.cc && <p><span className="text-muted-foreground">CC:</span> {formData.cc}</p>}<p><span className="text-muted-foreground">Asunto:</span> {formData.subject}</p></div></div></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleConfirmSend} disabled={sendEmail.isPending}>{sendEmail.isPending ? "Enviando..." : "Enviar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>);
}
