"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatWidgetProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  format?: "number" | "currency" | "percent";
}

export function StatWidget({
  title,
  value,
  change,
  icon: Icon,
  trend = "neutral",
  format = "number",
}: StatWidgetProps) {
  const formatValue = (val: string | number) => {
    if (format === "currency") {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(Number(val));
    }
    if (format === "percent") {
      return `${val}%`;
    }
    return new Intl.NumberFormat("es-ES").format(Number(val));
  };

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{formatValue(value)}</p>
        {change && (
          <div className="flex items-center gap-1 text-xs">
            {trend === "up" && (
              <TrendingUp className="h-3 w-3 text-success" />
            )}
            {trend === "down" && (
              <TrendingDown className="h-3 w-3 text-destructive" />
            )}
            <span
              className={cn(
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {change.value > 0 ? "+" : ""}
              {change.value}%
            </span>
            <span className="text-muted-foreground">{change.label}</span>
          </div>
        )}
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}
