import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Database, Loader2, UserPlus, AlertCircle, Rocket } from "lucide-react";

type SetupStep = "check" | "schema" | "admin" | "complete";

interface StepStatus {
  schema: "pending" | "running" | "success" | "error";
  admin: "pending" | "running" | "success" | "error";
}

export default function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<SetupStep>("check");
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    schema: "pending",
    admin: "pending",
  });
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [schemaLog, setSchemaLog] = useState<string[]>([]);

  // Verificar si ya está configurado
  const checkSetupStatus = async () => {
    setIsLoading(true);
    try {
      // Verificar si existen las tablas principales
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (!error && profiles) {
        // Ya está configurado, verificar si hay admin
        const { data: admins } = await supabase
          .from("user_roles")
          .select("id")
          .eq("role", "admin")
          .limit(1);

        if (admins && admins.length > 0) {
          toast.info("CRM ya configurado. Redirigiendo...");
          navigate("/auth");
          return;
        }
        // Tablas existen pero no hay admin
        setStepStatus((prev) => ({ ...prev, schema: "success" }));
        setCurrentStep("admin");
      } else {
        // No hay tablas, empezar desde schema
        setCurrentStep("schema");
      }
    } catch (error) {
      setCurrentStep("schema");
    } finally {
      setIsLoading(false);
    }
  };

  // Ejecutar schema
  const executeSchema = async () => {
    setIsLoading(true);
    setStepStatus((prev) => ({ ...prev, schema: "running" }));
    setSchemaLog(["Iniciando configuración de base de datos..."]);

    try {
      const { data, error } = await supabase.functions.invoke("setup-database", {
        body: { action: "init" },
      });

      if (error) throw error;

      if (data?.success) {
        setSchemaLog((prev) => [...prev, ...data.logs, "✅ Schema ejecutado correctamente"]);
        setStepStatus((prev) => ({ ...prev, schema: "success" }));
        toast.success("Base de datos configurada correctamente");
        setCurrentStep("admin");
      } else {
        throw new Error(data?.error || "Error desconocido");
      }
    } catch (error: any) {
      console.error("Error ejecutando schema:", error);
      setSchemaLog((prev) => [...prev, `❌ Error: ${error.message}`]);
      setStepStatus((prev) => ({ ...prev, schema: "error" }));
      toast.error("Error configurando base de datos");
    } finally {
      setIsLoading(false);
    }
  };

  // Crear admin
  const createAdmin = async () => {
    if (!adminEmail || !adminPassword) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }

    if (adminPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);
    setStepStatus((prev) => ({ ...prev, admin: "running" }));

    try {
      // Registrar usuario
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: adminName || "Administrador",
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("No se pudo crear el usuario");
      }

      // Asignar rol admin (la edge function lo hace con service_role)
      const { data, error } = await supabase.functions.invoke("setup-database", {
        body: {
          action: "create-admin",
          userId: authData.user.id,
          email: adminEmail,
          fullName: adminName || "Administrador",
        },
      });

      if (error) throw error;

      setStepStatus((prev) => ({ ...prev, admin: "success" }));
      toast.success("Administrador creado correctamente");
      setCurrentStep("complete");
    } catch (error: any) {
      console.error("Error creando admin:", error);
      setStepStatus((prev) => ({ ...prev, admin: "error" }));
      toast.error(error.message || "Error creando administrador");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIcon = (status: "pending" | "running" | "success" | "error") => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración Inicial del CRM</CardTitle>
          <CardDescription>
            Configura la base de datos y crea el usuario administrador
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {renderStepIcon(stepStatus.schema)}
              <span className="text-sm font-medium">Base de datos</span>
            </div>
            <div className="h-px flex-1 bg-border mx-4" />
            <div className="flex items-center gap-2">
              {renderStepIcon(stepStatus.admin)}
              <span className="text-sm font-medium">Administrador</span>
            </div>
          </div>

          {/* Check Step */}
          {currentStep === "check" && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Verificaremos el estado de tu instalación
              </p>
              <Button onClick={checkSetupStatus} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Comenzar configuración"
                )}
              </Button>
            </div>
          )}

          {/* Schema Step */}
          {currentStep === "schema" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Database className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Inicializar Base de Datos</p>
                  <p className="text-sm text-muted-foreground">
                    Se crearán todas las tablas, funciones y políticas RLS
                  </p>
                </div>
              </div>

              {schemaLog.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs font-mono">
                    {schemaLog.map((log, i) => (
                      <div key={i} className="py-0.5">
                        {log}
                      </div>
                    ))}
                  </pre>
                </div>
              )}

              <Button
                onClick={executeSchema}
                disabled={isLoading || stepStatus.schema === "success"}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Configurando...
                  </>
                ) : stepStatus.schema === "success" ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Completado
                  </>
                ) : stepStatus.schema === "error" ? (
                  "Reintentar"
                ) : (
                  "Ejecutar configuración"
                )}
              </Button>
            </div>
          )}

          {/* Admin Step */}
          {currentStep === "admin" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <UserPlus className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Crear Administrador</p>
                  <p className="text-sm text-muted-foreground">
                    Este será el primer usuario con acceso total
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Nombre</Label>
                  <Input
                    id="adminName"
                    placeholder="Tu nombre"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Contraseña *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={createAdmin}
                disabled={isLoading || !adminEmail || !adminPassword}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear administrador"
                )}
              </Button>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === "complete" && (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-lg">¡Configuración completada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu CRM está listo. Inicia sesión con las credenciales del administrador.
                </p>
              </div>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Ir a iniciar sesión
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
