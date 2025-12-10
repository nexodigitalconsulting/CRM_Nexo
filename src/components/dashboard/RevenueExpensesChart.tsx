import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useInvoices } from "@/hooks/useInvoices";
import { useExpenses } from "@/hooks/useExpenses";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", { 
    style: "currency", 
    currency: "EUR",
    maximumFractionDigits: 0 
  }).format(value);

export function RevenueExpensesChart() {
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();

  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthInvoices = invoices?.filter((inv) => {
        const date = new Date(inv.issue_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      }) || [];

      const monthExpenses = expenses?.filter((exp) => {
        const date = new Date(exp.issue_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      }) || [];

      const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
      const expenseTotal = monthExpenses.reduce((sum, exp) => sum + Number(exp.total || 0), 0);

      months.push({
        name: format(monthDate, "MMM", { locale: es }),
        ingresos: revenue,
        gastos: expenseTotal,
        balance: revenue - expenseTotal,
      });
    }

    return months;
  }, [invoices, expenses]);

  const isLoading = invoicesLoading || expensesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución Ingresos vs Gastos</CardTitle>
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
        <CardTitle className="text-base">Evolución Ingresos vs Gastos (6 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="name" 
              className="text-xs fill-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [formatCurrency(value)]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="ingresos"
              name="Ingresos"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorIngresos)"
            />
            <Area
              type="monotone"
              dataKey="gastos"
              name="Gastos"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorGastos)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
