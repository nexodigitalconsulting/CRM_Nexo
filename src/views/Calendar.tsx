"use client";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, FileText, AlertTriangle, Plus, Settings, ExternalLink, Loader2, LayoutList } from "lucide-react";
// Google Calendar sync icon (inline SVG — no external dependency)
const GoogleCalIcon = () => (
  <svg viewBox="0 0 18 18" className="inline-block w-3 h-3 ml-1 shrink-0" aria-label="Exportado a Google Calendar">
    <path fill="#4285F4" d="M16.5 9.18c0-.62-.05-1.22-.16-1.79H9v3.39h4.21a3.6 3.6 0 01-1.56 2.36v1.96h2.52c1.48-1.36 2.33-3.36 2.33-5.92z"/>
    <path fill="#34A853" d="M9 18c2.25 0 4.14-.75 5.52-2.02l-2.52-1.96c-.77.52-1.75.82-3 .82-2.31 0-4.26-1.56-4.96-3.66H1.43v2.03A8.5 8.5 0 009 18z"/>
    <path fill="#FBBC05" d="M4.04 11.18A5.1 5.1 0 013.77 9.5c0-.58.1-1.15.27-1.68V5.79H1.43A8.5 8.5 0 000 9.5c0 1.37.33 2.67.9 3.82l3.14-2.14z"/>
    <path fill="#EA4335" d="M9 3.84c1.3 0 2.47.45 3.39 1.33l2.54-2.54A8.5 8.5 0 001.43 5.79L4.57 7.93C5.27 5.83 7.22 3.84 9 3.84z"/>
  </svg>
);
import { useState, useMemo } from "react";
import { useContracts } from "@/hooks/useContracts";
import { useInvoices } from "@/hooks/useInvoices";
import { useCalendarEvents, CalendarEvent as DBCalendarEvent } from "@/hooks/useCalendarEvents";
import { useGoogleCalendar, GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { format, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWithinInterval, addMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, eachHourOfInterval, startOfDay, endOfDay, isSameWeek } from "date-fns";
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
  type: "contract_start" | "contract_end" | "billing" | "invoice_due" | "renewal" | "custom" | "google";
  color: string;
  hexColor?: string; // hex for custom category color — use inline style instead of dynamic Tailwind
  details?: string;
  dbEvent?: DBCalendarEvent;
  googleEvent?: GoogleCalendarEvent;
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
  google: { 
    label: "Google Calendar", 
    color: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  },
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DBCalendarEvent | null>(null);
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">("month");

  const { data: contracts = [], isLoading: contractsLoading } = useContracts();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: customEvents = [], isLoading: eventsLoading } = useCalendarEvents();

  // Google Calendar integration
  const { 
    events: googleEvents, 
    isConnected: googleConnected, 
    isConnecting: googleConnecting,
    isLoading: googleLoading,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  } = useGoogleCalendar();
  
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
        
        if (contract.status === "vigente") {
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
      
      if (contract.next_billing_date && contract.status === "vigente") {
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
      if (invoice.due_date && invoice.status === "emitida") {
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
        color: event.category?.color ? "" : eventTypeConfig.custom.color,
        hexColor: event.category?.color ?? undefined,
        details: event.description || undefined,
        dbEvent: event,
      });
    });

    // Google Calendar events
    googleEvents.forEach((event) => {
      allEvents.push({
        id: `google-${event.id}`,
        title: event.title,
        date: new Date(event.start),
        type: "google",
        color: eventTypeConfig.google.color,
        details: event.location || event.description,
        googleEvent: event,
      });
    });
    
    return allEvents;
  }, [contracts, invoices, customEvents, googleEvents]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart);
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Week view helpers
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const workHours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00–20:00

  // Agenda view helpers — next 30 days grouped by date
  const agendaStart = startOfDay(new Date());
  const agendaEnd = addDays(agendaStart, 30);
  const agendaDays = eachDayOfInterval({ start: agendaStart, end: agendaEnd }).filter(
    (day) => getEventsForDay(day).length > 0
  );

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
    if (!c.end_date || c.status !== "vigente") return false;
    const endDate = new Date(c.end_date);
    return isWithinInterval(endDate, { start: new Date(), end: addDays(new Date(), 30) });
  });

  const pendingBilling = contracts.filter((c) => {
    if (!c.next_billing_date || c.status !== "vigente") return false;
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
              {/* Calendar Grid / Week / Agenda */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 flex-wrap gap-2">
                    <CardTitle className="text-xl">
                      {viewMode === "month" && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                      {viewMode === "week" && `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`}
                      {viewMode === "agenda" && "Próximos 30 días"}
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      {/* View switcher */}
                      <div className="flex rounded-md border overflow-hidden">
                        {(["month", "week", "agenda"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                              viewMode === mode
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {mode === "month" ? "Mes" : mode === "week" ? "Semana" : "Agenda"}
                          </button>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={goToToday}>Hoy</Button>
                      {viewMode !== "agenda" && (
                        <>
                          <Button variant="outline" size="icon" onClick={viewMode === "month" ? prevMonth : prevWeek}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={viewMode === "month" ? nextMonth : nextWeek}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-2">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                      </div>
                    ) : viewMode === "month" ? (
                      /* ── Month View ── */
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
                                    className={`text-[10px] px-1 py-0.5 rounded truncate border flex items-center gap-0.5 ${event.color}`}
                                    style={event.hexColor ? {
                                      backgroundColor: event.hexColor + "33",
                                      borderColor: event.hexColor + "4d",
                                    } : undefined}
                                    title={`${event.title}${event.details ? ` - ${event.details}` : ""}${event.dbEvent?.is_synced_to_google ? " · Exportado a Google Calendar" : ""}`}
                                  >
                                    <span className="truncate">{event.title}</span>
                                    {event.dbEvent?.is_synced_to_google && <GoogleCalIcon />}
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
                    ) : viewMode === "week" ? (
                      /* ── Week View ── */
                      <div className="overflow-auto">
                        {/* Day headers */}
                        <div className="grid gap-px" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
                          <div />
                          {weekDays.map((day) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                              <div
                                key={day.toISOString()}
                                className={`text-center py-2 text-sm font-medium rounded-t-lg ${
                                  isToday ? "text-primary bg-primary/5" : "text-muted-foreground"
                                }`}
                              >
                                <div className="text-xs uppercase">{format(day, "EEE", { locale: es })}</div>
                                <div className={`text-lg font-bold mt-0.5 ${isToday ? "text-primary" : ""}`}>
                                  {format(day, "d")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Hour rows */}
                        <div className="grid gap-px border rounded-lg overflow-hidden" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
                          {workHours.map((hour) => (
                            <>
                              <div key={`h-${hour}`} className="text-[10px] text-muted-foreground text-right pr-1 pt-1 bg-muted/20 border-b border-border/30">
                                {hour}:00
                              </div>
                              {weekDays.map((day) => {
                                const isToday = isSameDay(day, new Date());
                                const hourEvents = getEventsForDay(day).filter((e) => {
                                  if (!e.dbEvent) return false;
                                  const h = new Date(e.dbEvent.start_datetime).getHours();
                                  return h === hour;
                                });
                                return (
                                  <div
                                    key={`${day.toISOString()}-${hour}`}
                                    onClick={() => {
                                      const d = new Date(day);
                                      d.setHours(hour, 0, 0, 0);
                                      handleDayClick(d);
                                    }}
                                    className={`min-h-[3rem] p-0.5 border-b border-l border-border/30 cursor-pointer transition-colors hover:bg-muted/30 ${
                                      isToday ? "bg-primary/3" : "bg-card"
                                    }`}
                                  >
                                    {hourEvents.map((event) => (
                                      <div
                                        key={event.id}
                                        onClick={(e) => handleEventClick(event, e)}
                                        className={`text-[10px] px-1 py-0.5 rounded truncate border mb-0.5 ${event.color}`}
                                        style={event.hexColor ? {
                                          backgroundColor: event.hexColor + "33",
                                          borderColor: event.hexColor + "4d",
                                        } : undefined}
                                        title={event.title}
                                      >
                                        {event.title}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </>
                          ))}
                        </div>
                        {/* All-day / non-time events for the week */}
                        {(() => {
                          const allDayEvents = events.filter(
                            (e) => isSameWeek(e.date, currentDate, { weekStartsOn: 1 }) && !e.dbEvent
                          );
                          if (allDayEvents.length === 0) return null;
                          return (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground font-medium mb-1">Todo el día / Eventos del sistema</p>
                              <div className="flex flex-wrap gap-1">
                                {allDayEvents.map((event) => (
                                  <span
                                    key={event.id}
                                    className={`text-[10px] px-2 py-0.5 rounded border ${event.color}`}
                                  >
                                    {format(event.date, "EEE d", { locale: es })} · {event.title}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* ── Agenda View ── */
                      <div className="space-y-4">
                        {agendaDays.length === 0 ? (
                          <div className="text-center py-12">
                            <LayoutList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No hay eventos en los próximos 30 días</p>
                          </div>
                        ) : (
                          agendaDays.map((day) => {
                            const dayEvts = getEventsForDay(day);
                            const isToday = isSameDay(day, new Date());
                            return (
                              <div key={day.toISOString()}>
                                <div className={`flex items-center gap-3 mb-2`}>
                                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                                    isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                  }`}>
                                    <span>{format(day, "EEE", { locale: es })}</span>
                                    <span>{format(day, "d MMM", { locale: es })}</span>
                                  </div>
                                  <div className="flex-1 h-px bg-border" />
                                </div>
                                <div className="space-y-1 pl-2">
                                  {dayEvts.map((event) => (
                                    <div
                                      key={event.id}
                                      onClick={(e) => handleEventClick(event, e)}
                                      className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity ${event.color}`}
                                      style={event.hexColor ? {
                                        backgroundColor: event.hexColor + "18",
                                        borderColor: event.hexColor + "4d",
                                      } : undefined}
                                    >
                                      <div className="min-w-[3.5rem] text-xs font-mono pt-0.5 opacity-70">
                                        {event.dbEvent
                                          ? format(new Date(event.dbEvent.start_datetime), "HH:mm")
                                          : "Todo el día"}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{event.title}</p>
                                        {event.details && (
                                          <p className="text-xs opacity-70 truncate">{event.details}</p>
                                        )}
                                      </div>
                                      <span className="text-[10px] opacity-60 shrink-0">
                                        {eventTypeConfig[event.type].label}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Google Calendar Connection */}
                <Card className="border-blue-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google Calendar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {googleConnected ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Conectado
                        </div>
                        {googleEvents.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {googleEvents.length} eventos sincronizados
                          </p>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={disconnectGoogleCalendar}
                        >
                          Desconectar
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        className="w-full gap-2" 
                        onClick={connectGoogleCalendar}
                        disabled={googleConnecting}
                      >
                        {googleConnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        {googleConnecting ? "Conectando..." : "Conectar Google Calendar"}
                      </Button>
                    )}
                  </CardContent>
                </Card>

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
                          onClick={() => {
                            if (event.dbEvent) {
                              handleEventClick(event, { stopPropagation: () => {} } as React.MouseEvent);
                            } else if (event.googleEvent?.htmlLink) {
                              window.open(event.googleEvent.htmlLink, "_blank");
                            }
                          }}
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
                            <span
                              className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 ${event.color}`}
                              style={event.hexColor ? {
                                backgroundColor: event.hexColor + "33",
                                borderColor: event.hexColor + "4d",
                              } : undefined}
                            >
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