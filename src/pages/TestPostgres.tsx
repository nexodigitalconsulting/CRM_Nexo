import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { externalPg } from "@/integrations/external-postgres/client";
import { 
  CheckCircle2, XCircle, Loader2, Database, 
  RefreshCw, Plus, Trash2, ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

interface TestResult {
  name: string;
  status: "pending" | "running" | "success" | "error";
  message?: string;
  data?: unknown;
}

export default function TestPostgres() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testClientName, setTestClientName] = useState("Cliente Test " + Date.now());

  const updateResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...update } : r));
  };

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Conexión básica - SELECT de services
    const test1Name = "1. Conexión básica (SELECT services)";
    addResult({ name: test1Name, status: "running" });
    
    try {
      const { data, error } = await externalPg.from("services").select("*").limit(5);
      if (error) throw error;
      updateResult(test1Name, { 
        status: "success", 
        message: `✓ ${data?.length || 0} servicios encontrados`,
        data 
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      updateResult(test1Name, { status: "error", message: errMsg });
    }

    // Test 2: SELECT con filtros
    const test2Name = "2. SELECT con filtros (clients activos)";
    addResult({ name: test2Name, status: "running" });
    
    try {
      const { data, error } = await externalPg
        .from("clients")
        .select("id, name, email, status")
        .eq("status", "active")
        .limit(10);
      if (error) throw error;
      updateResult(test2Name, { 
        status: "success", 
        message: `✓ ${data?.length || 0} clientes activos`,
        data 
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      updateResult(test2Name, { status: "error", message: errMsg });
    }

    // Test 3: INSERT
    const test3Name = "3. INSERT (crear cliente test)";
    addResult({ name: test3Name, status: "running" });
    let insertedId: string | null = null;
    
    try {
      const { data, error } = await externalPg
        .from("clients")
        .insert({
          name: testClientName,
          email: "test@test.com",
          status: "active",
          segment: "pyme"
        });
      if (error) throw error;
      insertedId = (data as any)?.[0]?.id;
      updateResult(test3Name, { 
        status: "success", 
        message: `✓ Cliente creado: ${insertedId?.slice(0, 8)}...`,
        data 
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      updateResult(test3Name, { status: "error", message: errMsg });
    }

    // Test 4: UPDATE
    const test4Name = "4. UPDATE (modificar cliente test)";
    addResult({ name: test4Name, status: "running" });
    
    if (insertedId) {
      try {
        const { data, error } = await externalPg
          .from("clients")
          .eq("id", insertedId)
          .update({
            notes: "Actualizado por test: " + new Date().toISOString()
          });
        if (error) throw error;
        updateResult(test4Name, { 
          status: "success", 
          message: "✓ Cliente actualizado correctamente",
          data 
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        updateResult(test4Name, { status: "error", message: errMsg });
      }
    } else {
      updateResult(test4Name, { 
        status: "error", 
        message: "No se pudo ejecutar (INSERT falló)" 
      });
    }

    // Test 5: DELETE
    const test5Name = "5. DELETE (eliminar cliente test)";
    addResult({ name: test5Name, status: "running" });
    
    if (insertedId) {
      try {
        const { data, error } = await externalPg
          .from("clients")
          .eq("id", insertedId)
          .delete();
        if (error) throw error;
        updateResult(test5Name, { 
          status: "success", 
          message: "✓ Cliente eliminado correctamente",
          data 
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        updateResult(test5Name, { status: "error", message: errMsg });
      }
    } else {
      updateResult(test5Name, { 
        status: "error", 
        message: "No se pudo ejecutar (INSERT falló)" 
      });
    }

    // Test 6: Verificar company_settings
    const test6Name = "6. Verificar company_settings";
    addResult({ name: test6Name, status: "running" });
    
    try {
      const { data, error } = await externalPg
        .from("company_settings")
        .select("*")
        .limit(1);
      if (error) throw error;
      updateResult(test6Name, { 
        status: "success", 
        message: data?.length ? `✓ Empresa: ${(data[0] as any)?.name}` : "⚠️ Sin configuración",
        data 
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      updateResult(test6Name, { status: "error", message: errMsg });
    }

    setIsRunning(false);
    
    const successCount = results.filter(r => r.status === "success").length;
    if (successCount === 6) {
      toast.success("¡Todos los tests pasaron!");
    } else {
      toast.warning("Algunos tests fallaron. Revisa los resultados.");
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Test PostgreSQL Externo</h1>
            <p className="text-muted-foreground">
              Verifica la conexión y operaciones CRUD
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Conexión PostgreSQL Externa
            </CardTitle>
            <CardDescription>
              Esta página prueba la conexión al PostgreSQL de Easypanel a través del Edge Function proxy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium">Edge Function</p>
                <p className="text-muted-foreground font-mono text-xs">postgres-proxy</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium">Cliente</p>
                <p className="text-muted-foreground font-mono text-xs">externalPg</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nombre del cliente de prueba</Label>
              <Input 
                value={testClientName}
                onChange={(e) => setTestClientName(e.target.value)}
                placeholder="Nombre para el cliente de prueba"
              />
            </div>

            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ejecutando tests...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Ejecutar Tests
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    result.status === "success" ? "bg-green-500/10" :
                    result.status === "error" ? "bg-destructive/10" :
                    "bg-muted"
                  }`}
                >
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <p className="font-medium">{result.name}</p>
                    {result.message && (
                      <p className={`text-sm ${
                        result.status === "error" ? "text-destructive" : "text-muted-foreground"
                      }`}>
                        {result.message}
                      </p>
                    )}
                    {result.data && result.status === "success" && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">
                          Ver datos
                        </summary>
                        <pre className="mt-1 text-xs bg-background p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="pt-4 border-t">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {results.filter(r => r.status === "success").length} pasaron
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-destructive" />
                    {results.filter(r => r.status === "error").length} fallaron
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
