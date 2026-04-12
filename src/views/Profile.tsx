"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Phone, Save, Key } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ProfileData {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/data/profiles?userId=${user.id}`);
      if (!res.ok) return null;
      return res.json() as Promise<ProfileData | null>;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
      });
    } else if (user) {
      setFormData({
        full_name: user.name || "",
        phone: "",
      });
    }
  }, [profile, user]);

  const updateProfile = useMutation({
    mutationFn: async (data: { full_name: string; phone: string }) => {
      if (!user?.id) throw new Error("No user");
      const res = await fetch("/api/data/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...data }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil actualizado");
    },
    onError: (error) => {
      toast.error("Error al actualizar: " + error.message);
    },
  });

  const updatePassword = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Contraseña actualizada");
    },
    onError: (error) => {
      toast.error("Error al cambiar contraseña: " + error.message);
    },
  });

  const handleSaveProfile = () => {
    updateProfile.mutate(formData);
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    updatePassword.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return "U";
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Mi Perfil"
        subtitle="Gestiona tu información personal"
      />

      <div className="p-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials(formData.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{formData.full_name || "Sin nombre"}</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateProfile.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Cambiar Contraseña
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={updatePassword.isPending || !passwordData.newPassword || !passwordData.currentPassword}
              variant="outline"
              className="gap-2"
            >
              <Key className="h-4 w-4" />
              {updatePassword.isPending ? "Cambiando..." : "Cambiar Contraseña"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
