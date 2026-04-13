"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useContracts } from "@/hooks/useContracts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

/** Normalize a contract's total to monthly equivalent based on billing cycle */
function toMonthly(total: number, cycle: string | null): number {
  switch (cycle) {
    case "mensual":    return total;
    case "trimestral": return total / 3;
    case "semestral":  return total / 6;
    case "anual":      return total / 12;
    default:           return total;
  }
}

export function ContractsMrrChart() {
  const { data: contracts, isLoading } = useContracts();

  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = subMonths(now, 11 - i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Include contracts that were active during this month:
      // started before month end AND (ended after month start OR no end date)
      const activeInMonth = (contracts ?? []).filter((c) => {
        if (!c.start_date) return false;
        const start = parseISO(c.start_date);
        const end = c.end_date ? parseISO(c.end_date) : null;
        if (start > monthEnd) return false;
        if (end && end < monthStart) return false;
        return c.status === "vigente" || (end && end >= monthStart && end <= monthEnd);
      });

      const mrr = activeInMonth.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sum, c) => sum + toMonthly(Number(c.total ?? 0), (c as any).billing_period ?? null),
        0
      );

      return {
        month: format(monthDate, "MMM yy", { locale: es }),
        mrr: Math.round(mrr * 100) / 100,
        count: activeInMonth.length,
      };
    });
  }, [contracts]);

  const currentMrr = chartData[chartData.length - 1]?.mrr ?? 0;
  const prevMrr = chartData[chartData.length - 2]?.mrr ?? 0;
  const mrrChange = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">MRR — Ingresos Recurrentes Mensuales</CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{formatCurrency(currentMrr)}</p>
            {mrrChange !== 0 && (
              <p className={`text-xs ${mrrChange >= 0 ? "text-success" : "text-destructive"}`}>
                {mrrChange > 0 ? "+" : ""}{mrrChange.toFixed(1)}% vs mes anterior
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), "MRR"]}
                labelFormatter={(l) => `${l}`}
              />
              <Line
                type="monotone"
                dataKey="mrr"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
