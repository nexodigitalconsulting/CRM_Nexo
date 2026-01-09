import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useInvoices } from "@/hooks/useInvoices";
import { useQuotes } from "@/hooks/useQuotes";
import { useContacts } from "@/hooks/useContacts";
import { useExpenses } from "@/hooks/useExpenses";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DynamicTableWidgetProps {
  title: string;
  entity?: string;
}

const statusMaps = {
  clients: { activo: "active", inactivo: "inactive" },
  contacts: { nuevo: "new", contactado: "pending", seguimiento: "pending", descartado: "inactive", convertido: "active" },
  contracts: { vigente: "active", pendiente_activacion: "pending", expirado: "danger", cancelado: "inactive" },
  invoices: { borrador: "inactive", emitida: "pending", pagada: "active", cancelada: "danger" },
  quotes: { borrador: "inactive", enviado: "new", aceptado: "active", rechazado: "danger" },
  expenses: { pendiente: "pending", pagado: "active", cancelado: "inactive" },
};

const statusLabels: Record<string, Record<string, string>> = {
  clients: { activo: "Activo", inactivo: "Inactivo" },
  contacts: { nuevo: "Nuevo", contactado: "Contactado", seguimiento: "Seguimiento", descartado: "Descartado", convertido: "Convertido" },
  contracts: { vigente: "Vigente", pendiente_activacion: "Pendiente", expirado: "Vencido", cancelado: "Cancelado" },
  invoices: { borrador: "Borrador", emitida: "Emitida", pagada: "Cobrada", cancelada: "Cancelada" },
  quotes: { borrador: "Borrador", enviado: "Enviado", aceptado: "Aprobado", rechazado: "Rechazado" },
  expenses: { pendiente: "Pendiente", pagado: "Pagado", cancelado: "Cancelado" },
};

export function DynamicTableWidget({ title, entity }: DynamicTableWidgetProps) {
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: quotes, isLoading: quotesLoading } = useQuotes();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();

  const { data, columns, isLoading } = useMemo(() => {
    switch (entity) {
      case "clients":
        return {
          data: clients?.slice(0, 5) || [],
          columns: [
            { key: "name", label: "Nombre" },
            { key: "email", label: "Email" },
            { key: "status", label: "Estado" },
          ],
          isLoading: clientsLoading,
        };
      case "contacts":
        return {
          data: contacts?.slice(0, 5) || [],
          columns: [
            { key: "name", label: "Nombre" },
            { key: "email", label: "Email" },
            { key: "status", label: "Estado" },
          ],
          isLoading: contactsLoading,
        };
      case "contracts":
        return {
          data: contracts?.slice(0, 5) || [],
          columns: [
            { key: "name", label: "Contrato" },
            { key: "client", label: "Cliente" },
            { key: "status", label: "Estado" },
          ],
          isLoading: contractsLoading,
        };
      case "invoices":
        return {
          data: invoices?.slice(0, 5) || [],
          columns: [
            { key: "invoice_number", label: "Nº" },
            { key: "client", label: "Cliente" },
            { key: "total", label: "Total" },
            { key: "status", label: "Estado" },
          ],
          isLoading: invoicesLoading,
        };
      case "quotes":
        return {
          data: quotes?.slice(0, 5) || [],
          columns: [
            { key: "name", label: "Presupuesto" },
            { key: "client", label: "Cliente" },
            { key: "total", label: "Total" },
            { key: "status", label: "Estado" },
          ],
          isLoading: quotesLoading,
        };
      case "expenses":
        return {
          data: expenses?.slice(0, 5) || [],
          columns: [
            { key: "supplier_name", label: "Proveedor" },
            { key: "total", label: "Total" },
            { key: "status", label: "Estado" },
          ],
          isLoading: expensesLoading,
        };
      default:
        return { data: [], columns: [], isLoading: false };
    }
  }, [entity, clients, contracts, invoices, quotes, contacts, expenses, clientsLoading, contractsLoading, invoicesLoading, quotesLoading, contactsLoading, expensesLoading]);

  const renderCell = (item: any, key: string) => {
    if (key === "status" && entity) {
      const statusMap = statusMaps[entity as keyof typeof statusMaps] || {};
      const labels = statusLabels[entity] || {};
      return (
        <StatusBadge variant={statusMap[item.status] as any || "inactive"}>
          {labels[item.status] || item.status || "-"}
        </StatusBadge>
      );
    }
    if (key === "client") {
      return item.client?.name || "-";
    }
    if (key === "total") {
      return Number(item.total || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
    }
    if (key === "invoice_number") {
      return `FF-${String(item.invoice_number).padStart(4, "0")}`;
    }
    if (key === "name" && entity === "contracts") {
      return item.name || `CN-${String(item.contract_number).padStart(4, "0")}`;
    }
    if (key === "name" && entity === "quotes") {
      return item.name || `PP-${String(item.quote_number).padStart(4, "0")}`;
    }
    return item[key] || "-";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entity || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {!entity ? "Selecciona una entidad para mostrar datos" : "No hay datos disponibles"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item: any, idx: number) => (
              <TableRow key={item.id || idx}>
                {columns.map((col) => (
                  <TableCell key={col.key}>{renderCell(item, col.key)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}