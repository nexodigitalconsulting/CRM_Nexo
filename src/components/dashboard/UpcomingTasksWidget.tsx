import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useContracts } from "@/hooks/useContracts";
import { useInvoices } from "@/hooks/useInvoices";
import { useContacts } from "@/hooks/useContacts";
import { Calendar, FileText, Receipt, Users } from "lucide-react";
import { format, addDays, isWithinInterval, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskItem {
  id: string;
  title: string;
  date: Date;
  priority: "high" | "medium" | "low";
  type: "billing" | "renewal" | "followup" | "due";
}

export function UpcomingTasksWidget() {
  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: contacts, isLoading: contactsLoading } = useContacts();

  const isLoading = contractsLoading || invoicesLoading || contactsLoading;

  const tasks = useMemo(() => {
    const items: TaskItem[] = [];
    const now = new Date();
    const nextWeek = addDays(now, 7);
    const nextMonth = addDays(now, 30);

    // Billing tasks from contracts
    contracts?.forEach((contract) => {
      if (contract.status === "vigente" && contract.next_billing_date) {
        const billingDate = new Date(contract.next_billing_date);
        if (isWithinInterval(billingDate, { start: now, end: nextWeek })) {
          items.push({
            id: `billing-${contract.id}`,
            title: `Facturar: ${contract.name || `#${contract.contract_number}`}`,
            date: billingDate,
            priority: "high",
            type: "billing",
          });
        }
      }

      // Renewal reminders
      if (contract.status === "vigente" && contract.end_date) {
        const endDate = new Date(contract.end_date);
        if (isWithinInterval(endDate, { start: now, end: nextMonth })) {
          items.push({
            id: `renewal-${contract.id}`,
            title: `Renovar: ${contract.name || `#${contract.contract_number}`}`,
            date: endDate,
            priority: isBefore(endDate, nextWeek) ? "high" : "medium",
            type: "renewal",
          });
        }
      }
    });

    // Invoice due dates
    invoices?.forEach((invoice) => {
      if (invoice.status === "emitida" && invoice.due_date) {
        const dueDate = new Date(invoice.due_date);
        if (isWithinInterval(dueDate, { start: now, end: nextWeek })) {
          items.push({
            id: `due-${invoice.id}`,
            title: `Vence: FF-${String(invoice.invoice_number).padStart(4, "0")}`,
            date: dueDate,
            priority: isBefore(dueDate, addDays(now, 3)) ? "high" : "medium",
            type: "due",
          });
        }
      }
    });

    // Follow-up contacts
    contacts?.forEach((contact) => {
      if (contact.status === "seguimiento" && contact.meeting_date) {
        const meetingDate = new Date(contact.meeting_date);
        if (isWithinInterval(meetingDate, { start: now, end: nextWeek })) {
          items.push({
            id: `followup-${contact.id}`,
            title: `Seguimiento: ${contact.name}`,
            date: meetingDate,
            priority: "medium",
            type: "followup",
          });
        }
      }
    });

    return items
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  }, [contracts, invoices, contacts]);

  const getIcon = (type: string) => {
    switch (type) {
      case "billing": return <Receipt className="h-4 w-4" />;
      case "renewal": return <FileText className="h-4 w-4" />;
      case "followup": return <Users className="h-4 w-4" />;
      case "due": return <Receipt className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Próximas Tareas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 border-b">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Próximas Tareas</CardTitle>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Calendar className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay tareas pendientes
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 text-muted-foreground">
                      {getIcon(task.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(task.date, "d MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    variant={
                      task.priority === "high"
                        ? "danger"
                        : task.priority === "medium"
                        ? "pending"
                        : "inactive"
                    }
                  >
                    {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
                  </StatusBadge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
