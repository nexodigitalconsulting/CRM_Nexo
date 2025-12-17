import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle, Database, Copy, ExternalLink } from "lucide-react";
import { checkSchemaDirectly, getMigrationSQL, TARGET_VERSION, SchemaStatus, compareVersions } from "@/lib/schemaChecker";

interface MigrationGateProps {
  children: ReactNode;
}

interface MigrationResult {
  success: boolean;
  currentVersion?: string;
  targetVersion?: string;
  migrationsApplied?: number;
  logs?: string[];
  error?: string;
  requiresSetup?: boolean;
}

type MigrationStatus = 
  | "checking" 
  | "migrating" 
  | "success" 
  | "error" 
  | "ready" 
  | "needs-setup"
  | "needs-migration";

export function MigrationGate({ children }: MigrationGateProps) {
  const [status, setStatus] = useState<MigrationStatus>("checking");
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkAndMigrate();
  }, []);

  async function checkAndMigrate() {
    try {
      setStatus("checking");
      
      // Strategy 1: Try Edge Function first (works in Lovable Cloud)
      try {
        const { data, error } = await supabase.functions.invoke<MigrationResult>("db-migrate");
        
        if (!error && data) {
          setResult(data);

          if (data.requiresSetup) {
            setStatus("needs-setup");
            return;
          }

          if (data.success) {
            if (data.migrationsApplied && data.migrationsApplied > 0) {
              setStatus("success");
              setTimeout(() => setStatus("ready"), 2000);
            } else {
              setStatus("ready");
            }
            return;
          }

          // Edge function ran but reported error
          if (data.error?.includes("not configured")) {
            setStatus("ready");
            return;
          }
        }
      } catch (edgeFunctionError: any) {
        // Edge function not available - likely self-hosted environment
        console.log("Edge function not available, using direct schema check");
      }

      // Strategy 2: Direct schema check (for Easypanel/self-hosted)
      const directStatus = await checkSchemaDirectly();
      setSchemaStatus(directStatus);

      // Check if base tables exist
      if (!directStatus.hasSchemaVersions && directStatus.missingComponents.length > 5) {
        // No schema at all - needs full setup
        setStatus("needs-setup");
        return;
      }

      // Check if migrations are needed
      const versionComparison = compareVersions(directStatus.currentVersion, TARGET_VERSION);
      
      if (versionComparison < 0 || directStatus.missingComponents.length > 0) {
        // Needs migration
        setStatus("needs-migration");
        return;
      }

      // Everything is up to date
      setStatus("ready");

    } catch (err: any) {
      console.warn("Migration gate error:", err);
      // On any error, try to continue (graceful degradation)
      setStatus("ready");
    }
  }

  const copySQL = async () => {
    await navigator.clipboard.writeText(getMigrationSQL());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If ready, render children directly
  if (status === "ready") {
    return <>{children}</>;
  }

  // Show migration UI
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-card border rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">CRM System</h1>
            <p className="text-xs text-muted-foreground">Versión objetivo: {TARGET_VERSION}</p>
          </div>
        </div>

        {status === "checking" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Verificando sistema...</span>
          </div>
        )}

        {status === "migrating" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Actualizando base de datos...</span>
            </div>
            {result?.logs && (
              <div className="bg-muted/50 rounded p-3 text-xs font-mono max-h-40 overflow-auto">
                {result.logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground">{log}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Sistema actualizado correctamente</span>
            </div>
            {result && (
              <p className="text-sm text-muted-foreground">
                Versión: {result.currentVersion} • {result.migrationsApplied} migración(es) aplicada(s)
              </p>
            )}
          </div>
        )}

        {status === "needs-setup" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-orange-500">
              <AlertCircle className="h-5 w-5" />
              <span>Configuración inicial requerida</span>
            </div>
            <p className="text-sm text-muted-foreground">
              La base de datos necesita ser configurada. Esto puede ser porque:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Es una instalación nueva</li>
              <li>Falta ejecutar el schema inicial</li>
            </ul>
            
            <div className="bg-muted/50 rounded p-3 space-y-2">
              <p className="text-sm font-medium">Para Easypanel/Self-hosted:</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Abre Supabase SQL Editor</li>
                <li>Ejecuta: <code className="bg-muted px-1">easypanel/init-scripts/full-schema.sql</code></li>
                <li>Crea el usuario admin (ver README)</li>
                <li>Refresca esta página</li>
              </ol>
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href="/setup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
              >
                Ir a Configuración
              </a>
              <button
                onClick={checkAndMigrate}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90"
              >
                Verificar de nuevo
              </button>
            </div>
          </div>
        )}

        {status === "needs-migration" && schemaStatus && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              <span>Actualización de base de datos requerida</span>
            </div>
            
            <div className="bg-muted/30 rounded p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versión actual:</span>
                <span className="font-mono">{schemaStatus.currentVersion || "desconocida"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versión requerida:</span>
                <span className="font-mono text-primary">{TARGET_VERSION}</span>
              </div>
            </div>

            {schemaStatus.missingComponents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Componentes faltantes:</p>
                <ul className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1 max-h-32 overflow-auto">
                  {schemaStatus.missingComponents.map((comp, i) => (
                    <li key={i}>• {comp}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3 space-y-2">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Para actualizar (Easypanel/Self-hosted):
              </p>
              <ol className="text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                <li>Abre Supabase SQL Editor</li>
                <li>Ejecuta el contenido de:
                  <code className="block bg-blue-100 dark:bg-blue-900/50 px-2 py-1 mt-1 rounded">
                    easypanel/init-scripts/migrations/apply_all.sql
                  </code>
                </li>
                <li>Refresca esta página</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={copySQL}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90"
              >
                <Copy className="h-4 w-4" />
                {copied ? "¡Copiado!" : "Copiar instrucciones SQL"}
              </button>
              <button
                onClick={checkAndMigrate}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
              >
                Verificar de nuevo
              </button>
              <button
                onClick={() => setStatus("ready")}
                className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm"
              >
                Continuar de todas formas
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Error en la verificación</span>
            </div>
            <p className="text-sm text-muted-foreground">{result?.error}</p>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-primary hover:underline"
            >
              {showDetails ? "Ocultar detalles" : "Ver detalles"}
            </button>
            
            {showDetails && result?.logs && (
              <div className="bg-muted/50 rounded p-3 text-xs font-mono max-h-40 overflow-auto">
                {result.logs.map((log, i) => (
                  <div key={i} className="text-muted-foreground">{log}</div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={checkAndMigrate}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
              >
                Reintentar
              </button>
              <button
                onClick={() => setStatus("ready")}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90"
              >
                Continuar de todas formas
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {schemaStatus?.environment === "self-hosted" ? (
              <>Entorno: Self-hosted (Easypanel/VPS)</>
            ) : (
              <>Verificando entorno...</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
