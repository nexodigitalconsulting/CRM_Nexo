import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, Check, Clock, Copy, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MigrationStatus {
  success: boolean;
  currentVersion: string;
  targetVersion: string;
  isUpToDate: boolean;
  needsMigration?: boolean;
  missingComponents?: string[];
  logs?: string[];
  error?: string;
}

interface SchemaVersion {
  version: string;
  description: string | null;
  applied_at: string | null;
}

const PENDING_SQL: Record<string, string> = {
  "v1.4.0": `-- Migración v1.4.0: Columnas is_sent y sent_at en invoices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'is_sent') THEN
    ALTER TABLE public.invoices ADD COLUMN is_sent boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'sent_at') THEN
    ALTER TABLE public.invoices ADD COLUMN sent_at timestamptz;
  END IF;
END $$;

-- Registrar migración
INSERT INTO schema_versions (version, description) 
VALUES ('v1.4.0', 'Columnas is_sent y sent_at en invoices')
ON CONFLICT DO NOTHING;`,
};

export function DatabaseStatus() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [appliedVersions, setAppliedVersions] = useState<SchemaVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      // Llamar a la edge function
      const { data, error } = await supabase.functions.invoke("db-migrate");
      
      if (error) {
        toast.error("Error al verificar estado: " + error.message);
        return;
      }
      
      setStatus(data);
      
      // Obtener versiones aplicadas
      const { data: versions } = await supabase
        .from("schema_versions")
        .select("version, description, applied_at")
        .order("applied_at", { ascending: true });
      
      if (versions) {
        setAppliedVersions(versions);
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const copySQL = (sql: string) => {
    navigator.clipboard.writeText(sql);
    toast.success("SQL copiado al portapapeles");
  };

  const getPendingVersions = () => {
    if (!status) return [];
    const appliedSet = new Set(appliedVersions.map(v => v.version));
    return Object.keys(PENDING_SQL).filter(v => !appliedSet.has(v));
  };

  const pendingVersions = getPendingVersions();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Estado de Base de Datos
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Verificar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado general */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Versión actual</p>
              <Badge variant="outline" className="font-mono">
                {status.currentVersion}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Versión objetivo</p>
              <Badge variant="secondary" className="font-mono">
                {status.targetVersion}
              </Badge>
            </div>
            <div className="space-y-1 col-span-2">
              <p className="text-sm text-muted-foreground">Estado</p>
              {status.isUpToDate ? (
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                  <Check className="h-3 w-3 mr-1" />
                  Actualizado
                </Badge>
              ) : (
                <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Migraciones pendientes
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Migraciones aplicadas */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Historial de migraciones</h4>
          <div className="space-y-2">
            {appliedVersions.map((v) => (
              <div 
                key={v.version} 
                className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
              >
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-mono">{v.version}</span>
                <span className="text-muted-foreground">- {v.description}</span>
                {v.applied_at && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(v.applied_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
            {pendingVersions.map((v) => (
              <div 
                key={v} 
                className="flex items-center gap-2 text-sm p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20"
              >
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="font-mono">{v}</span>
                <span className="text-muted-foreground">- Pendiente</span>
              </div>
            ))}
          </div>
        </div>

        {/* Componentes faltantes */}
        {status?.missingComponents && status.missingComponents.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Componentes faltantes:</strong>
              <ul className="list-disc list-inside mt-2">
                {status.missingComponents.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* SQL pendiente */}
        {pendingVersions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">SQL pendiente de ejecutar</h4>
            <p className="text-sm text-muted-foreground">
              Ejecuta este SQL en tu base de datos PostgreSQL externa:
            </p>
            {pendingVersions.map((v) => (
              <div key={v} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{v}</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copySQL(PENDING_SQL[v])}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar SQL
                  </Button>
                </div>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-48">
                  {PENDING_SQL[v]}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Info self-hosted */}
        <div className="text-sm text-muted-foreground border-t pt-4">
          <strong>Self-hosted:</strong> Las migraciones SQL deben ejecutarse manualmente 
          en tu PostgreSQL externo. Usa el SQL de arriba o los archivos en{" "}
          <code className="bg-muted px-1 rounded">easypanel/init-scripts/migrations/</code>
        </div>
      </CardContent>
    </Card>
  );
}
