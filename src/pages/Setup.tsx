import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, Database, Loader2, UserPlus, AlertCircle, Rocket, 
  Server, Cloud, Download, Eye, EyeOff 
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type SetupStep = "postgres" | "supabase" | "schema" | "admin" | "complete";

interface StepStatus {
  postgres: "pending" | "running" | "success" | "error";
  supabase: "pending" | "running" | "success" | "error";
  schema: "pending" | "running" | "success" | "error";
  admin: "pending" | "running" | "success" | "error";
}

interface PostgresConfig {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
}

export default function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SetupStep>("postgres");
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    postgres: "pending",
    supabase: "pending",
    schema: "pending",
    admin: "pending",
  });

  // Postgres config
  const [postgresConfig, setPostgresConfig] = useState<PostgresConfig>({
    host: "",
    port: "5432",
    database: "crm",
    user: "postgres",
    password: "",
  });
  const [showPostgresPassword, setShowPostgresPassword] = useState(false);
  const [setupProxyUrl, setSetupProxyUrl] = useState("");

  // Admin
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // Exportar logs
  const exportLogs = () => {
    const content = logs.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-setup-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper para llamar al backend de setup
  const callSetupBackend = async (payload: any) => {
    // Si se ha configurado un proxy HTTP local, lo usamos
    if (setupProxyUrl.trim()) {
      const response = await fetch(setupProxyUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error HTTP ${response.status}`);
      }

      return await response.json();
    }

    // Fallback: usar Edge Function existente de Supabase
    const { data, error } = await supabase.functions.invoke("setup-database", {
      body: payload,
    });

    if (error) throw new Error(error.message);
    return data;
  };

  // Test Postgres connection
  const testPostgres = async () => {
    setIsLoading(true);
    setStepStatus(prev => ({ ...prev, postgres: "running" }));
    setErrorMessage(null);
    addLog("Probando conexión a PostgreSQL...");

    try {
      const data = await callSetupBackend({
        action: "test-postgres",
        postgres: postgresConfig,
      });

      if (data?.success) {
        data.logs?.forEach((l: string) => addLog(l));
        setStepStatus(prev => ({ ...prev, postgres: "success" }));
        toast.success("Conexión a PostgreSQL exitosa");
        setCurrentStep("supabase");
      } else {
        throw new Error(data?.error || "Error de conexión");
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStepStatus(prev => ({ ...prev, postgres: "error" }));
      setErrorMessage(error.message);
      toast.error("Error conectando a PostgreSQL");
    } finally {
      setIsLoading(false);
    }
  };

  // Test Supabase connection
  const testSupabase = async () => {
    setIsLoading(true);
    setStepStatus(prev => ({ ...prev, supabase: "running" }));
    setErrorMessage(null);
    addLog("Verificando conexión a Supabase...");

    try {
      addLog("Realizando consulta de prueba a Supabase (tabla company_settings)...");

      const { error } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1);

      if (error) throw error;

      addLog("✓ Supabase responde correctamente a las consultas.");
      setStepStatus(prev => ({ ...prev, supabase: "success" }));
      toast.success("Conexión a Supabase exitosa");
      setCurrentStep("schema");
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStepStatus(prev => ({ ...prev, supabase: "error" }));
      setErrorMessage(error.message);
      toast.error("Error conectando a Supabase");
    } finally {
      setIsLoading(false);
    }
  };

  // Create schema
  const createSchema = async () => {
    setIsLoading(true);
    setStepStatus(prev => ({ ...prev, schema: "running" }));
    setErrorMessage(null);
    addLog("Creando tablas del CRM...");

    try {
      const data = await callSetupBackend({
        action: "create-schema",
        postgres: postgresConfig,
      });

      if (data?.success) {
        data.logs?.forEach((l: string) => addLog(l));
        setStepStatus(prev => ({ ...prev, schema: "success" }));
        toast.success("Schema creado correctamente");
        setCurrentStep("admin");
      } else {
        throw new Error(data?.error || "Error creando schema");
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStepStatus(prev => ({ ...prev, schema: "error" }));
      setErrorMessage(error.message);
      toast.error("Error creando schema");
    } finally {
      setIsLoading(false);
    }
  };

  // Create admin
  const createAdmin = async () => {
    if (!adminEmail || !adminPassword) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }
    if (adminPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);
    setStepStatus(prev => ({ ...prev, admin: "running" }));
    setErrorMessage(null);
    addLog("Creando usuario administrador...");

    try {
      // Registrar en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: { data: { full_name: adminName || "Administrador" } },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      addLog(`✓ Usuario creado en Supabase Auth: ${authData.user.id.slice(0, 8)}...`);

      // Crear profile y role en Postgres externo mediante proxy o Edge Function
      const data = await callSetupBackend({
        action: "create-admin",
        userId: authData.user.id,
        email: adminEmail,
        fullName: adminName || "Administrador",
        postgres: postgresConfig,
      });

      if (!data?.success) throw new Error(data?.error || "Error configurando admin");

      data.logs?.forEach((l: string) => addLog(l));
      setStepStatus(prev => ({ ...prev, admin: "success" }));
      toast.success("¡Administrador creado correctamente!");
      setCurrentStep("complete");
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStepStatus(prev => ({ ...prev, admin: "error" }));
      setErrorMessage(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIcon = (status: StepStatus[keyof StepStatus]) => {
    switch (status) {
      case "success": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "running": return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "error": return <AlertCircle className="h-5 w-5 text-destructive" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  const steps = [
    { key: "postgres", label: "PostgreSQL" },
    { key: "supabase", label: "Supabase" },
    { key: "schema", label: "Tablas" },
    { key: "admin", label: "Admin" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Instalación del CRM</CardTitle>
          <CardDescription>
            Configura PostgreSQL, Supabase y crea el administrador
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between gap-2">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  {renderStepIcon(stepStatus[step.key as keyof StepStatus])}
                  <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
                </div>
                {i < steps.length - 1 && <div className="h-px flex-1 bg-border mx-2" />}
              </div>
            ))}
          </div>

          {/* Step: PostgreSQL */}
          {currentStep === "postgres" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Server className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Conexión a PostgreSQL</p>
                  <p className="text-sm text-muted-foreground">
                    Introduce los datos de tu servidor PostgreSQL
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pg-host">Host *</Label>
                  <Input
                    id="pg-host"
                    placeholder="192.168.1.100 o db.ejemplo.com"
                    value={postgresConfig.host}
                    onChange={(e) => setPostgresConfig(p => ({ ...p, host: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pg-port">Puerto</Label>
                  <Input
                    id="pg-port"
                    placeholder="5432"
                    value={postgresConfig.port}
                    onChange={(e) => setPostgresConfig(p => ({ ...p, port: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pg-database">Base de datos *</Label>
                  <Input
                    id="pg-database"
                    placeholder="crm"
                    value={postgresConfig.database}
                    onChange={(e) => setPostgresConfig(p => ({ ...p, database: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pg-user">Usuario *</Label>
                  <Input
                    id="pg-user"
                    placeholder="postgres"
                    value={postgresConfig.user}
                    onChange={(e) => setPostgresConfig(p => ({ ...p, user: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="pg-password">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="pg-password"
                      type={showPostgresPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={postgresConfig.password}
                      onChange={(e) => setPostgresConfig(p => ({ ...p, password: e.target.value }))}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPostgresPassword(!showPostgresPassword)}
                    >
                      {showPostgresPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="setup-proxy-url">URL API proxy de setup (opcional)</Label>
                  <Input
                    id="setup-proxy-url"
                    placeholder="https://tu-dominio.com/api/crm-setup"
                    value={setupProxyUrl}
                    onChange={(e) => setSetupProxyUrl(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si se indica, las acciones de setup se enviarán a este endpoint HTTP en lugar de usar Edge
                    Functions de Supabase.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <Button
                onClick={testPostgres}
                disabled={isLoading || !postgresConfig.host || !postgresConfig.password}
                className="w-full"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando...</>
                ) : (
                  "Probar conexión"
                )}
              </Button>
            </div>
          )}

          {/* Step: Supabase */}
          {currentStep === "supabase" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Cloud className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Verificar Supabase</p>
                  <p className="text-sm text-muted-foreground">
                    Se verificará la conexión con Supabase Auth
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-2">Variables detectadas:</p>
                <p className="text-muted-foreground text-xs font-mono">
                  VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 40)}...
                </p>
              </div>

              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Verifica que SUPABASE_SERVICE_ROLE_KEY está configurado en las Edge Functions.
                  </p>
                </div>
              )}

              <Button onClick={testSupabase} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                ) : (
                  "Verificar Supabase"
                )}
              </Button>
            </div>
          )}

          {/* Step: Schema */}
          {currentStep === "schema" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Database className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Crear Tablas del CRM</p>
                  <p className="text-sm text-muted-foreground">
                    Se crearán todas las tablas, índices y funciones necesarias
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <Button onClick={createSchema} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando tablas...</>
                ) : (
                  "Crear Schema"
                )}
              </Button>
            </div>
          )}

          {/* Step: Admin */}
          {currentStep === "admin" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <UserPlus className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Crear Administrador</p>
                  <p className="text-sm text-muted-foreground">
                    Este será el primer usuario con acceso total
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Nombre</Label>
                  <Input
                    id="adminName"
                    placeholder="Tu nombre completo"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      type={showAdminPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                    >
                      {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <Button
                onClick={createAdmin}
                disabled={isLoading || !adminEmail || !adminPassword}
                className="w-full"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando administrador...</>
                ) : (
                  "Crear administrador"
                )}
              </Button>
            </div>
          )}

          {/* Step: Complete */}
          {currentStep === "complete" && (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-lg">¡Instalación completada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu CRM está listo. Inicia sesión con las credenciales del administrador.
                </p>
              </div>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Ir a iniciar sesión
              </Button>
            </div>
          )}

          {/* Logs Panel */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Registro de actividad</Label>
                <Button variant="ghost" size="sm" onClick={exportLogs} className="h-6 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Exportar
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {logs.map((log, i) => (
                    <div key={i} className="py-0.5">{log}</div>
                  ))}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
