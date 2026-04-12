"use client";

// Fase 1 — Setup PostgreSQL/Drizzle
// Esta página verifica que la base de datos PostgreSQL es accesible
// y que existen los datos mínimos para operar.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Database, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type CheckStatus = "pending" | "success" | "error";

interface CheckResult {
  dbConnection: CheckStatus;
  schemaValid: CheckStatus;
  adminExists: CheckStatus;
  errorMessage?: string;
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "pending") return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (status === "success") return <CheckCircle className="h-5 w-5 text-green-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

export default function Setup() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [checkResult, setCheckResult] = useState<CheckResult>({
    dbConnection: "pending",
    schemaValid: "pending",
    adminExists: "pending",
  });
  const [allOk, setAllOk] = useState(false);

  const runChecks = async () => {
    setChecking(true);
    setCheckResult({ dbConnection: "pending", schemaValid: "pending", adminExists: "pending" });

    try {
      // Check 1: DB connection via /api/health
      const healthRes = await fetch("/api/health");
      if (!healthRes.ok) {
        setCheckResult({
          dbConnection: "error",
          schemaValid: "pending",
          adminExists: "pending",
          errorMessage: "No se puede conectar a la base de datos PostgreSQL",
        });
        setChecking(false);
        return;
      }
      setCheckResult((p) => ({ ...p, dbConnection: "success" }));

      // Check 2: Verify core tables exist via a simple data fetch
      const companiesRes = await fetch("/api/data/settings");
      if (!companiesRes.ok && companiesRes.status !== 401) {
        setCheckResult((p) => ({
          ...p,
          schemaValid: "error",
          errorMessage: "Esquema de BD incompleto. Ejecuta: npm run db:migrate",
        }));
        setChecking(false);
        return;
      }
      setCheckResult((p) => ({ ...p, schemaValid: "success" }));

      // Check 3: Admin user (any user in ba_user)
      const adminRes = await fetch("/api/data/admin-check");
      const adminData = adminRes.ok ? await adminRes.json() as { hasAdmin: boolean } : { hasAdmin: false };

      if (adminData.hasAdmin) {
        setCheckResult((p) => ({ ...p, adminExists: "success" }));
        setAllOk(true);
      } else {
        setCheckResult((p) => ({ ...p, adminExists: "error" }));
        setAllOk(false);
      }
    } catch (e) {
      setCheckResult((p) => ({
        ...p,
        dbConnection: "error",
        errorMessage: String(e),
      }));
      toast.error("Error durante verificación");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runChecks();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración — CRM Nexo</CardTitle>
          <CardDescription>PostgreSQL + Drizzle ORM · Fase 1</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <StatusIcon status={checkResult.dbConnection} />
              <span className="flex-1">Conexión PostgreSQL</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <StatusIcon status={checkResult.schemaValid} />
              <span className="flex-1">Esquema de base de datos (Drizzle)</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <StatusIcon status={checkResult.adminExists} />
              <span className="flex-1">Usuario administrador</span>
            </div>
          </div>

          {checkResult.errorMessage && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {checkResult.errorMessage}
            </div>
          )}

          {!checking && !allOk && checkResult.adminExists === "error" && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm space-y-2">
              <p className="font-medium text-amber-700">No hay usuarios registrados</p>
              <p className="text-muted-foreground">
                Ve a <strong>/auth</strong> y crea tu primera cuenta. Será el administrador del sistema.
              </p>
              <Button onClick={() => router.push("/auth")} className="w-full mt-2">
                Crear primera cuenta
              </Button>
            </div>
          )}

          {allOk && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
              <p className="font-medium text-green-700">¡Sistema listo!</p>
              <p className="text-muted-foreground mt-1">Todos los componentes funcionan correctamente.</p>
              <Button onClick={() => router.push("/auth")} className="w-full mt-3">
                Ir al inicio de sesión
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={runChecks} variant="outline" disabled={checking} className="flex-1">
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Verificando..." : "Re-verificar"}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
            <p><Database className="h-3 w-3 inline mr-1" />Migraciones: <code className="bg-muted px-1 rounded">npm run db:migrate</code></p>
            <p><Database className="h-3 w-3 inline mr-1" />Studio: <code className="bg-muted px-1 rounded">npm run db:studio</code> → localhost:4983</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
