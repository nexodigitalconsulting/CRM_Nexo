"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "./button";
import { ColumnFilter, useColumnFilters, ColumnFilterState } from "@/components/common/ColumnFilter";
import { Badge } from "./badge";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  filterable?: boolean; // Whether this column should have a filter
  sortable?: boolean; // Whether this column should be sortable
}

interface FilterableDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  visibleColumns?: string[];
}

export function FilterableDataTable<T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  className,
  visibleColumns,
}: FilterableDataTableProps<T>) {
  const {
    filters,
    sortConfig,
    filteredData,
    hasActiveFilters,
    handleFilterChange,
    handleSort,
    clearAllFilters,
  } = useColumnFilters(data);

  // Filter columns based on visibility if provided
  const displayColumns = visibleColumns
    ? columns.filter((col) => visibleColumns.includes(col.key) || col.key === "actions")
    : columns;

  // Get column values for filter dropdowns
  const getColumnValues = (key: string) => {
    return data.map(item => (item as Record<string, unknown>)[key]);
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(
    f => f.selectedValues.size > 0 || f.searchTerm
  ).length;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      {/* Active filters bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">Filtros activos:</span>
          <Badge variant="secondary" className="text-xs">
            {activeFilterCount} {activeFilterCount === 1 ? "columna" : "columnas"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({filteredData.length} de {data.length} registros)
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs ml-auto"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar filtros
          </Button>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {displayColumns.map((col) => {
                const isFilterable = col.filterable !== false && col.key !== "actions";
                
                return (
                  <th key={col.key} className={cn("p-0", col.className)}>
                    {isFilterable ? (
                      <div className="px-3 py-2">
                        <ColumnFilter
                          columnKey={col.key}
                          label={col.label}
                          values={getColumnValues(col.key) as (string | number | null | undefined)[]}
                          filterState={filters[col.key]}
                          onFilterChange={handleFilterChange}
                          onSort={handleSort}
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-xs font-medium">
                        {col.label}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={displayColumns.length} className="text-center py-8 text-muted-foreground">
                  {hasActiveFilters 
                    ? "No hay resultados con los filtros aplicados"
                    : "No hay datos"}
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium">{filteredData.length}</span> de{" "}
          <span className="font-medium">{data.length}</span> resultados
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
