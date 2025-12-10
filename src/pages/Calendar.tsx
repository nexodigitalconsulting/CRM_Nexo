import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, FileText, RefreshCw, AlertTriangle, Plus, Settings } from "lucide-react";
import { useState, useMemo } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useInvoices } from "@/hooks/useInvoices";
import { useCalendarEvents, useCreateCalendarEvent, useDeleteCalendarEvent, CalendarEvent as DBCalendarEvent } from "@/hooks/useCalendarEvents";
import { format, addDays, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWithinInterval, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarEventDialog } from "@/components/calendar/CalendarEventDialog";
import { AvailabilityManager } from "@/components/calendar/AvailabilityManager";
import { CategoryManager } from "@/components/calendar/CategoryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CalendarDisplayEvent {
  id: string;
  title: string;
  date: Date;
  type: "contract_start" | "contract_end" | "billing" | "invoice_due" | "renewal" | "custom";
  color: string;
  details?: string;
  dbEvent?: DBCalendarEvent;
}

const eventTypeConfig = {
  contract_start: { 
    label: "Inicio Contrato", 
    color: "bg-primary/20 text-primary border-primary/30",
  },
  contract_end: { 
    label: "Fin Contrato", 
    color: "bg-destructive/20 text-destructive border-destructive/30",
  },
  billing: { 
    label: "Facturación", 
    color: "bg-success/20 text-success border-success/30",
  },
  invoice_due: { 
    label: "Vencimiento Factura", 
    color: "bg-warning/20 text-warning border-warning/30",
  },
  renewal: { 
    label: "Renovación", 
    color: "bg-accent/20 text-accent-foreground border-accent/30",
  },
  custom: { 
    label: "Evento", 
    color: "bg-secondary/20 text-secondary-foreground border-secondary/30",
  },
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DBCalendarEvent | null>(null);
  const [activeTab, setActiveTab] = useState<string>("calendar");
  
  const { data: contracts = [], isLoading: contractsLoading } = useContracts();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: customEvents = [], isLoading: eventsLoading } = useCalendarEvents();
  const deleteEvent = useDeleteCalendarEvent();
  
  const isLoading = contractsLoading || invoicesLoading || eventsLoading;

  // Generate events from contracts, invoices, and custom events
  const events = useMemo(() => {
    const allEvents: CalendarDisplayEvent[] = [];
    
    // Contract events
    contracts.forEach((contract) => {
      if (contract.start_date) {
        allEvents.push({
          id: `start-${contract.id}`,
          title: `Inicio: ${contract.name || `Contrato #${contract.contract_number}`}`,
          date: new Date(contract.start_date),
          type: "contract_start",
          color: eventTypeConfig.contract_start.color,
          details: contract.client?.name,
        });
      }
      
      if (contract.end_date) {
        const endDate = new Date(contract.end_date);
        const thirtyDaysBefore = addDays(endDate, -30);
        
        allEvents.push({
          id: `end-${contract.id}`,
          title: `Fin: ${contract.name || `Contrato #${contract.contract_number}`}`,
          date: endDate,
          type: "contract_end",
          color: eventTypeConfig.contract_end.color,
          details: contract.client?.name,
        });
        
        if (contract.status === "active") {
          allEvents.push({
            id: `renewal-${contract.id}`,
            title: `Renovación: ${contract.name || `Contrato #${contract.contract_number}`}`,
            date: thirtyDaysBefore,
            type: "renewal",
            color: eventTypeConfig.renewal.color,
            details: `Vence el ${format(endDate, "dd MMM", { locale: es })}`,
          });
        }
      }
      
      if (contract.next_billing_date && contract.status === "active") {
        allEvents.push({
          id: `billing-${contract.id}`,
          title: `Facturar: ${contract.name || `Contrato #${contract.contract_number}`}`,
          date: new Date(contract.next_billing_date),
          type: "billing",
          color: eventTypeConfig.billing.color,
          details: `${Number(contract.total || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`,
        });
      }
    });
    
    // Invoice due dates
    invoices.forEach((invoice) => {
      if (invoice.due_date && invoice.status === "issued") {
        allEvents.push({
          id: `due-${invoice.id}`,
          title: `Vence: FF-${String(invoice.invoice_number).padStart(4, "0")}`,
          date: new Date(invoice.due_date),
          type: "invoice_due",
          color: eventTypeConfig.invoice_due.color,
          details: invoice.client?.name,
        });
      }
    });

    // Custom calendar events
    customEvents.forEach((event) => {
      allEvents.push({
        id: `custom-${event.id}`,
        title: event.title,
        date: new Date(event.start_datetime),
        type: "custom",
        color: event.category?.color 
          ? `bg-[${event.category.color}]/20 text-foreground border-[${event.category.color}]/30`
          : eventTypeConfig.custom.color,
        details: event.description || undefined,
        dbEvent: event,
      });
    });
    
    return allEvents;
  }, [contracts, invoices, customEvents]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart);
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day: Date) => events.filter((e) => isSameDay(e.date, day));

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const handleEventClick = (event: CalendarDisplayEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.dbEvent) {
      setSelectedEvent(event.dbEvent);
      setSelectedDay(null);
      setEventDialogOpen(true);
    }
  };

  const upcomingEvents = events
    .filter((e) => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);

  const expiringContracts = contracts.filter((c) => {
    if (!c.end_date || c.status !== "active") return false;
    const endDate = new Date(c.end_date);
    return isWithinInterval(endDate, { start: new Date(), end: addDays(new Date(), 30) });
  });

  const pendingBilling = contracts.filter((c) => {
    if (!c.next_billing_date || c.status !== "active") return false;
    const billingDate = new Date(c.next_billing_date);
    return isWithinInterval(billingDate, { start: new Date(), end: addDays(new Date(), 7) });
  });

  return (
    <div className="animate-fade-in">
      <Header
        title="Calendario"
        subtitle="Eventos, contratos y disponibilidad"
        actions={
          <Button className="gap-2" onClick={() => { setSelectedDay(new Date()); setSelectedEvent(null); setEventDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo Evento
          </Button>
        }
      />
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-2">
              <Settings className="h-4 w-4" />
              Disponibilidad
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FileText className="h-4 w-4" />
              Categorías
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Calendar Grid */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={goToToday}>Hoy</Button>
                      <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-2">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-1">
                        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
                        ))}
                        {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-24 bg-muted/30 rounded-lg" />
                        ))}
                        {daysInMonth.map((day) => {
                          const dayEvents = getEventsForDay(day);
                          const isToday = isSameDay(day, new Date());
                          
                          return (
                            <div
                              key={day.toISOString()}
                              onClick={() => handleDayClick(day)}
                              className={`h-24 p-1 rounded-lg border ${
                                isToday ? "border-primary bg-primary/5" : "border-border bg-card"
                              } hover:bg-muted/50 cursor-pointer transition-colors overflow-hidden`}
                            >
                              <span className={`text-sm ${isToday ? "font-bold text-primary" : ""}`}>
                                {format(day, "d")}
                              </span>
                              <div className="mt-1 space-y-0.5">
                                {dayEvents.slice(0, 2).map((event) => (
                                  <div
                                    key={event.id}
                                    onClick={(e) => handleEventClick(event, e)}
                                    className={`text-[10px] px-1 py-0.5 rounded truncate border ${event.color}`}
                                    title={`${event.title}${event.details ? ` - ${event.details}` : ""}`}
                                  >
                                    {event.title}
                                  </div>
                                ))}
                                {dayEvents.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 2} más</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Próximos eventos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isLoading ? (
                      [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                    ) : upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <div 
                          key={event.id} 
                          className="flex gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => event.dbEvent && handleEventClick(event, { stopPropagation: () => {} } as React.MouseEvent)}
                        >
                          <div className="text-center min-w-[40px]">
                            <div className="text-lg font-bold">{format(event.date, "d")}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">
                              {format(event.date, "MMM", { locale: es })}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{event.title}</p>
                            {event.details && (
                              <p className="text-[10px] text-muted-foreground truncate">{event.details}</p>
                            )}
                            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${event.color}`}>
                              {eventTypeConfig[event.type].label}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay eventos próximos</p>
                    )}
                  </CardContent>
                </Card>

                {expiringContracts.length > 0 && (
                  <Card className="border-warning/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-warning">
                        <AlertTriangle className="h-5 w-5" />
                        Por vencer (30 días)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {expiringContracts.map((contract) => (
                        <div key={contract.id} className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                          <p className="text-sm font-medium">{contract.name || `#${contract.contract_number}`}</p>
                          <p className="text-xs text-muted-foreground">{contract.client?.name}</p>
                          <p className="text-xs text-warning">
                            Vence: {format(new Date(contract.end_date!), "dd MMM yyyy", { locale: es })}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {pendingBilling.length > 0 && (
                  <Card className="border-success/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-success">
                        <FileText className="h-5 w-5" />
                        Facturar esta semana
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {pendingBilling.map((contract) => (
                        <div key={contract.id} className="p-2 rounded-lg bg-success/10 border border-success/20">
                          <p className="text-sm font-medium">{contract.name || `#${contract.contract_number}`}</p>
                          <p className="text-xs text-muted-foreground">{contract.client?.name}</p>
                          <p className="text-xs text-success font-medium">
                            {Number(contract.total || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Leyenda</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(eventTypeConfig).map(([key, config]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${config.color.split(" ")[0]}`} />
                        <span className="text-sm">{config.label}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <AvailabilityManager />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>
        </Tabs>
      </div>

      <CalendarEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        defaultDate={selectedDay || undefined}
      />
    </div>
  );
}