"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Copy, CheckCircle2, Info, Shield } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

interface GmailOAuthInstructionsProps {
  /** Permite sobreescribir la URL (útil en tests o casos especiales) */
  callbackUrl?: string;
  onClose?: () => void;
  /** Muestra información de diagnóstico adicional */
  diagnosticInfo?: {
    clientIdPrefix?: string;
    lastError?: string;
  };
}

function getCallbackUrls() {
  const base = (SUPABASE_URL || '').replace(/\/$/, '');
  return {
    gmail: `${base}/functions/v1/gmail-oauth-callback`,
    calendar: `${base}/functions/v1/google-calendar-callback`,
  };
}

function getCloudProjectId(): string | null {
  try {
    const base = (SUPABASE_URL || '').replace(/\/$/, '');
    const hostname = new URL(base).hostname;
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts.slice(-2).join('.') === 'supabase.co') {
      return parts[0];
    }
  } catch {
    // ignore
  }
  return null;
}

export function GmailOAuthInstructions({ callbackUrl, onClose, diagnosticInfo }: GmailOAuthInstructionsProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const callbackUrls = getCallbackUrls();
  const gmailCallbackUrl = callbackUrl || callbackUrls.gmail;
  const calendarCallbackUrl = callbackUrls.calendar;
  const cloudProjectId = getCloudProjectId();

  const handleCopy = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success(`URL de ${label} copiada`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      toast.error('Error al copiar');
    }
  };

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Configuración de Google Cloud Console
        </CardTitle>
        <CardDescription>
          Para conectar Gmail OAuth2, debes configurar correctamente tu proyecto en Google Cloud Console.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error 403: access_denied</AlertTitle>
          <AlertDescription>
            Este error indica que Google rechaza la autenticación.
            <strong className="block mt-1">Las causas más comunes son:</strong>
            <ul className="list-disc list-inside mt-1 text-sm">
              <li>El email no está en "Test users" (si la app está en Testing)</li>
              <li>El scope <code className="bg-background px-1 rounded">gmail.send</code> no está añadido a la pantalla de consentimiento</li>
              <li>La URI de redirección no coincide EXACTAMENTE</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Alerta sobre scopes sensibles */}
        <Alert className="border-blue-500/50 bg-blue-500/5">
          <Shield className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-700">Scope sensible: gmail.send</AlertTitle>
          <AlertDescription className="text-sm">
            El scope <code className="bg-background px-1 rounded">gmail.send</code> es considerado <strong>sensible</strong> por Google.
            <ul className="list-disc list-inside mt-1">
              <li><strong>Modo Testing:</strong> Solo funciona con emails añadidos en "Test users"</li>
              <li><strong>Modo Production:</strong> Requiere verificación de Google (puede tardar semanas)</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* URLS IMPORTANTES - MUY VISIBLES */}
        <Card className="border-2 border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Info className="h-4 w-4" />
              URLs de redirección OBLIGATORIAS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Copia y pega <strong>EXACTAMENTE</strong> estas URLs en "URIs de redirección autorizados" de tu cliente OAuth:
            </p>
            
            {/* Gmail Callback */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Gmail (envío de correos):</label>
              <div className="flex items-center gap-2 bg-background p-2 rounded-md border">
                <code className="text-xs flex-1 break-all font-mono text-primary">
                  {gmailCallbackUrl}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0" 
                  onClick={() => handleCopy(gmailCallbackUrl, 'Gmail')}
                >
                  {copiedUrl === gmailCallbackUrl ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Calendar Callback */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Google Calendar (sincronización):</label>
              <div className="flex items-center gap-2 bg-background p-2 rounded-md border">
                <code className="text-xs flex-1 break-all font-mono text-primary">
                  {calendarCallbackUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleCopy(calendarCallbackUrl, 'Calendar')}
                >
                  {copiedUrl === calendarCallbackUrl ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de diagnóstico */}
        {diagnosticInfo && (diagnosticInfo.clientIdPrefix || diagnosticInfo.lastError) && (
          <Card className="border-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Información de diagnóstico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {diagnosticInfo.clientIdPrefix && (
                <p className="text-xs font-mono">
                  Client ID: <span className="text-primary">{diagnosticInfo.clientIdPrefix}...</span>
                </p>
              )}
              {diagnosticInfo.lastError && (
                <p className="text-xs text-destructive">
                  Último error: {diagnosticInfo.lastError}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Accede a las credenciales OAuth</h4>
            <p className="text-sm text-muted-foreground">
              Abre Google Cloud Console y selecciona tu proyecto.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
              Abrir Credenciales OAuth
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Edita tu cliente OAuth 2.0</h4>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Haz clic en tu cliente OAuth (tipo "Web application")</li>
              <li>En <strong>"URIs de redirección autorizados"</strong>, añade las URLs de arriba</li>
              <li>Guarda los cambios y <strong>espera 5 minutos</strong></li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Configura la pantalla de consentimiento (CRÍTICO)</h4>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Ve a "OAuth consent screen"</li>
              <li>Click en <strong>"EDIT APP"</strong></li>
              <li>En la sección <strong>"Scopes"</strong>, click en "ADD OR REMOVE SCOPES"</li>
              <li>
                Busca y añade estos scopes:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><code className="bg-muted px-1 rounded text-xs">https://www.googleapis.com/auth/gmail.send</code></li>
                  <li><code className="bg-muted px-1 rounded text-xs">https://www.googleapis.com/auth/userinfo.email</code></li>
                </ul>
              </li>
              <li>Guarda los cambios</li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open('https://console.cloud.google.com/apis/credentials/consent', '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
              Ver Pantalla de Consentimiento
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">4. Añade tu email a Test Users</h4>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>En la pantalla de consentimiento, ve a la sección <strong>"Test users"</strong></li>
              <li>Click en <strong>"+ ADD USERS"</strong></li>
              <li>Añade <strong>exactamente</strong> el email con el que vas a autenticarte</li>
              <li>Guarda los cambios</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">5. Habilita las APIs necesarias</h4>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open('https://console.cloud.google.com/apis/library/gmail.googleapis.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
                Gmail API
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open('https://console.cloud.google.com/apis/library/calendar-json.googleapis.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
                Google Calendar API
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">6. Verifica los secretos en Supabase</h4>
            <p className="text-sm text-muted-foreground">
              Asegúrate de que <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code> y{' '}
              <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code> coinciden con los de tu cliente OAuth.
            </p>
            {cloudProjectId ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  window.open(
                    `https://supabase.com/dashboard/project/${cloudProjectId}/settings/functions`,
                    '_blank'
                  )
                }
              >
                <ExternalLink className="h-3 w-3" />
                Ver Secretos de Edge Functions
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Estás en un entorno autoalojado: revisa/gestiona los secretos en la configuración de tu stack (Easypanel / variables del servicio).
              </p>
            )}
          </div>
        </div>

        {onClose && (
          <div className="pt-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>Cerrar instrucciones</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
