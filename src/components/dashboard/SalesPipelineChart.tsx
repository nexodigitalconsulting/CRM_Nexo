"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useQuotes } from "@/hooks/useQuotes";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", { 
    style: "currency", 
    currency: "EUR",
    maximumFractionDigits: 0 
  }).format(value);

const statusConfig = {
  borrador: { label: "Borrador", color: "hsl(var(--muted-foreground))" },
  enviado: { label: "Enviado", color: "hsl(var(--primary))" },
  aceptado: { label: "Aprobado", color: "hsl(var(--success))" },
  rechazado: { label: "Rechazado", color: "hsl(var(--destructive))" },
};

export function SalesPipelineChart() {
  const { data: quotes, isLoading } = useQuotes();

  const chartData = useMemo(() => {
    if (!quotes) return [];

    const statusGroups = quotes.reduce((acc, quote) => {
      const status = quote.status || "borrador";
      if (!acc[status]) {
        acc[status] = { count: 0, total: 0 };
      }
      acc[status].count += 1;
      acc[status].total += Number(quote.total || 0);
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return Object.entries(statusConfig).map(([status, config]) => ({
      name: config.label,
      status,
      cantidad: statusGroups[status]?.count || 0,
      valor: statusGroups[status]?.total || 0,
      color: config.color,
    }));
  }, [quotes]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pipeline de Ventas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [
                name === "valor" ? formatCurrency(value) : value,
                name === "valor" ? "Valor" : "Cantidad"
              ]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar yAxisId="left" dataKey="valor" name="valor" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Summary */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
          {chartData.map((item) => (
            <div key={item.status} className="text-center">
              <div 
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ backgroundColor: item.color }}
              />
              <p className="text-xs text-muted-foreground">{item.name}</p>
              <p className="text-sm font-semibold">{item.cantidad}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
