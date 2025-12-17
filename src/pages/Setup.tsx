import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, getSupabaseConfig } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Shield,
  AlertTriangle,
  Copy,
  RefreshCw,
  PlugZap,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

type SetupStep = "checking" | "config-error" | "needs-admin" | "has-admin";

type EdgeCheckStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; message: string }
  | { state: "error"; message: string };

interface CheckResult {
  supabaseConnection: "pending" | "success" | "error";
  schemaValid: "pending" | "success" | "error";
  adminExists: "pending" | "yes" | "no";
  errorMessage?: string;
}

const REQUIRED_TABLES = [
  "profiles",
  "user_roles",
  "company_settings",
  "clients",
  "contacts",
  "services",
  "quotes",
  "contracts",
  "invoices",
  "expenses",
];

const PROJECT_REF = "honfwrfkiukckyoelsdm";

export default function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SetupStep>("checking");
  const [checkResult, setCheckResult] = useState<CheckResult>({
    supabaseConnection: "pending",
    schemaValid: "pending",
    adminExists: "pending",
  });

  const [edgeCheck, setEdgeCheck] = useState<EdgeCheckStatus>({ state: "idle" });

  const supabaseConfig = getSupabaseConfig();

  useEffect(() => {
    if (!supabaseConfig.isConfigured) {
      setCurrentStep("config-error");
      return;
    }
    runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runChecks = async () => {
    setCurrentStep("checking");
    setCheckResult({
      supabaseConnection: "pending",
      schemaValid: "pending",
      adminExists: "pending",
    });

    try {
      // Check 1: Supabase connection
      const { error: connError } = await supabase.from("company_settings").select("id").limit(1);

      if (connError && !connError.message.includes("permission denied")) {
        setCheckResult((prev) => ({
          ...prev,
          supabaseConnection: "error",
          errorMessage: `Conexión fallida: ${connError.message}`,
        }));
        setCurrentStep("config-error");
        return;
      }

      setCheckResult((prev) => ({ ...prev, supabaseConnection: "success" }));

      // Check 2: Schema validation
      let missingTables: string[] = [];
      for (const table of REQUIRED_TABLES) {
        const { error } = await supabase.from(table as any).select("*").limit(1);
        if (error && error.message.includes("does not exist")) {
          missingTables.push(table);
        }
      }

      if (missingTables.length > 0) {
        setCheckResult((prev) => ({
          ...prev,
          schemaValid: "error",
          errorMessage: `Tablas faltantes: ${missingTables.join(", ")}`,
        }));
        setCurrentStep("config-error");
        return;
      }

      setCheckResult((prev) => ({ ...prev, schemaValid: "success" }));

      // Check 3: Admin exists
      const { data: adminData, error: adminError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      if (adminError) {
        // RLS might block this query - that's OK, we'll assume no admin
        setCheckResult((prev) => ({ ...prev, adminExists: "no" }));
        setCurrentStep("needs-admin");
        return;
      }

      if (adminData && adminData.length > 0) {
        setCheckResult((prev) => ({ ...prev, adminExists: "yes" }));
        setCurrentStep("has-admin");
      } else {
        setCheckResult((prev) => ({ ...prev, adminExists: "no" }));
        setCurrentStep("needs-admin");
      }
    } catch (error: any) {
      setCheckResult((prev) => ({
        ...prev,
        supabaseConnection: "error",
        errorMessage: error.message,
      }));
      setCurrentStep("config-error");
    }
  };

  const runEdgeFunctionsCheck = async () => {
    setEdgeCheck({ state: "checking" });

    try {
      const { data, error } = await supabase.functions.invoke("ping");
      if (error) {
        setEdgeCheck({ state: "error", message: error.message });
        return;
      }
      const msg = typeof data === "object" ? JSON.stringify(data) : String(data ?? "OK");
      setEdgeCheck({ state: "ok", message: msg });
    } catch (e: any) {
      setEdgeCheck({ state: "error", message: e?.message || "Error desconocido" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const renderStatusIcon = (status: "pending" | "success" | "error" | "yes" | "no") => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
      case "success":
      case "yes":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
      case "no":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const edgeCheckIcon = () => {
    if (edgeCheck.state === "checking") return <Loader2 className="h-4 w-4 animate-spin" />;
    if (edgeCheck.state === "ok") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (edgeCheck.state === "error") return <XCircle className="h-4 w-4 text-red-500" />;
    return <PlugZap className="h-4 w-4 text-muted-foreground" />;
  };

  const sqlCreateAdmin = `-- 1. Primero crea un usuario en Supabase Studio → Authentication → Add user
-- 2. Copia el UUID del usuario creado
-- 3. Ejecuta este SQL reemplazando los valores:

INSERT INTO public.profiles (user_id, email, full_name)
VALUES (
  'PEGA_UUID_AQUI',           -- UUID del usuario
  'admin@tuempresa.com',       -- Email del usuario
  'Administrador'              -- Nombre
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

INSERT INTO public.user_roles (user_id, role)
VALUES ('PEGA_UUID_AQUI', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;`;

  const syncFunctionsInstructions = `# Actualizar Edge Functions (Self-hosted)

# 1) Asegura variables en el servicio CRM (Easypanel):
#   - SUPABASE_FUNCTIONS_VOLUME=/mnt/supabase-functions
#   - CRM_FUNCTIONS_DIR=/app/supabase/functions (opcional)

# 2) Asegura que el mismo volumen está montado en:
#   - CRM: /mnt/supabase-functions
#   - Supabase edge-runtime: (la carpeta de funciones de tu instalación)

# 3) Reinicia el servicio CRM (para que ejecute el copiado)
# 4) Reinicia edge-runtime para recargar funciones:
#   docker restart supabase-edge-functions
`;

  const apiBaseUrl = (supabaseConfig.url || "").replace("/rest/v1", "");
  const functionsBaseUrl = apiBaseUrl ? `${apiBaseUrl}/functions/v1` : "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración Inicial - CRM</CardTitle>
          <CardDescription>Supabase Autoalojado + Easypanel</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status checks */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {renderStatusIcon(checkResult.supabaseConnection)}
              <span className="flex-1">Conexión a Supabase</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {renderStatusIcon(checkResult.schemaValid)}
              <span className="flex-1">Esquema de base de datos</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {renderStatusIcon(checkResult.adminExists)}
              <span className="flex-1">Usuario administrador</span>
            </div>
          </div>

          {/* Edge Functions */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Actualizar funciones</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              En self-hosted, la UI no puede eliminar/copiar ficheros en el servidor: esto ocurre al arrancar el CRM (copia al
              volumen) y se activa al reiniciar el edge-runtime.
            </p>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>API detectada:</span>
                  <span className="font-mono truncate">{apiBaseUrl || "(no configurada)"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Functions endpoint:</span>
                  <span className="font-mono truncate">{functionsBaseUrl || "(no disponible)"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={runEdgeFunctionsCheck} disabled={edgeCheck.state === "checking"}>
                  {edgeCheckIcon()}
                  <span className="ml-2">Probar función (ping)</span>
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(syncFunctionsInstructions)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar pasos
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(functionsBaseUrl || "") } disabled={!functionsBaseUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URL Functions
                </Button>
              </div>
            </div>

            {edgeCheck.state === "ok" && (
              <div className="text-xs font-mono bg-muted/50 rounded p-3 whitespace-pre-wrap break-words">
                OK: {edgeCheck.message}
              </div>
            )}
            {edgeCheck.state === "error" && (
              <div className="text-xs font-mono bg-destructive/10 border border-destructive/20 rounded p-3 whitespace-pre-wrap break-words">
                ERROR: {edgeCheck.message}
              </div>
            )}
          </div>

          {/* Config Error */}
          {currentStep === "config-error" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Error de configuración</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {checkResult.errorMessage ||
                        "Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY"}
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={runChecks} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar verificación
              </Button>
            </div>
          )}

          {/* Needs Admin - Show SQL instructions */}
          {currentStep === "needs-admin" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-600">No hay administrador configurado</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      En Supabase autoalojado, crea el admin manualmente:
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Pasos para crear el administrador:
                </h4>

                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    Ve a <strong>Supabase Studio → Authentication → Users</strong>
                  </li>
                  <li>
                    Haz clic en <strong>"Add user"</strong>
                  </li>
                  <li>Crea un usuario con email y contraseña</li>
                  <li>
                    Copia el <strong>UUID</strong> del usuario creado
                  </li>
                  <li>
                    Ve a <strong>SQL Editor</strong> y ejecuta el SQL de abajo
                  </li>
                </ol>

                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto max-h-64">{sqlCreateAdmin}</pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(sqlCreateAdmin)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={runChecks} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar de nuevo
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => copyToClipboard(apiBaseUrl || supabaseConfig.url || "")}
                  disabled={!apiBaseUrl && !supabaseConfig.url}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URL API
                </Button>
              </div>
            </div>
          )}

          {/* Has Admin - Redirect to login */}
          {currentStep === "has-admin" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-600">¡Sistema configurado correctamente!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ya existe un usuario administrador. Puedes iniciar sesión.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={() => navigate("/auth")} className="w-full">
                Ir a Iniciar Sesión
              </Button>
            </div>
          )}

          {/* Checking state */}
          {currentStep === "checking" && (
            <div className="text-center py-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Verificando configuración...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
