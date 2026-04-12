"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  visibleColumns?: string[];
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  className,
  visibleColumns,
}: DataTableProps<T>) {
  // Filter columns based on visibility if provided
  const displayColumns = visibleColumns
    ? columns.filter((col) => visibleColumns.includes(col.key) || col.key === "actions")
    : columns;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {displayColumns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {displayColumns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render
                      ? col.render(item)
                      : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium">{data.length}</span> resultados
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
            1
          </Button>
          <Button variant="outline" size="sm">
            2
          </Button>
          <Button variant="outline" size="sm">
            3
          </Button>
          <Button variant="outline" size="sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
