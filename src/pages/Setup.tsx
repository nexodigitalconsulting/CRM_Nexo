import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase, getSupabaseConfig } from "@/integrations/supabase/client";
import { 
  CheckCircle2, Loader2, UserPlus, AlertCircle, Rocket, 
  Database, Cloud, Eye, EyeOff, RefreshCw, Settings
} from "lucide-react";

type SetupStep = "checking" | "config-error" | "admin" | "complete";

interface CheckResult {
  supabase: "pending" | "success" | "error";
  schema: "pending" | "success" | "error";
}

const REQUIRED_TABLES = [
  "profiles", "user_roles", "company_settings", "contacts", "clients",
  "services", "quotes", "quote_services", "contracts", "contract_services",
  "invoices", "invoice_services", "expenses", "remittances", "campaigns",
  "calendar_categories", "calendar_events", "user_availability",
  "email_settings", "email_templates", "notification_rules", "notification_queue",
];

export default function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SetupStep>("checking");
  const [checkResult, setCheckResult] = useState<CheckResult>({
    supabase: "pending",
    schema: "pending",
  });
  const [isChecking, setIsChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);

  // Admin form
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Auto-run checks on mount
  useEffect(() => {
    runAutomaticChecks();
  }, []);

  const runAutomaticChecks = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    setMissingTables([]);
    setCheckResult({ supabase: "pending", schema: "pending" });

    // First check if Supabase is configured
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      setCheckResult({ supabase: "error", schema: "pending" });
      setErrorMessage("Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no configuradas.");
      setCurrentStep("config-error");
      setIsChecking(false);
      return;
    }

    try {
      // Step 1: Check Supabase connection
      const { error: connError } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1);

      if (connError && !connError.message.includes("does not exist")) {
        setCheckResult(prev => ({ ...prev, supabase: "error" }));
        throw new Error(`Conexión a Supabase fallida: ${connError.message}`);
      }

      setCheckResult(prev => ({ ...prev, supabase: "success" }));

      // Step 2: Check schema tables
      const missing: string[] = [];
      for (const table of REQUIRED_TABLES) {
        const { error } = await supabase
          .from(table as any)
          .select("*", { count: "exact", head: true });

        if (error) {
          const msg = error.message.toLowerCase();
          const code = error.code || "";
          if (
            msg.includes("does not exist") ||
            code === "42P01" ||
            code === "PGRST204"
          ) {
            missing.push(table);
          }
        }
      }

      if (missing.length > 0) {
        setMissingTables(missing);
        setCheckResult(prev => ({ ...prev, schema: "error" }));
        throw new Error(`Faltan ${missing.length} tablas en la base de datos.`);
      }

      setCheckResult(prev => ({ ...prev, schema: "success" }));
      
      // Check if admin already exists
      const { data: existingRoles } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      if (existingRoles && existingRoles.length > 0) {
        toast.success("CRM ya configurado. Redirigiendo...");
        setTimeout(() => navigate("/auth"), 1500);
        return;
      }

      // All checks passed, go to admin creation
      setCurrentStep("admin");
      toast.success("Verificaciones completadas");

    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const createAdmin = async () => {
    if (!adminEmail || !adminPassword) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }
    if (adminPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      // Step 1: Create user via Supabase Auth (no Edge Function needed)
      const redirectUrl = `${window.location.origin}/auth`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: adminName || "Administrador" },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!signUpData.user) {
        throw new Error("No se pudo crear el usuario");
      }

      // Step 2: Call database function to assign admin role (bypasses RLS via SECURITY DEFINER)
      const { data: rpcResult, error: rpcError } = await supabase.rpc("bootstrap_first_admin", {
        _user_id: signUpData.user.id,
        _email: adminEmail,
        _full_name: adminName || "Administrador",
      });

      if (rpcError) {
        console.error("RPC error:", rpcError);
        throw new Error(rpcError.message);
      }

      // Check if function returned an error
      if (rpcResult && typeof rpcResult === "object" && "error" in rpcResult) {
        throw new Error((rpcResult as { error: string }).error);
      }

      toast.success("¡Administrador creado correctamente!");
      setCurrentStep("complete");

    } catch (error: any) {
      const msg = error?.message || "Error inesperado creando el administrador";
      setErrorMessage(msg);
      toast.error(msg);
      console.error("createAdmin error:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const renderStatusIcon = (status: "pending" | "success" | "error") => {
    switch (status) {
      case "success": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error": return <AlertCircle className="h-5 w-5 text-destructive" />;
      default: return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración del CRM</CardTitle>
          <CardDescription>
            {currentStep === "checking" && "Verificando sistema..."}
            {currentStep === "config-error" && "Error de configuración"}
            {currentStep === "admin" && "Crea el usuario administrador"}
            {currentStep === "complete" && "¡Listo para usar!"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Checking Step */}
          {currentStep === "checking" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  {renderStatusIcon(checkResult.supabase)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">Conexión Supabase</p>
                    <p className="text-xs text-muted-foreground">
                      {checkResult.supabase === "pending" && "Verificando..."}
                      {checkResult.supabase === "success" && "Conectado correctamente"}
                      {checkResult.supabase === "error" && "Error de conexión"}
                    </p>
                  </div>
                  <Cloud className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  {renderStatusIcon(checkResult.schema)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">Schema de Base de Datos</p>
                    <p className="text-xs text-muted-foreground">
                      {checkResult.schema === "pending" && "Verificando tablas..."}
                      {checkResult.schema === "success" && `${REQUIRED_TABLES.length} tablas verificadas`}
                      {checkResult.schema === "error" && `${missingTables.length} tablas faltantes`}
                    </p>
                  </div>
                  <Database className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {missingTables.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                    Tablas faltantes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {missingTables.slice(0, 8).map(t => (
                      <span key={t} className="text-xs bg-amber-500/20 px-2 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                    {missingTables.length > 8 && (
                      <span className="text-xs text-amber-600">+{missingTables.length - 8} más</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ejecuta las migraciones de Supabase antes de continuar.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              {!isChecking && (checkResult.supabase === "error" || checkResult.schema === "error") && (
                <Button onClick={runAutomaticChecks} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar verificación
                </Button>
              )}
            </div>
          )}

          {/* Configuration Error Step */}
          {currentStep === "config-error" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Error de Configuración</p>
                  <p className="text-xs text-muted-foreground">
                    Las variables de entorno de Supabase no están configuradas
                  </p>
                </div>
                <Settings className="h-5 w-5 text-muted-foreground" />
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Configuración actual:</p>
                <div className="text-xs space-y-1 font-mono">
                  <p>
                    <span className="text-muted-foreground">VITE_SUPABASE_URL:</span>{" "}
                    <span className={getSupabaseConfig().url ? "text-green-600" : "text-destructive"}>
                      {getSupabaseConfig().url || "No configurada"}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">VITE_SUPABASE_ANON_KEY:</span>{" "}
                    <span className={getSupabaseConfig().hasKey ? "text-green-600" : "text-destructive"}>
                      {getSupabaseConfig().hasKey ? "✓ Configurada" : "No configurada"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                  Para Easypanel + Supabase Self-hosted:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Configura <code>VITE_SUPABASE_URL</code> en Build Args</li>
                  <li>Configura <code>VITE_SUPABASE_ANON_KEY</code> en Build Args</li>
                  <li>Reconstruye la imagen del contenedor</li>
                </ul>
              </div>

              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              <Button onClick={() => { setCurrentStep("checking"); runAutomaticChecks(); }} variant="outline" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar verificación
              </Button>
            </div>
          )}

          {/* Admin Creation Step */}
          {currentStep === "admin" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  Sistema verificado correctamente
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Primera instalación:</strong> Crea tu cuenta de administrador. Este paso solo está disponible cuando no existe ningún admin.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Nombre completo</Label>
                  <Input
                    id="admin-name"
                    placeholder="Juan Pérez"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    disabled={isCreating}
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
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      disabled={isCreating}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                disabled={isCreating || !adminEmail || !adminPassword}
                className="w-full"
              >
                {isCreating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</>
                ) : (
                  <><UserPlus className="mr-2 h-4 w-4" /> Crear Administrador</>
                )}
              </Button>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === "complete" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-medium">¡Configuración completada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Inicia sesión con tu cuenta de administrador
                </p>
              </div>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Ir al Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
