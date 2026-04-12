"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Database } from "lucide-react";
import { exportToCSV, exportToExcel, exportToSQL, ExportColumn } from "@/lib/exportUtils";
import { toast } from "sonner";

interface ExportDropdownProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  tableName?: string;
  disabled?: boolean;
}

export function ExportDropdown<T extends Record<string, any>>({
  data,
  columns,
  filename,
  tableName,
  disabled = false,
}: ExportDropdownProps<T>) {
  const handleExportCSV = () => {
    try {
      exportToCSV(data, columns, filename);
      toast.success("Archivo CSV exportado correctamente");
    } catch (error) {
      toast.error("Error al exportar CSV");
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(data, columns, filename);
      toast.success("Archivo Excel exportado correctamente");
    } catch (error) {
      toast.error("Error al exportar Excel");
    }
  };

  const handleExportSQL = () => {
    try {
      exportToSQL(data, tableName || filename, filename);
      toast.success("Archivo SQL exportado correctamente");
    } catch (error) {
      toast.error("Error al exportar SQL");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={disabled || data.length === 0}>
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
          <FileText className="h-4 w-4" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportSQL} className="gap-2">
          <Database className="h-4 w-4" />
          Exportar SQL
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
