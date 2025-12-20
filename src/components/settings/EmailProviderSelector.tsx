import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEmailSettings } from '@/hooks/useEmailSettings';

interface EmailProviderSelectorProps {
  onProviderChange: (provider: 'smtp' | 'gmail' | 'outlook') => void;
  currentProvider: string;
}

export function EmailProviderSelector({ onProviderChange, currentProvider }: EmailProviderSelectorProps) {
  const { data: emailSettings } = useEmailSettings();

  const smtpConfigured = emailSettings && emailSettings.smtp_host && emailSettings.smtp_user;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Proveedor de Correo
          </CardTitle>
          <CardDescription>
            Selecciona el método de envío de correos. Solo un proveedor puede estar activo a la vez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={currentProvider}
            onValueChange={(value) => onProviderChange(value as 'smtp' | 'gmail' | 'outlook')}
            className="space-y-4"
          >
            {/* SMTP */}
            <div className={`relative flex items-start space-x-4 rounded-lg border p-4 transition-colors ${currentProvider === 'smtp' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem value="smtp" id="smtp" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="smtp" className="font-medium cursor-pointer">
                    <Server className="h-4 w-4 inline mr-2" />
                    SMTP Personalizado
                  </Label>
                  {smtpConfigured ? (
                    <Badge variant="default" className="bg-green-500 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      No configurado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Usa tu propio servidor SMTP (Gmail SMTP, SendGrid, etc.)
                </p>
                {smtpConfigured && (
                  <p className="text-xs text-muted-foreground">
                    Servidor: {emailSettings?.smtp_host}:{emailSettings?.smtp_port}
                  </p>
                )}
              </div>
            </div>

            {/* Gmail OAuth - Próximamente */}
            <div className="relative flex items-start space-x-4 rounded-lg border border-dashed p-4 opacity-60">
              <RadioGroupItem value="gmail" id="gmail" className="mt-1" disabled />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="gmail" className="font-medium cursor-not-allowed">
                    <svg className="h-4 w-4 inline mr-2" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M5.27 10.5L1 8.4V18.5C1 19.33 1.67 20 2.5 20H21.5C22.33 20 23 19.33 23 18.5V8.4L18.73 10.5L12 14.5L5.27 10.5Z"/>
                      <path fill="#34A853" d="M23 6.5V8.4L18.73 10.5L12 14.5V21L21.5 21C22.33 21 23 20.33 23 19.5V6.5Z"/>
                      <path fill="#4285F4" d="M12 14.5L5.27 10.5L1 8.4V6.5C1 5.67 1.67 5 2.5 5H21.5C22.33 5 23 5.67 23 6.5V8.4L18.73 10.5L12 14.5Z"/>
                      <path fill="#FBBC05" d="M1 8.4V19.5C1 20.33 1.67 21 2.5 21H12V14.5L5.27 10.5L1 8.4Z"/>
                    </svg>
                    Gmail (OAuth2)
                  </Label>
                  <Badge variant="outline">Próximamente</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Conexión directa con OAuth2 (requiere verificación de Google)
                </p>
                <p className="text-xs text-muted-foreground">
                  💡 Usa SMTP con App Password de Gmail como alternativa
                </p>
              </div>
            </div>

            {/* Outlook (futuro) */}
            <div className="relative flex items-start space-x-4 rounded-lg border border-dashed p-4 opacity-60">
              <RadioGroupItem value="outlook" id="outlook" className="mt-1" disabled />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="outlook" className="font-medium cursor-not-allowed">
                    <svg className="h-4 w-4 inline mr-2" viewBox="0 0 24 24">
                      <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.354.228-.587.228h-8.55v-7.478h2.463l.34-2.938h-2.803V6.49c0-.425.117-.756.35-.993.233-.237.58-.356 1.04-.356h1.46V2.45c-.503-.073-1.248-.11-2.235-.11-1.134 0-2.04.322-2.72.966-.68.644-1.02 1.55-1.02 2.72v1.93H8.95v2.938h2.55v7.478H.825c-.233 0-.43-.076-.587-.228-.158-.152-.238-.347-.238-.576V7.387c0-.23.08-.425.238-.577.158-.152.354-.228.587-.228H23.175c.233 0 .43.076.587.228.158.152.238.347.238.577z"/>
                    </svg>
                    Microsoft Outlook
                  </Label>
                  <Badge variant="outline">Próximamente</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Integración con Microsoft 365 y Outlook.com
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
