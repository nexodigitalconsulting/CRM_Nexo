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
  Save,
} from "lucide-react";
import { TemplateManager } from "@/components/settings/TemplateManager";

export default function Settings() {
  return (
    <div className="animate-fade-in">
      <Header title="Configuración" subtitle="Ajustes del sistema" />

      <div className="p-6">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
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
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Plantillas
            </TabsTrigger>

          <TabsContent value="company" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-6">
                Información de la Empresa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input id="companyName" placeholder="Tu Empresa SL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cif">CIF/NIF</Label>
                  <Input id="cif" placeholder="B12345678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@tuempresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" placeholder="+34 912 345 678" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" placeholder="Calle Ejemplo, 123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" placeholder="Madrid" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input id="postalCode" placeholder="28001" />
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-6">
                Configuración Regional
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select defaultValue="es">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Zona Horaria</Label>
                  <Select defaultValue="europe-madrid">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="europe-madrid">
                        Europe/Madrid (UTC+1)
                      </SelectItem>
                      <SelectItem value="europe-london">
                        Europe/London (UTC+0)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select defaultValue="eur">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eur">Euro (€)</SelectItem>
                      <SelectItem value="usd">US Dollar ($)</SelectItem>
                      <SelectItem value="gbp">British Pound (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato de Fecha</Label>
                  <Select defaultValue="dd-mm-yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="gap-2">
                <Save className="h-4 w-4" />
                Guardar Cambios
              </Button>
            </div>
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

          <TabsContent value="notifications" className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-6">
                Preferencias de Notificaciones
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Nuevos contactos</p>
                    <p className="text-sm text-muted-foreground">
                      Notificar cuando se añada un nuevo contacto
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Presupuestos aprobados</p>
                    <p className="text-sm text-muted-foreground">
                      Notificar cuando un presupuesto sea aprobado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Facturas vencidas</p>
                    <p className="text-sm text-muted-foreground">
                      Alertas de facturas próximas a vencer
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Contratos por renovar</p>
                    <p className="text-sm text-muted-foreground">
                      Recordatorios de contratos próximos a vencer
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <TemplateManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
  );
}
