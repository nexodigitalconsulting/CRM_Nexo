"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Mail,
  Bell,
  Database,
  Users,
  Shield,
  FileText,
  Boxes,
  History,
  CalendarDays,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { NotificationRulesSettings } from "@/components/settings/NotificationRulesSettings";
import { PdfSettingsManager } from "@/components/settings/PdfSettingsManager";
import { EntityConfigManager } from "@/components/settings/EntityConfigManager";
import { DatabaseStatus } from "@/components/settings/DatabaseStatus";
import { EmailLogsPanel } from "@/components/settings/EmailLogsPanel";
import { toast } from "sonner";

// ── Calendar Feed Settings ────────────────────────────────────────────────────

function CalendarFeedSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  const host = typeof window !== "undefined" ? window.location.origin : "";
  const feedUrl = token ? `${host}/api/calendar/feed?token=${token}` : "";
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");

  useEffect(() => {
    fetch("/api/data/profiles/calendar-token")
      .then((r) => r.json() as Promise<{ token: string }>)
      .then((d) => setToken(d.token))
      .catch(() => toast.error("Error al cargar el token"))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async () => {
    if (!confirm("¿Rotar el token? La URL anterior dejará de funcionar y tendrás que volver a añadir el calendario en Google.")) return;
    setRotating(true);
    try {
      const r = await fetch("/api/data/profiles/calendar-token", { method: "POST" });
      const d = await r.json() as { token: string };
      setToken(d.token);
      toast.success("Token rotado. Actualiza la URL en Google Calendar.");
    } catch {
      toast.error("Error al rotar el token");
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Sincronización con Google Calendar
          </CardTitle>
          <CardDescription>
            Añade tu agenda del CRM a Google Calendar mediante una URL de suscripción. Google la actualizará automáticamente cada 6-24 horas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">1</Badge>
              <span className="font-medium text-sm">Copia tu URL personal de calendario</span>
            </div>
            <p className="text-sm text-muted-foreground pl-8">
              Esta URL es privada y única para tu cuenta. No la compartas.
            </p>
            <div className="flex gap-2 pl-8">
              <Input
                readOnly
                value={loading ? "Cargando..." : webcalUrl}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={!token || loading}
                title="Copiar URL"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">2</Badge>
              <span className="font-medium text-sm">Añádela en Google Calendar</span>
            </div>
            <div className="pl-8 space-y-2 text-sm text-muted-foreground">
              <p>En Google Calendar (escritorio):</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Haz clic en el <strong>+</strong> junto a "Otros calendarios" en el panel izquierdo</li>
                <li>Selecciona <strong>"Desde URL"</strong></li>
                <li>Pega la URL copiada y haz clic en <strong>"Añadir calendario"</strong></li>
              </ol>
              <p className="mt-2">También puedes abrir la URL directamente:</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!token}
                onClick={() => window.open(`https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(webcalUrl)}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir en Google Calendar
              </Button>
            </div>
          </div>

          {/* Step 3 info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">3</Badge>
              <span className="font-medium text-sm">Sincronización automática</span>
            </div>
            <p className="text-sm text-muted-foreground pl-8">
              Google actualizará el calendario automáticamente cada 6-24 horas. Los eventos creados, editados o borrados en el CRM se reflejarán en Google Calendar. Este feed es <strong>solo lectura</strong> — los cambios en Google no afectan al CRM.
            </p>
          </div>

          {/* Token rotation */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Rotar token de seguridad</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Si crees que la URL ha sido comprometida, genera una nueva. Tendrás que volver a añadir el calendario en Google.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                disabled={rotating || loading}
                className="gap-2 shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${rotating ? "animate-spin" : ""}`} />
                Rotar token
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compatibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Compatible con otros calendarios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            La misma URL funciona con cualquier aplicación que soporte el formato iCalendar (ICS):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["Google Calendar", "Apple Calendar", "Outlook", "Thunderbird"].map((app) => (
              <div key={app} className="text-center p-2 rounded border border-border text-xs text-muted-foreground">
                {app}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Configuración"
        subtitle="Administra las opciones del sistema"
      />

      <div className="p-6">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Correo
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Database className="h-4 w-4" />
              Base de Datos
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Seguridad
            </TabsTrigger>
            <TabsTrigger value="pdfs" className="gap-2">
              <FileText className="h-4 w-4" />
              PDFs
            </TabsTrigger>
            <TabsTrigger value="entities" className="gap-2">
              <Boxes className="h-4 w-4" />
              Entidades
            </TabsTrigger>
            <TabsTrigger value="email-logs" className="gap-2">
              <History className="h-4 w-4" />
              Logs Email
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendario
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <CompanySettings />
          </TabsContent>

          <TabsContent value="email">
            <EmailSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationRulesSettings />
          </TabsContent>

          <TabsContent value="database">
            <DatabaseStatus />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestión de Usuarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    La gestión de usuarios se realiza desde el panel de autenticación
                    de Supabase. Puedes invitar usuarios, gestionar roles y configurar
                    políticas de acceso.
                  </AlertDescription>
                </Alert>
                <div className="text-sm text-muted-foreground mt-4">
                  Self-hosted: gestiona usuarios desde tu Supabase Studio local (Auth → Users).
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configuración de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Las políticas de seguridad RLS (Row Level Security) están
                    configuradas en la base de datos. Cada tabla tiene políticas
                    que controlan el acceso según el rol del usuario.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <h4 className="font-medium">Roles disponibles:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><strong>admin</strong> - Acceso total al sistema</li>
                    <li><strong>manager</strong> - Gestión de datos y reportes</li>
                    <li><strong>user</strong> - Operaciones básicas</li>
                    <li><strong>readonly</strong> - Solo lectura</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pdfs">
            <PdfSettingsManager />
          </TabsContent>

          <TabsContent value="entities">
            <EntityConfigManager />
          </TabsContent>

          <TabsContent value="email-logs">
            <EmailLogsPanel />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarFeedSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
