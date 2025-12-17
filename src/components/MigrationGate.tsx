import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";

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
}

type MigrationStatus = "checking" | "migrating" | "success" | "error" | "ready";

export function MigrationGate({ children }: MigrationGateProps) {
  const [status, setStatus] = useState<MigrationStatus>("checking");
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkAndMigrate();
  }, []);

  async function checkAndMigrate() {
    try {
      setStatus("checking");
      
      // Call the db-migrate edge function
      const { data, error } = await supabase.functions.invoke<MigrationResult>("db-migrate");
      
      if (error) {
        // If function doesn't exist or fails, just continue
        console.warn("Migration check skipped:", error.message);
        setStatus("ready");
        return;
      }

      setResult(data);

      if (!data?.success) {
        // If migration failed but it's because no external postgres, just continue
        if (data?.error?.includes("not configured")) {
          setStatus("ready");
          return;
        }
        setStatus("error");
        return;
      }

      // If migrations were applied, show success briefly
      if (data.migrationsApplied && data.migrationsApplied > 0) {
        setStatus("success");
        // Wait a moment to show success message
        setTimeout(() => setStatus("ready"), 2000);
      } else {
        setStatus("ready");
      }
    } catch (err: any) {
      console.warn("Migration gate error:", err);
      // On any error, just continue to the app
      setStatus("ready");
    }
  }

  // If ready, render children directly
  if (status === "ready") {
    return <>{children}</>;
  }

  // Show migration UI
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">CRM System</h1>
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

        {status === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Error en la actualización</span>
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
      </div>
    </div>
  );
}
