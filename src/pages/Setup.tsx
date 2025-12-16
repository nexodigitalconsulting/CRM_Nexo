import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, getSupabaseConfig } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Database, Shield, AlertTriangle, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type SetupStep = "checking" | "config-error" | "needs-admin" | "has-admin";

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

export default function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SetupStep>("checking");
  const [checkResult, setCheckResult] = useState<CheckResult>({
    supabaseConnection: "pending",
    schemaValid: "pending",
    adminExists: "pending",
  });

  const supabaseConfig = getSupabaseConfig();

  useEffect(() => {
    if (!supabaseConfig.isConfigured) {
      setCurrentStep("config-error");
      return;
    }
    runChecks();
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
        setCheckResult(prev => ({
          ...prev,
          supabaseConnection: "error",
          errorMessage: `Conexión fallida: ${connError.message}`,
        }));
        setCurrentStep("config-error");
        return;
      }

      setCheckResult(prev => ({ ...prev, supabaseConnection: "success" }));

      // Check 2: Schema validation
      let missingTables: string[] = [];
      for (const table of REQUIRED_TABLES) {
        const { error } = await supabase.from(table as any).select("*").limit(1);
        if (error && error.message.includes("does not exist")) {
          missingTables.push(table);
        }
      }

      if (missingTables.length > 0) {
        setCheckResult(prev => ({
          ...prev,
          schemaValid: "error",
          errorMessage: `Tablas faltantes: ${missingTables.join(", ")}`,
        }));
        setCurrentStep("config-error");
        return;
      }

      setCheckResult(prev => ({ ...prev, schemaValid: "success" }));

      // Check 3: Admin exists
      const { data: adminData, error: adminError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      if (adminError) {
        // RLS might block this query - that's OK, we'll assume no admin
        setCheckResult(prev => ({ ...prev, adminExists: "no" }));
        setCurrentStep("needs-admin");
        return;
      }

      if (adminData && adminData.length > 0) {
        setCheckResult(prev => ({ ...prev, adminExists: "yes" }));
        setCurrentStep("has-admin");
      } else {
        setCheckResult(prev => ({ ...prev, adminExists: "no" }));
        setCurrentStep("needs-admin");
      }
    } catch (error: any) {
      setCheckResult(prev => ({
        ...prev,
        supabaseConnection: "error",
        errorMessage: error.message,
      }));
      setCurrentStep("config-error");
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración Inicial - CRM</CardTitle>
          <CardDescription>
            Supabase Autoalojado + Easypanel
          </CardDescription>
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

          {/* Config Error */}
          {currentStep === "config-error" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Error de configuración</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {checkResult.errorMessage || "Verifica las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY"}
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
                  <li>Ve a <strong>Supabase Studio → Authentication → Users</strong></li>
                  <li>Haz clic en <strong>"Add user"</strong></li>
                  <li>Crea un usuario con email y contraseña</li>
                  <li>Copia el <strong>UUID</strong> del usuario creado</li>
                  <li>Ve a <strong>SQL Editor</strong> y ejecuta el SQL de abajo</li>
                </ol>

                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto max-h-64">
                    {sqlCreateAdmin}
                  </pre>
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
                  onClick={() => window.open(`${supabaseConfig.url?.replace('/rest/v1', '')}/project/default/auth/users`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Supabase
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
