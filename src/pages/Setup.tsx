import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, Loader2, UserPlus, AlertCircle, Rocket, 
  Database, Cloud, Eye, EyeOff, Download, ExternalLink
} from "lucide-react";

type SetupStep = "supabase" | "schema" | "admin" | "complete";

interface StepStatus {
  supabase: "pending" | "running" | "success" | "error";
  schema: "pending" | "running" | "success" | "error";
  admin: "pending" | "running" | "success" | "error";
}

// Tablas que deben existir en Supabase
const REQUIRED_TABLES = [
  "profiles",
  "user_roles", 
  "company_settings",
  "contacts",
  "clients",
  "services",
  "quotes",
  "quote_services",
  "contracts",
  "contract_services",
  "invoices",
  "invoice_services",
  "expenses",
  "remittances",
  "campaigns",
  "calendar_categories",
  "calendar_events",
  "user_availability",
  "email_settings",
  "email_templates",
  "notification_rules",
  "notification_queue",
];

export default function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SetupStep>("supabase");
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    supabase: "pending",
    schema: "pending",
    admin: "pending",
  });

  // Admin
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

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

  // Test Supabase connection
  const testSupabase = async () => {
    setIsLoading(true);
    setStepStatus(prev => ({ ...prev, supabase: "running" }));
    setErrorMessage(null);
    addLog("Verificando conexión a Supabase...");

    try {
      // Simple query to check connectivity
      const { error } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1);

      if (error && !error.message.includes("does not exist")) {
        throw error;
      }

      addLog("✓ Supabase responde correctamente.");
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

  // Verify schema exists
  const verifySchema = async () => {
    setIsLoading(true);
    setStepStatus(prev => ({ ...prev, schema: "running" }));
    setErrorMessage(null);
    setMissingTables([]);
    addLog("Verificando tablas en Supabase...");

    try {
      const missing: string[] = [];
      const verified: string[] = [];

      // Check each table by trying to query it
      // Note: RLS may block access but if table exists, error won't be "does not exist"
      for (const table of REQUIRED_TABLES) {
        try {
          const { error } = await supabase
            .from(table as any)
            .select("*", { count: "exact", head: true });

          if (error) {
            // Check if table doesn't exist vs RLS blocking
            const errorMsg = error.message.toLowerCase();
            const errorCode = error.code || "";
            
            if (
              errorMsg.includes("does not exist") || 
              errorMsg.includes("relation") && errorMsg.includes("does not exist") ||
              errorCode === "42P01" ||
              errorCode === "PGRST204"
            ) {
              missing.push(table);
              addLog(`❌ Tabla faltante: ${table}`);
            } else {
              // Table exists but query blocked by RLS - that's OK
              verified.push(table);
              addLog(`✓ Tabla existe: ${table} (RLS activo)`);
            }
          } else {
            verified.push(table);
            addLog(`✓ Tabla verificada: ${table}`);
          }
        } catch (err: any) {
          // Network or unexpected error - assume table might exist
          addLog(`⚠️ No se pudo verificar: ${table} - ${err.message}`);
        }
      }

      if (missing.length > 0) {
        setMissingTables(missing);
        throw new Error(`Faltan ${missing.length} tablas. Ejecuta las migraciones primero.`);
      }

      addLog(`✓ ${verified.length}/${REQUIRED_TABLES.length} tablas verificadas.`);
      addLog("✓ Schema de Supabase está completo.");
      setStepStatus(prev => ({ ...prev, schema: "success" }));
      toast.success("Schema verificado correctamente");
      setCurrentStep("admin");
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStepStatus(prev => ({ ...prev, schema: "error" }));
      setErrorMessage(error.message);
      toast.error("Error verificando schema");
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
      // 1) Intentar usar el usuario ya autenticado en Supabase
      const { data: currentUserData, error: currentUserError } = await supabase.auth.getUser();
      if (currentUserError) {
        addLog(`⚠️ No se pudo obtener el usuario actual: ${currentUserError.message}`);
      }

      let user = currentUserData?.user ?? null;

      // 2) Si no hay usuario autenticado, registramos uno nuevo
      if (!user) {
        addLog("No hay usuario autenticado, registrando nuevo usuario en Supabase Auth...");

        const redirectUrl = `${window.location.origin}/auth`;

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: adminEmail,
          password: adminPassword,
          options: {
            data: { full_name: adminName || "Administrador" },
            emailRedirectTo: redirectUrl,
          },
        });

        // En algunos proyectos de Supabase, aunque el usuario se crea correctamente,
        // se devuelve el error "Error sending confirmation email" si no hay SMTP configurado.
        if (authError && !authError.message.includes("Error sending confirmation email")) {
          throw authError;
        }

        if (!authData?.user) {
          throw authError || new Error("No se pudo crear el usuario");
        }

        user = authData.user;
        addLog(`✓ Usuario creado en Supabase Auth: ${user.id.slice(0, 8)}...`);
      } else {
        addLog(`✓ Usando usuario autenticado actual: ${user.id.slice(0, 8)}...`);
      }

      if (!user) {
        throw new Error("No se pudo obtener un usuario válido para asignar como administrador");
      }

      // 3) A partir de aquí trabajamos con el usuario (ya existente o recién creado)

      // The trigger handle_new_user should create profile and role automatically
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify profile was created
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        addLog("✓ Perfil creado automáticamente por trigger.");
      } else {
        addLog("⚠️ Perfil no encontrado, creando manualmente...");
        await supabase.from("profiles").insert({
          user_id: user.id,
          email: adminEmail,
          full_name: adminName || "Administrador",
        });
      }

      // Verify role was created, if not create admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", user.id)
        .single();

      if (roleData) {
        if (roleData.role !== "admin") {
          // Update to admin
          await supabase
            .from("user_roles")
            .update({ role: "admin" })
            .eq("user_id", user.id);
          addLog("✓ Rol actualizado a admin.");
        } else {
          addLog("✓ Rol admin verificado.");
        }
      } else {
        await supabase.from("user_roles").insert({
          user_id: user.id,
          role: "admin",
        });
        addLog("✓ Rol admin creado manualmente.");
      }

      setStepStatus(prev => ({ ...prev, admin: "success" }));
      toast.success("¡Administrador creado correctamente!");
      setCurrentStep("complete");
    } catch (error: any) {
      const message = error?.message || "Error desconocido al crear el administrador. Revisa los logs.";
      try {
        addLog(`❌ Error: ${message} | Detalles: ${JSON.stringify(error)}`);
      } catch {
        addLog(`❌ Error: ${message}`);
      }
      setStepStatus(prev => ({ ...prev, admin: "error" }));
      setErrorMessage(message);
      toast.error(message);
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
            Verifica Supabase, el schema y crea el administrador
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

          {/* Step: Supabase */}
          {currentStep === "supabase" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Cloud className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Verificar Conexión a Supabase</p>
                  <p className="text-sm text-muted-foreground">
                    Se verificará que la aplicación puede conectarse a Supabase
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-2">Proyecto Supabase detectado:</p>
                <p className="text-muted-foreground text-xs font-mono break-all">
                  URL: {import.meta.env.VITE_SUPABASE_URL}
                </p>
              </div>

              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{errorMessage}</p>
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
                  <p className="font-medium">Verificar Tablas del CRM</p>
                  <p className="text-sm text-muted-foreground">
                    Se verificará que todas las tablas necesarias existen
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-2">Tablas a verificar: {REQUIRED_TABLES.length}</p>
                <p className="text-xs text-muted-foreground">
                  Si faltan tablas, ejecuta las migraciones de Supabase primero.
                </p>
              </div>

              {missingTables.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                    Tablas faltantes ({missingTables.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {missingTables.map(t => (
                      <span key={t} className="text-xs bg-amber-500/20 px-2 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                  {String(import.meta.env.VITE_SUPABASE_URL).includes("supabase.co") && (
                    <a
                      href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID}/sql/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir SQL Editor de Supabase (cloud)
                    </a>
                  )}
                </div>
              )}

              {errorMessage && !missingTables.length && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <Button onClick={verifySchema} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando tablas...</>
                ) : (
                  "Verificar Schema"
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
                    Crea el primer usuario con permisos de administrador
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Nombre completo</Label>
                  <Input
                    id="admin-name"
                    placeholder="Juan Pérez"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</>
                ) : (
                  "Crear Administrador"
                )}
              </Button>
            </div>
          )}

          {/* Step: Complete */}
          {currentStep === "complete" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-medium">¡Instalación completada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  El CRM está listo. Inicia sesión con tu cuenta de administrador.
                </p>
              </div>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Ir al Login
              </Button>
            </div>
          )}

          {/* Logs Panel */}
          {logs.length > 0 && currentStep !== "complete" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Log de instalación</Label>
                <Button variant="ghost" size="sm" onClick={exportLogs} className="h-6 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  Exportar
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {logs.map((log, i) => (
                  <p key={i} className="text-xs font-mono text-muted-foreground">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
