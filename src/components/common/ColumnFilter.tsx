import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  X,
  Filter,
  Check,
  ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnFilterState {
  searchTerm: string;
  selectedValues: Set<string>;
  sortDirection: "asc" | "desc" | null;
}

export interface ColumnFilterProps {
  columnKey: string;
  label: string;
  values: (string | number | null | undefined)[];
  filterState?: ColumnFilterState;
  onFilterChange: (columnKey: string, state: ColumnFilterState) => void;
  onSort?: (columnKey: string, direction: "asc" | "desc" | null) => void;
}

export function ColumnFilter({
  columnKey,
  label,
  values,
  filterState,
  onFilterChange,
  onSort,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filterState?.searchTerm || "");
  const [selectedValues, setSelectedValues] = useState<Set<string>>(
    filterState?.selectedValues || new Set()
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    filterState?.sortDirection || null
  );

  // Update internal state when filterState prop changes
  useEffect(() => {
    if (filterState) {
      setSearchTerm(filterState.searchTerm);
      setSelectedValues(filterState.selectedValues);
      setSortDirection(filterState.sortDirection);
    }
  }, [filterState]);

  // Get unique values for the column
  const uniqueValues = useMemo(() => {
    const seen = new Set<string>();
    const result: { value: string; display: string; count: number }[] = [];
    
    values.forEach((v) => {
      const strValue = v == null ? "(Vacío)" : String(v);
      if (!seen.has(strValue)) {
        seen.add(strValue);
        result.push({
          value: strValue,
          display: strValue,
          count: 0,
        });
      }
      const item = result.find(r => r.value === strValue);
      if (item) item.count++;
    });
    
    return result.sort((a, b) => a.display.localeCompare(b.display));
  }, [values]);

  // Filter unique values by search term
  const filteredUniqueValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    const term = searchTerm.toLowerCase();
    return uniqueValues.filter(v => v.display.toLowerCase().includes(term));
  }, [uniqueValues, searchTerm]);

  const hasActiveFilter = selectedValues.size > 0 || searchTerm;
  const allSelected = selectedValues.size === 0 || selectedValues.size === uniqueValues.length;

  const handleSort = (direction: "asc" | "desc") => {
    const newDirection = sortDirection === direction ? null : direction;
    setSortDirection(newDirection);
    onSort?.(columnKey, newDirection);
  };

  const handleSelectAll = () => {
    setSelectedValues(new Set());
  };

  const handleSelectNone = () => {
    // Select only the first item to effectively filter out everything else
    if (uniqueValues.length > 0) {
      setSelectedValues(new Set([uniqueValues[0].value]));
    }
  };

  const handleToggleValue = (value: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.size === 0) {
      // Currently all selected, now selecting specific one
      uniqueValues.forEach(v => {
        if (v.value !== value) newSelected.add(v.value);
      });
      // Actually we want to deselect everything except this one
      newSelected.clear();
      newSelected.add(value);
    } else if (newSelected.has(value)) {
      newSelected.delete(value);
      if (newSelected.size === 0) {
        // All removed, means all selected
      }
    } else {
      newSelected.add(value);
      // If all are now selected, clear the set
      if (newSelected.size === uniqueValues.length) {
        newSelected.clear();
      }
    }
    setSelectedValues(newSelected);
  };

  const handleApply = () => {
    onFilterChange(columnKey, {
      searchTerm,
      selectedValues,
      sortDirection,
    });
    setOpen(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setSelectedValues(new Set());
    onFilterChange(columnKey, {
      searchTerm: "",
      selectedValues: new Set(),
      sortDirection,
    });
    setOpen(false);
  };

  const isValueSelected = (value: string) => {
    if (selectedValues.size === 0) return true; // All selected
    return selectedValues.has(value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto px-1 py-0.5 gap-1 font-medium text-xs hover:bg-muted/50",
            hasActiveFilter && "text-primary"
          )}
        >
          <span className="truncate">{label}</span>
          {hasActiveFilter ? (
            <Filter className="h-3 w-3 text-primary" />
          ) : sortDirection ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ChevronDown className="h-3 w-3 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 z-50 bg-popover border border-border shadow-lg" 
        align="start"
        sideOffset={4}
      >
        {/* Sort options */}
        <div className="p-2 border-b border-border space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-1 mb-1">Ordenar</p>
          <div className="flex gap-1">
            <Button
              variant={sortDirection === "asc" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => handleSort("asc")}
            >
              <ArrowUp className="h-3 w-3" />
              A → Z
            </Button>
            <Button
              variant={sortDirection === "desc" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => handleSort("desc")}
            >
              <ArrowDown className="h-3 w-3" />
              Z → A
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Select all / none */}
        <div className="px-2 py-1.5 border-b border-border flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleSelectAll}
          >
            Todos
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleSelectNone}
          >
            Ninguno
          </Button>
        </div>

        {/* Value list */}
        <ScrollArea className="h-48">
          <div className="p-1">
            {filteredUniqueValues.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No hay valores
              </p>
            ) : (
              filteredUniqueValues.map((item) => (
                <div
                  key={item.value}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggleValue(item.value)}
                >
                  <Checkbox
                    checked={isValueSelected(item.value)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs flex-1 truncate">{item.display}</span>
                  <span className="text-xs text-muted-foreground">({item.count})</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-2 border-t border-border flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleClear}
          >
            Limpiar
          </Button>
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleApply}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook to manage column filters state
export function useColumnFilters<T>(data: T[]) {
  const [filters, setFilters] = useState<Record<string, ColumnFilterState>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const handleFilterChange = (columnKey: string, state: ColumnFilterState) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: state,
    }));
  };

  const handleSort = (columnKey: string, direction: "asc" | "desc" | null) => {
    if (direction) {
      setSortConfig({ key: columnKey, direction });
    } else {
      setSortConfig(null);
    }
    // Update the filter state for this column
    setFilters(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        sortDirection: direction,
      },
    }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setSortConfig(null);
  };

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([key, state]) => {
      if (state.selectedValues.size > 0) {
        result = result.filter(item => {
          const value = (item as Record<string, unknown>)[key];
          const strValue = value == null ? "(Vacío)" : String(value);
          return state.selectedValues.has(strValue);
        });
      }
      
      if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        result = result.filter(item => {
          const value = (item as Record<string, unknown>)[key];
          const strValue = value == null ? "" : String(value).toLowerCase();
          return strValue.includes(term);
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = (a as Record<string, unknown>)[sortConfig.key];
        const bValue = (b as Record<string, unknown>)[sortConfig.key];
        
        // Handle null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        // Compare values
        let comparison = 0;
        if (typeof aValue === "number" && typeof bValue === "number") {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return sortConfig.direction === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, [data, filters, sortConfig]);

  const hasActiveFilters = Object.values(filters).some(
    f => f.selectedValues.size > 0 || f.searchTerm
  );

  return {
    filters,
    sortConfig,
    filteredData,
    hasActiveFilters,
    handleFilterChange,
    handleSort,
    clearAllFilters,
  };
}
