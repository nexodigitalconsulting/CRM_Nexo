import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface GmailOAuthInstructionsProps {
  callbackUrl: string;
  onClose?: () => void;
}

export function GmailOAuthInstructions({ callbackUrl, onClose }: GmailOAuthInstructionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopied(true);
      toast.success('URL copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
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
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error 403: access_denied</AlertTitle>
          <AlertDescription>
            Este error indica que la configuración de OAuth en Google Cloud Console no es correcta.
            Sigue los pasos a continuación para solucionarlo.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Accede a Google Cloud Console</h4>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
              Abrir Google Cloud Console
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Configura la URI de redirección autorizada</h4>
            <p className="text-sm text-muted-foreground">
              En tu cliente OAuth 2.0, añade la siguiente URL en "URIs de redirección autorizados":
            </p>
            <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
              <code className="text-xs flex-1 break-all">{callbackUrl}</code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Configura la pantalla de consentimiento OAuth</h4>
            <p className="text-sm text-muted-foreground">
              En "Pantalla de consentimiento OAuth":
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Si la app está en "Testing", añade tu email como usuario de prueba</li>
              <li>O bien, publica la app para producción</li>
              <li>Asegúrate de que los scopes incluyan "Gmail Send" y "User Info"</li>
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
            <h4 className="font-medium">4. Habilita la API de Gmail</h4>
            <p className="text-sm text-muted-foreground">
              Asegúrate de que la API de Gmail esté habilitada en tu proyecto.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open('https://console.cloud.google.com/apis/library/gmail.googleapis.com', '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
              Ver API de Gmail
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">5. Verifica las credenciales</h4>
            <p className="text-sm text-muted-foreground">
              Asegúrate de que <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code> y{' '}
              <code className="bg-muted px-1 rounded">GOOGLE_CLIENT_SECRET</code> están configurados
              correctamente en los secretos de Supabase Edge Functions.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open('https://supabase.com/dashboard/project/honfwrfkiukckyoelsdm/settings/functions', '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
              Ver Secretos de Edge Functions
            </Button>
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
