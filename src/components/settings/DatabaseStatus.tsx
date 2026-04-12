"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Fase 1: Drizzle ORM manages migrations — no Supabase edge functions needed.
// The `compareVersions` helper is no longer used here.
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface DbStatusResult {
  ok: boolean;
  message: string;
  tablesFound?: number;
}

export function DatabaseStatus() {
  const [status, setStatus] = useState<DbStatusResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json() as { status: string };
      setStatus({
        ok: data.status === "ok",
        message: data.status === "ok"
          ? "Base de datos PostgreSQL conectada y operativa"
          : "Error al conectar con la base de datos",
      });
    } catch (err) {
      setStatus({ ok: false, message: "No se pudo conectar: " + String(err) });
      toast.error("Error al verificar estado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

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
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Verificar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div className="flex items-center gap-3">
            {status.ok ? (
              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                <Check className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">{status.message}</span>
          </div>
        )}

        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Fase 1 — Drizzle ORM:</strong> Las migraciones se gestionan con{" "}
            <code className="bg-muted px-1 rounded">npm run db:migrate</code>.
            El esquema está en <code className="bg-muted px-1 rounded">src/lib/schema.ts</code>.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
