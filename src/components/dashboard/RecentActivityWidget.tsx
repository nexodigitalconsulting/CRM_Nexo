import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/hooks/useContacts";
import { useClients } from "@/hooks/useClients";
import { useQuotes } from "@/hooks/useQuotes";
import { useInvoices } from "@/hooks/useInvoices";
import { useContracts } from "@/hooks/useContracts";
import { Users, Building2, FileText, Receipt, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  time: Date;
  type: "contact" | "client" | "quote" | "contract" | "invoice";
}

export function RecentActivityWidget() {
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: quotes, isLoading: quotesLoading } = useQuotes();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: contracts, isLoading: contractsLoading } = useContracts();

  const isLoading = contactsLoading || clientsLoading || quotesLoading || invoicesLoading || contractsLoading;

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    contacts?.slice(0, 5).forEach((c) => {
      items.push({
        id: `contact-${c.id}`,
        action: "Nuevo contacto añadido",
        entity: c.name,
        time: new Date(c.created_at || Date.now()),
        type: "contact",
      });
    });

    clients?.slice(0, 5).forEach((c) => {
      items.push({
        id: `client-${c.id}`,
        action: "Cliente registrado",
        entity: c.name,
        time: new Date(c.created_at || Date.now()),
        type: "client",
      });
    });

    quotes?.slice(0, 5).forEach((q) => {
      items.push({
        id: `quote-${q.id}`,
        action: q.status === "enviado" ? "Presupuesto enviado" : q.status === "aceptado" ? "Presupuesto aprobado" : "Presupuesto creado",
        entity: `PP-${String(q.quote_number).padStart(4, "0")}`,
        time: new Date(q.updated_at || q.created_at || Date.now()),
        type: "quote",
      });
    });

    invoices?.slice(0, 5).forEach((inv) => {
      items.push({
        id: `invoice-${inv.id}`,
        action: inv.status === "pagada" ? "Factura cobrada" : "Factura emitida",
        entity: `FF-${String(inv.invoice_number).padStart(4, "0")}`,
        time: new Date(inv.updated_at || inv.created_at || Date.now()),
        type: "invoice",
      });
    });

    contracts?.slice(0, 5).forEach((c) => {
      items.push({
        id: `contract-${c.id}`,
        action: c.status === "vigente" ? "Contrato activo" : "Contrato creado",
        entity: c.name || `CN-${String(c.contract_number).padStart(4, "0")}`,
        time: new Date(c.updated_at || c.created_at || Date.now()),
        type: "contract",
      });
    });

    return items
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 8);
  }, [contacts, clients, quotes, invoices, contracts]);

  const getIcon = (type: string) => {
    switch (type) {
      case "contact": return <Users className="h-5 w-5" />;
      case "client": return <Building2 className="h-5 w-5" />;
      case "quote": return <FileText className="h-5 w-5" />;
      case "contract": return <FileText className="h-5 w-5" />;
      case "invoice": return <Receipt className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b">
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Actividad Reciente</CardTitle>
        <Button variant="ghost" size="sm" className="text-primary">
          Ver todo
          <ArrowUpRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay actividad reciente
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {getIcon(activity.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.entity}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.time, { addSuffix: true, locale: es })}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
