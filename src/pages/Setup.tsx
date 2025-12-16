import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, Loader2, UserPlus, AlertCircle, Rocket, 
  Database, Cloud, Eye, EyeOff, RefreshCw
} from "lucide-react";

type SetupStep = "checking" | "admin" | "complete";

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
      // Check if user is already authenticated
      const { data: currentUserData } = await supabase.auth.getUser();
      let user = currentUserData?.user ?? null;

      // If not authenticated, sign up
      if (!user) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: adminEmail,
          password: adminPassword,
          options: {
            data: { full_name: adminName || "Administrador" },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (authError && !authError.message.includes("Error sending confirmation email")) {
          throw authError;
        }

        if (!authData?.user) {
          throw new Error("No se pudo crear el usuario");
        }
        user = authData.user;
      }

      // Wait for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify/create profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from("profiles").insert({
          user_id: user.id,
          email: adminEmail,
          full_name: adminName || "Administrador",
        });
      }

      // Verify/create admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData) {
        if (roleData.role !== "admin") {
          await supabase
            .from("user_roles")
            .update({ role: "admin" })
            .eq("user_id", user.id);
        }
      } else {
        await supabase.from("user_roles").insert({
          user_id: user.id,
          role: "admin",
        });
      }

      toast.success("¡Administrador creado correctamente!");
      setCurrentStep("complete");

    } catch (error: any) {
      setErrorMessage(error.message);
      toast.error(error.message);
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

          {/* Admin Creation Step */}
          {currentStep === "admin" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  Sistema verificado correctamente
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
