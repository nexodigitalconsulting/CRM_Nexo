import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Server, CheckCircle2, AlertCircle, ExternalLink, HelpCircle } from 'lucide-react';
import { useGmailConfig } from '@/hooks/useEmailLogs';
import { useEmailSettings } from '@/hooks/useEmailSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GmailOAuthInstructions } from './GmailOAuthInstructions';

interface EmailProviderSelectorProps {
  onProviderChange: (provider: 'smtp' | 'gmail' | 'outlook') => void;
  currentProvider: string;
}

const CALLBACK_URL = 'https://honfwrfkiukckyoelsdm.supabase.co/functions/v1/gmail-oauth-callback';

export function EmailProviderSelector({ onProviderChange, currentProvider }: EmailProviderSelectorProps) {
  const { data: gmailConfig, refetch: refetchGmail } = useGmailConfig();
  const { data: emailSettings } = useEmailSettings();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const smtpConfigured = emailSettings && emailSettings.smtp_host && emailSettings.smtp_user;
  const gmailConnected = gmailConfig && gmailConfig.refresh_token && gmailConfig.email_address;

  const handleGmailConnect = async () => {
    setIsConnecting(true);
    setLastError(null);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-oauth-auth', {
        body: { action: 'get_auth_url' }
      });

      if (error) {
        console.error('[Gmail OAuth] Error getting auth URL:', error);
        if (error.message?.includes('Google OAuth credentials not configured')) {
          setLastError('Las credenciales de Google OAuth no están configuradas en Supabase.');
          setShowInstructions(true);
        }
        throw error;
      }
      
      if (data?.authUrl) {
        console.log('[Gmail OAuth] Redirecting to:', data.authUrl);
        // Redirect to Google OAuth - will callback to gmail-oauth-callback
        window.location.href = data.authUrl;
      } else {
        throw new Error('No se recibió URL de autenticación');
      }
    } catch (error: any) {
      console.error('Error connecting Gmail:', error);
      toast.error(error.message || 'Error al conectar con Gmail');
      setIsConnecting(false);
    }
  };

  const handleGmailDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('gmail_config')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      
      toast.success('Gmail desconectado');
      refetchGmail();
      if (currentProvider === 'gmail') {
        onProviderChange('smtp');
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast.error('Error al desconectar Gmail');
    }
  };

  return (
    <div className="space-y-4">
      {showInstructions && (
        <GmailOAuthInstructions 
          callbackUrl={CALLBACK_URL} 
          onClose={() => setShowInstructions(false)} 
        />
      )}

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

            {/* Gmail OAuth */}
            <div className={`relative flex items-start space-x-4 rounded-lg border p-4 transition-colors ${currentProvider === 'gmail' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem 
                value="gmail" 
                id="gmail" 
                className="mt-1"
                disabled={!gmailConnected}
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="gmail" className="font-medium cursor-pointer">
                    <svg className="h-4 w-4 inline mr-2" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M5.27 10.5L1 8.4V18.5C1 19.33 1.67 20 2.5 20H21.5C22.33 20 23 19.33 23 18.5V8.4L18.73 10.5L12 14.5L5.27 10.5Z"/>
                      <path fill="#34A853" d="M23 6.5V8.4L18.73 10.5L12 14.5V21L21.5 21C22.33 21 23 20.33 23 19.5V6.5Z"/>
                      <path fill="#4285F4" d="M12 14.5L5.27 10.5L1 8.4V6.5C1 5.67 1.67 5 2.5 5H21.5C22.33 5 23 5.67 23 6.5V8.4L18.73 10.5L12 14.5Z"/>
                      <path fill="#FBBC05" d="M1 8.4V19.5C1 20.33 1.67 21 2.5 21H12V14.5L5.27 10.5L1 8.4Z"/>
                    </svg>
                    Gmail (OAuth2)
                  </Label>
                  {gmailConnected ? (
                    <Badge variant="default" className="bg-green-500 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      No conectado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Conecta tu cuenta de Gmail con autenticación segura OAuth2
                </p>
                {gmailConnected ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Cuenta: {gmailConfig.email_address}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive hover:text-destructive"
                      onClick={handleGmailDisconnect}
                    >
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGmailConnect}
                      disabled={isConnecting}
                      className="gap-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {isConnecting ? 'Conectando...' : 'Conectar Gmail'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="gap-1 text-muted-foreground"
                    >
                      <HelpCircle className="h-3 w-3" />
                      Ayuda
                    </Button>
                  </div>
                )}
                {lastError && (
                  <p className="text-xs text-destructive">{lastError}</p>
                )}
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
