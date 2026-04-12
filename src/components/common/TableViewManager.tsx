"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Settings2, Columns, Save, Trash2, Eye, Database, Loader2 } from "lucide-react";
import { useTableViews, useCreateTableView, useDeleteTableView, TableView } from "@/hooks/useTableViews";
import { toast } from "sonner";

export interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface TableViewManagerProps {
  entityName: string;
  columns: ColumnConfig[];
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
  tableName?: string;
  filters?: Record<string, unknown>;
}

export function TableViewManager({
  entityName,
  columns,
  visibleColumns,
  onVisibleColumnsChange,
  tableName,
  filters = {},
}: TableViewManagerProps) {
  const { data: views, isLoading } = useTableViews(entityName);
  const createView = useCreateTableView();
  const deleteView = useDeleteTableView();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);

  const toggleColumn = (key: string) => {
    if (visibleColumns.includes(key)) {
      // Don't allow hiding all columns
      if (visibleColumns.length > 1) {
        onVisibleColumnsChange(visibleColumns.filter((c) => c !== key));
      }
    } else {
      onVisibleColumnsChange([...visibleColumns, key]);
    }
  };

  const handleSaveView = async () => {
    if (!viewName.trim()) {
      toast.error("Introduce un nombre para la vista");
      return;
    }

    await createView.mutateAsync({
      entity_name: entityName,
      view_name: viewName,
      visible_columns: visibleColumns,
      is_default: isDefault,
      filters,
    });

    setSaveDialogOpen(false);
    setViewName("");
    setIsDefault(false);
  };

  const handleLoadView = (view: TableView) => {
    onVisibleColumnsChange(view.visible_columns);
    toast.success(`Vista "${view.view_name}" cargada`);
  };

  const handleDeleteView = async (view: TableView) => {
    await deleteView.mutateAsync({ id: view.id, entityName: view.entity_name });
  };

  const generateSQL = () => {
    if (!tableName) return "";

    const selectedCols = columns
      .filter((c) => visibleColumns.includes(c.key) && c.key !== "actions")
      .map((c) => c.key);

    const whereConditions: string[] = [];
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        whereConditions.push(`${key} = '${value}'`);
      }
    });

    let sql = `SELECT ${selectedCols.length > 0 ? selectedCols.join(", ") : "*"}\nFROM ${tableName}`;
    
    if (whereConditions.length > 0) {
      sql += `\nWHERE ${whereConditions.join("\n  AND ")}`;
    }

    sql += `\nORDER BY created_at DESC;`;

    return sql;
  };

  const copySQL = () => {
    const sql = generateSQL();
    navigator.clipboard.writeText(sql);
    toast.success("SQL copiado al portapapeles");
    setSqlDialogOpen(false);
  };

  const downloadSQL = () => {
    const sql = generateSQL();
    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entityName}_query.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Archivo SQL descargado");
    setSqlDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Column visibility */}
          <DropdownMenuLabel className="flex items-center gap-2">
            <Columns className="h-4 w-4" />
            Columnas visibles
          </DropdownMenuLabel>
          <div className="max-h-48 overflow-y-auto">
            {columns
              .filter((c) => c.key !== "actions")
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.includes(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
          </div>

          <DropdownMenuSeparator />

          {/* Views section */}
          {views && views.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vistas guardadas
              </DropdownMenuLabel>
              {views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  className="flex items-center justify-between"
                >
                  <span
                    className="flex-1 cursor-pointer"
                    onClick={() => handleLoadView(view)}
                  >
                    {view.view_name}
                    {view.is_default && (
                      <span className="ml-2 text-xs text-muted-foreground">(default)</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteView(view);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Save view */}
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Guardar vista actual
          </DropdownMenuItem>

          {/* SQL Export */}
          {tableName && (
            <DropdownMenuItem onClick={() => setSqlDialogOpen(true)}>
              <Database className="h-4 w-4 mr-2" />
              Exportar SQL
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar vista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Nombre de la vista</Label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="Mi vista personalizada"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="is-default" className="cursor-pointer">
                Establecer como vista por defecto
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveView} disabled={createView.isPending}>
              {createView.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SQL Export Dialog */}
      <Dialog open={sqlDialogOpen} onOpenChange={setSqlDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Exportar consulta SQL
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap">{generateSQL()}</pre>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta consulta refleja las columnas visibles y los filtros aplicados actualmente.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSqlDialogOpen(false)}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={copySQL}>
              Copiar SQL
            </Button>
            <Button onClick={downloadSQL}>
              Descargar .sql
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
