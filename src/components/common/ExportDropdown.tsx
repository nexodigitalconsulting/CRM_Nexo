import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToExcel, ExportColumn } from "@/lib/exportUtils";
import { toast } from "sonner";

interface ExportDropdownProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  disabled?: boolean;
}

export function ExportDropdown<T extends Record<string, any>>({
  data,
  columns,
  filename,
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
