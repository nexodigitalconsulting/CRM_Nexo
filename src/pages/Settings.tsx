import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Mail,
  Bell,
  Database,
  Users,
  Shield,
  FileText,
  Boxes,
} from "lucide-react";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { NotificationRulesSettings } from "@/components/settings/NotificationRulesSettings";
import { PdfSettingsManager } from "@/components/settings/PdfSettingsManager";
import { EntityConfigManager } from "@/components/settings/EntityConfigManager";

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Configuración de Base de Datos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    La base de datos está gestionada por Supabase. Las migraciones
                    y configuraciones avanzadas se realizan desde el panel de Supabase.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>URL del proyecto</Label>
                  <Input
                    value="https://honfwrfkiukckyoelsdm.supabase.co"
                    readOnly
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      "https://supabase.com/dashboard/project/honfwrfkiukckyoelsdm",
                      "_blank"
                    )
                  }
                >
                  Abrir Panel de Supabase
                </Button>
              </CardContent>
            </Card>
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
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    window.open(
                      "https://supabase.com/dashboard/project/honfwrfkiukckyoelsdm/auth/users",
                      "_blank"
                    )
                  }
                >
                  Gestionar Usuarios
                </Button>
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
        </Tabs>
      </div>
    </div>
  );
}
