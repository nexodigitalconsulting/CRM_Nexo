import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Server, Lock, Save, TestTube, FileSignature } from "lucide-react";
import { useEmailSettings, useUpdateEmailSettings, useTestEmailConnection } from "@/hooks/useEmailSettings";
import { toast } from "sonner";

export function EmailSettings() {
  const { data: settings, isLoading } = useEmailSettings();
  const updateSettings = useUpdateEmailSettings();
  const testConnection = useTestEmailConnection();
  
  const [formData, setFormData] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_secure: true,
    from_email: "",
    from_name: "",
    is_active: false,
    signature_html: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        smtp_host: settings.smtp_host || "",
        smtp_port: settings.smtp_port || 587,
        smtp_user: settings.smtp_user || "",
        smtp_password: settings.smtp_password || "",
        smtp_secure: settings.smtp_secure ?? true,
        from_email: settings.from_email || "",
        from_name: settings.from_name || "",
        is_active: settings.is_active ?? false,
        signature_html: settings.signature_html || "",
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  const handleTest = () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_password || !formData.from_email) {
      toast.error("Completa todos los campos de configuración SMTP antes de probar");
      return;
    }
    
    updateSettings.mutate(formData, {
      onSuccess: () => {
        testConnection.mutate();
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuración SMTP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Activar envío de emails</p>
              <p className="text-sm text-muted-foreground">
                Habilita el envío de correos desde el CRM
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">Servidor SMTP</Label>
              <Input
                id="smtp_host"
                placeholder="smtp.gmail.com"
                value={formData.smtp_host}
                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Gmail: smtp.gmail.com | Outlook: smtp-mail.outlook.com
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">Puerto</Label>
              <Input
                id="smtp_port"
                type="number"
                placeholder="587"
                value={formData.smtp_port}
                onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                TLS: 587 | SSL: 465
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_user">Usuario SMTP</Label>
              <Input
                id="smtp_user"
                placeholder="tu@email.com"
                value={formData.smtp_user}
                onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_password">Contraseña / App Password</Label>
              <Input
                id="smtp_password"
                type="password"
                placeholder="••••••••"
                value={formData.smtp_password}
                onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Para Gmail usa una contraseña de aplicación
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Conexión segura (TLS/SSL)</p>
              <p className="text-sm text-muted-foreground">
                Usar encriptación para la conexión
              </p>
            </div>
            <Switch
              checked={formData.smtp_secure}
              onCheckedChange={(checked) => setFormData({ ...formData, smtp_secure: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Remitente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="from_email">Email de envío</Label>
              <Input
                id="from_email"
                placeholder="info@tuempresa.com"
                value={formData.from_email}
                onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_name">Nombre del remitente</Label>
              <Input
                id="from_name"
                placeholder="Tu Empresa"
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Firma de Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta firma HTML se añadirá automáticamente al final de cada email enviado.
          </p>
          <div className="space-y-2">
            <Label htmlFor="signature_html">Firma HTML</Label>
            <Textarea
              id="signature_html"
              placeholder={`<div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
  <p style="margin: 0; font-weight: 600;">Tu Nombre</p>
  <p style="margin: 0; color: #6b7280; font-size: 14px;">Tu Empresa</p>
  <p style="margin: 0; color: #6b7280; font-size: 14px;">+34 600 000 000</p>
</div>`}
              value={formData.signature_html}
              onChange={(e) => setFormData({ ...formData, signature_html: e.target.value })}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          {formData.signature_html && (
            <div className="space-y-2">
              <Label>Vista previa</Label>
              <div 
                className="p-4 border rounded-lg bg-white"
                dangerouslySetInnerHTML={{ __html: formData.signature_html }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testConnection.isPending || !formData.smtp_host}
          className="gap-2"
        >
          <TestTube className="h-4 w-4" />
          {testConnection.isPending ? "Probando..." : "Probar Conexión"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
}
