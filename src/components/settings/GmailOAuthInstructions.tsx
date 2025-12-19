import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Copy, CheckCircle2, Info } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SUPABASE_URL } from '@/integrations/supabase/client';

interface GmailOAuthInstructionsProps {
  /** Permite sobreescribir la URL (útil en tests o casos especiales) */
  callbackUrl?: string;
  onClose?: () => void;
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

export function GmailOAuthInstructions({ callbackUrl, onClose }: GmailOAuthInstructionsProps) {
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
            Este error indica que falta configuración en Google Cloud Console.
            <strong className="block mt-1">Sigue TODOS los pasos a continuación.</strong>
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
              Copia y pega EXACTAMENTE estas URLs en "URIs de redirección autorizados" de tu cliente OAuth:
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
              <li>Guarda los cambios</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Configura la pantalla de consentimiento</h4>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>Estado "Testing":</strong> Añade tu email en "Test users"</li>
              <li><strong>Estado "Production":</strong> Cualquier usuario puede acceder</li>
              <li>Verifica que los scopes incluyan: <code className="bg-muted px-1 rounded">gmail.send</code>, <code className="bg-muted px-1 rounded">userinfo.email</code></li>
            </ul>
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
            <h4 className="font-medium">4. Habilita las APIs necesarias</h4>
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
            <h4 className="font-medium">5. Verifica los secretos en Supabase</h4>
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
