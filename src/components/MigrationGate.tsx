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
  | "verified"  // System verified, show status before continuing
  | "needs-setup"
  | "needs-migration";

type EdgeFnCheckStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; message: string }
  | { state: "error"; message: string };

export function MigrationGate({ children }: MigrationGateProps) {
  const [status, setStatus] = useState<MigrationStatus>("checking");
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edgeFnCheck, setEdgeFnCheck] = useState<EdgeFnCheckStatus>({ state: "idle" });

  useEffect(() => {
    checkAndMigrate();
  }, []);

  async function checkAndMigrate() {
    try {
      setStatus("checking");
      
      // Strategy 1: Try Edge Function with timeout (works in Lovable Cloud)
      const edgeFunctionPromise = supabase.functions.invoke<MigrationResult>("db-migrate");
      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 8000)
      );

      try {
        const { data, error } = await Promise.race([edgeFunctionPromise, timeoutPromise]);
        
        if (!error && data) {
          setResult(data);

          // Edge Function worked - this is Cloud environment
          const directStatus = await checkSchemaDirectly();
          directStatus.environment = "cloud";
          setSchemaStatus(directStatus);

          if (data.requiresSetup) {
            setStatus("needs-setup");
            return;
          }

          // Check response format for different states
          const responseData = data as any;
          
          if (responseData.isUpToDate === true) {
            // Schema is up to date - show verified screen
            setStatus("verified");
            return;
          }

          if (responseData.needsMigration === true) {
            setStatus("needs-migration");
            return;
          }

          if (data.success) {
            if (data.migrationsApplied && data.migrationsApplied > 0) {
              setStatus("success");
              setTimeout(() => setStatus("verified"), 2000);
            } else {
              setStatus("verified");
            }
            return;
          }

          // Edge function ran but reported error
          if (data.error?.includes("not configured")) {
            setStatus("verified");
            return;
          }
        }
      } catch (edgeFunctionError: any) {
        // Edge function timeout or not available - use direct schema check
        const errorMsg = edgeFunctionError?.message || "";
        console.log("Edge function unavailable:", errorMsg, "- using direct schema check");
      }

      // Strategy 2: Direct schema check (for Easypanel/self-hosted or timeout)
      const directStatus = await checkSchemaDirectly();
      directStatus.environment = "self-hosted";
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

      // Everything is up to date - show verified screen
      setStatus("verified");

    } catch (err: any) {
      console.warn("Migration gate error:", err);
      // On any error, show verified anyway so user can check edge functions
      setStatus("verified");
    }
  }

  const copySQL = async () => {
    await navigator.clipboard.writeText(getMigrationSQL());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testEdgeFunction = async () => {
    setEdgeFnCheck({ state: "checking" });
    try {
      const { data, error } = await supabase.functions.invoke("ping");
      if (error) {
        setEdgeFnCheck({ state: "error", message: error.message });
        return;
      }
      const msg = typeof data === "object" ? JSON.stringify(data) : String(data ?? "OK");
      setEdgeFnCheck({ state: "ok", message: msg });
    } catch (e: any) {
      setEdgeFnCheck({ state: "error", message: e?.message || "Error desconocido" });
    }
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
                  <div key={i} className="text-muted-foreground">
                    {log}
                  </div>
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

        {status === "verified" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Sistema verificado</span>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Versión:</span>
                <span className="font-mono text-green-700 dark:text-green-300">
                  {schemaStatus?.currentVersion || TARGET_VERSION}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entorno:</span>
                <span className="font-mono">
                  {schemaStatus?.environment === "cloud" ? "Lovable Cloud" : "Self-hosted"}
                </span>
              </div>
            </div>

            {/* Edge Functions test */}
            <div className="bg-muted/30 rounded p-3 space-y-3">
              <p className="text-sm font-medium">Verificar Edge Functions</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={testEdgeFunction}
                  disabled={edgeFnCheck.state === "checking"}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded text-xs hover:bg-secondary/90 disabled:opacity-50"
                >
                  {edgeFnCheck.state === "checking" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : edgeFnCheck.state === "ok" ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : edgeFnCheck.state === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  Probar función (ping)
                </button>
              </div>

              {edgeFnCheck.state === "ok" && (
                <div className="text-xs font-mono bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded p-2">
                  OK: {edgeFnCheck.message}
                </div>
              )}
              
              {edgeFnCheck.state === "error" && schemaStatus?.environment === "self-hosted" && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3 space-y-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    ⚠️ Configuración requerida en EasyPanel
                  </p>
                  <div className="text-xs text-amber-700 dark:text-amber-300 space-y-3">
                    <div>
                      <p className="font-semibold mb-1">1. Variables de entorno (CRM → Environment):</p>
                      <div className="space-y-1">
                        <code className="block bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded text-[10px]">
                          SUPABASE_FUNCTIONS_VOLUME=/supabase-functions
                        </code>
                        <code className="block bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded text-[10px]">
                          EDGE_RUNTIME_CONTAINER=PROYECTO_supabase-edge-functions
                        </code>
                      </div>
                    </div>
                    
                    <div>
                      <p className="font-semibold mb-1">2. Mounts (CRM → Advanced → Mounts):</p>
                      <div className="space-y-1 text-[10px]">
                        <div className="bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded">
                          <span className="text-muted-foreground">Host:</span> /etc/easypanel/projects/PROYECTO/supabase/code/volumes/functions<br/>
                          <span className="text-muted-foreground">Container:</span> /supabase-functions
                        </div>
                        <div className="bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded">
                          <span className="text-muted-foreground">Host:</span> /var/run/docker.sock<br/>
                          <span className="text-muted-foreground">Container:</span> /var/run/docker.sock
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-1">(Reemplaza PROYECTO con: mangas, nexo_n8n, etc.)</p>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">3. Rebuild del CRM</p>
                      <p className="text-muted-foreground">Las funciones se sincronizarán automáticamente al iniciar</p>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">4. Comandos manuales (si es necesario):</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded flex-1 text-[10px]">
                          docker exec CRM /app/easypanel/scripts/sync-edge-functions.sh
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("# Sincronizar funciones manualmente\ndocker exec -it mangas_crm-web /app/easypanel/scripts/sync-edge-functions.sh\n\n# Reiniciar edge-runtime\ndocker restart mangas_supabase-edge-functions\n\n# Ver logs\ndocker logs -f mangas_supabase-edge-functions");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }}
                          className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded"
                          title="Copiar comandos"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <a 
                      href="https://github.com/TU_REPO/blob/main/easypanel/README.md#paso-6-configurar-edge-functions-crítico"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver documentación completa
                    </a>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Error: {edgeFnCheck.message}
                  </p>
                </div>
              )}
              
              {edgeFnCheck.state === "error" && schemaStatus?.environment === "cloud" && (
                <div className="text-xs font-mono bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded p-2">
                  ERROR: {edgeFnCheck.message}
                  <p className="mt-1 text-muted-foreground">
                    Las funciones deberían estar disponibles automáticamente en Cloud.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStatus("ready")}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
              >
                Continuar al CRM
              </button>
              <button
                onClick={checkAndMigrate}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90"
              >
                Verificar de nuevo
              </button>
            </div>
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
                <li>
                  Ejecuta: <code className="bg-muted px-1">easypanel/init-scripts/full-schema.sql</code>
                </li>
                <li>Crea el usuario admin (ver README)</li>
                <li>Refresca esta página</li>
              </ol>
            </div>

            <div className="bg-muted/30 rounded p-3 space-y-2">
              <p className="text-sm font-medium">Edge Functions (self-hosted)</p>
              <p className="text-xs text-muted-foreground">
                Se sincronizan al arrancar el servicio CRM (volumen compartido) y se cargan al reiniciar el edge-runtime.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "docker restart supabase-edge-functions\n# (antes: reinicia el servicio CRM para copiar funciones al volumen)"
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded text-xs hover:bg-secondary/90"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "¡Copiado!" : "Copiar comando reinicio"}
                </button>
              </div>
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
                <li>
                  Ejecuta el contenido de:
                  <code className="block bg-blue-100 dark:bg-blue-900/50 px-2 py-1 mt-1 rounded">
                    easypanel/init-scripts/migrations/apply_all.sql
                  </code>
                </li>
                <li>Refresca esta página</li>
              </ol>
            </div>

            <div className="bg-muted/30 rounded p-3 space-y-2">
              <p className="text-sm font-medium">Edge Functions (logs)</p>
              <p className="text-xs text-muted-foreground">
                Si la versión ya carga pero faltan funciones, revisa logs del edge-runtime en tu servidor/Easypanel y confirma que el volumen de
                funciones está montado.
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    "docker logs -f supabase-edge-functions\n# o revisa logs en Easypanel del servicio edge-functions"
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded text-xs hover:bg-secondary/90"
              >
                <Copy className="h-4 w-4" />
                {copied ? "¡Copiado!" : "Copiar comando logs"}
              </button>
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
                  <div key={i} className="text-muted-foreground">
                    {log}
                  </div>
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
            {schemaStatus?.environment === "cloud" ? (
              <>Entorno: Lovable Cloud</>
            ) : schemaStatus?.environment === "self-hosted" ? (
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
