"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Monitor, Key, LogOut } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface SessionRow {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

async function fetchSessions(): Promise<SessionRow[]> {
  const res = await fetch("/api/data/users/sessions");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<SessionRow[]>;
}

async function revokeSession(id: string) {
  const res = await fetch(`/api/data/users/sessions/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "Dispositivo desconocido";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return ua.slice(0, 40);
}

function parseOS(ua: string | null): string {
  if (!ua) return "";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "";
}

export function SecuritySettings() {
  const qc = useQueryClient();
  const { data: sessions, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: fetchSessions });

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const revokeSessionMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Sesión cerrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error("Las contraseñas no coinciden"); return; }
    if (newPwd.length < 8) { toast.error("Mínimo 8 caracteres"); return; }
    setChangingPwd(true);
    try {
      await authClient.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      toast.success("Contraseña actualizada");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar contraseña");
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1">
            <Label>Contraseña actual</Label>
            <Input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1">
            <Label>Nueva contraseña</Label>
            <Input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-1">
            <Label>Confirmar nueva contraseña</Label>
            <Input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Repite la contraseña"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPwd || !currentPwd || !newPwd || !confirmPwd}
          >
            {changingPwd ? "Guardando..." : "Actualizar contraseña"}
          </Button>
        </CardContent>
      </Card>

      {/* Active sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Sesiones activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="divide-y">
              {(sessions ?? []).map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <Monitor className="h-8 w-8 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {parseBrowser(s.userAgent)}
                      {parseOS(s.userAgent) && (
                        <span className="text-muted-foreground font-normal"> · {parseOS(s.userAgent)}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.ipAddress ?? "IP desconocida"} · Iniciada{" "}
                      {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => revokeSessionMutation.mutate(s.id)}
                    title="Cerrar sesión"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(sessions ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No hay sesiones activas</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2FA info card */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Autenticación en dos factores (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            La autenticación en dos factores añade una capa extra de seguridad.
            Actívala añadiendo el plugin <code>twoFactor()</code> en Better Auth.
          </p>
          <div className="rounded-md bg-muted/50 border p-3 text-xs space-y-2">
            <p className="font-medium">Para activar 2FA TOTP en producción:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Añade <code>twoFactor()</code> en <code>src/lib/auth.ts</code> plugins</li>
              <li>Añade <code>twoFactorClient()</code> en <code>src/lib/auth-client.ts</code></li>
              <li>Ejecuta migración para columnas <code>twoFactorEnabled</code>, <code>twoFactorSecret</code></li>
              <li>Usa <code>authClient.twoFactor.enable()</code> desde el perfil del usuario</li>
            </ol>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 border">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Estado: <strong>No configurado</strong> — Las sesiones están protegidas con tokens JWT de 7 días.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
