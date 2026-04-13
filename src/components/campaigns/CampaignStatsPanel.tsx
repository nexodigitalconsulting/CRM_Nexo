"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Send, MessageSquare, UserCheck, TrendingUp } from "lucide-react";
import type { Campaign } from "@/hooks/useCampaigns";

interface Props {
  campaigns: Campaign[];
}

const channelLabels: Record<string, string> = {
  email: "Email",
  phone: "Teléfono",
  web: "Web",
  whatsapp: "WhatsApp",
};

export function CampaignStatsPanel({ campaigns }: Props) {
  const stats = useMemo(() => {
    const total = campaigns.length;
    const sent = campaigns.filter((c) => c.sent_at || ["enviado", "respondido", "cliente", "descartado"].includes(c.status)).length;
    const responded = campaigns.filter((c) => c.response_at || c.status === "respondido" || c.status === "cliente").length;
    const clients = campaigns.filter((c) => c.status === "cliente").length;
    const discarded = campaigns.filter((c) => c.status === "descartado").length;

    const byChannel: Record<string, number> = {};
    campaigns.forEach((c) => {
      if (c.response_channel) {
        byChannel[c.response_channel] = (byChannel[c.response_channel] ?? 0) + 1;
      }
    });

    return {
      total,
      sent,
      responded,
      clients,
      discarded,
      sendRate: total > 0 ? Math.round((sent / total) * 100) : 0,
      responseRate: sent > 0 ? Math.round((responded / sent) * 100) : 0,
      conversionRate: responded > 0 ? Math.round((clients / responded) * 100) : 0,
      byChannel,
    };
  }, [campaigns]);

  const funnelData = [
    { label: "Captados", value: stats.total, color: "hsl(var(--muted-foreground))" },
    { label: "Enviados", value: stats.sent, color: "hsl(var(--primary))" },
    { label: "Respondidos", value: stats.responded, color: "hsl(var(--warning))" },
    { label: "Clientes", value: stats.clients, color: "hsl(var(--success))" },
  ];

  const channelData = Object.entries(stats.byChannel).map(([k, v]) => ({
    name: channelLabels[k] ?? k,
    value: v,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* KPI Cards */}
      <div className="lg:col-span-1 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Send className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Tasa envío</span>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.sendRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.sent}/{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Tasa respuesta</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.responseRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.responded}/{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Conversión</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">{stats.clients} clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{stats.discarded} descartados</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Embudo de conversión</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 60, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => [v, "leads"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Channel breakdown */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Respuestas por canal</CardTitle>
        </CardHeader>
        <CardContent>
          {channelData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin datos de canal aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={channelData} margin={{ left: 0, right: 10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={24} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
