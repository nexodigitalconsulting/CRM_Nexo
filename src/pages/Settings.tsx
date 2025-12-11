import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Database,
  Users,
  Shield,
  Bell,
  FileText,
  Settings2,
  Mail,
} from "lucide-react";
import { TemplateManager } from "@/components/settings/TemplateManager";
import { EntityConfigManager } from "@/components/settings/EntityConfigManager";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { EmailSettings } from "@/components/settings/EmailSettings";
import { NotificationRulesSettings } from "@/components/settings/NotificationRulesSettings";

export default function Settings() {
  return (
    <div className="animate-fade-in">
      <Header title="Configuración" subtitle="Ajustes del sistema" />

      <div className="p-6">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
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
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Plantillas
            </TabsTrigger>
            <TabsTrigger value="entities" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Entidades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-6">
            <CompanySettings />
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <EmailSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationRulesSettings />
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-6">
                Conexión a Base de Datos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Tipo de Base de Datos</Label>
                  <Select defaultValue="postgresql">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL/MariaDB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbHost">Host</Label>
                  <Input id="dbHost" placeholder="localhost" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbPort">Puerto</Label>
                  <Input id="dbPort" placeholder="5432" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbName">Nombre de Base de Datos</Label>
                  <Input id="dbName" placeholder="crm_database" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbUser">Usuario</Label>
                  <Input id="dbUser" placeholder="admin" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dbPassword">Contraseña</Label>
                  <Input id="dbPassword" type="password" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline">Probar Conexión</Button>
                <Button>Guardar Configuración</Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-6">
                Almacenamiento de Archivos
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Almacenamiento Local</p>
                    <p className="text-sm text-muted-foreground">
                      Guardar archivos en el servidor VPS
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">S3 Compatible</p>
                    <p className="text-sm text-muted-foreground">
                      Almacenamiento externo tipo Amazon S3
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Usuarios del Sistema</h3>
                <Button className="gap-2">
                  <Users className="h-4 w-4" />
                  Añadir Usuario
                </Button>
              </div>
              <div className="space-y-4">
                {[
                  {
                    name: "Admin Principal",
                    email: "admin@empresa.com",
                    role: "Administrador",
                  },
                  {
                    name: "Carlos Martínez",
                    email: "carlos@empresa.com",
                    role: "Usuario Avanzado",
                  },
                  {
                    name: "Ana Rodríguez",
                    email: "ana@empresa.com",
                    role: "Usuario Estándar",
                  },
                ].map((user) => (
                  <div
                    key={user.email}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="status-badge bg-primary/10 text-primary">
                        {user.role}
                      </span>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-6">
                Configuración de Seguridad
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">
                      Autenticación de dos factores (2FA)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Requiere verificación adicional al iniciar sesión
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Bloqueo por intentos fallidos</p>
                    <p className="text-sm text-muted-foreground">
                      Bloquea la cuenta tras 5 intentos fallidos
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Expiración de sesión</p>
                    <p className="text-sm text-muted-foreground">
                      Cierra sesión automáticamente tras inactividad
                    </p>
                  </div>
                  <Select defaultValue="8h">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 hora</SelectItem>
                      <SelectItem value="4h">4 horas</SelectItem>
                      <SelectItem value="8h">8 horas</SelectItem>
                      <SelectItem value="24h">24 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <TemplateManager />
          </TabsContent>

          <TabsContent value="entities" className="space-y-6">
            <EntityConfigManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
