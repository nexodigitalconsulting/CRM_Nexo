import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "meeting" | "deadline" | "reminder" | "billing";
  client?: string;
}

const events: Event[] = [
  { id: "1", title: "Reunión Tech Solutions", date: "2024-12-02", time: "10:00", type: "meeting", client: "Tech Solutions SL" },
  { id: "2", title: "Vencimiento Factura FF-2024-0154", date: "2024-12-03", time: "00:00", type: "deadline" },
  { id: "3", title: "Facturación mensual contratos", date: "2024-12-05", time: "09:00", type: "billing" },
  { id: "4", title: "Seguimiento Digital Labs", date: "2024-12-06", time: "15:30", type: "meeting", client: "Digital Labs SA" },
  { id: "5", title: "Recordatorio pago pendiente", date: "2024-12-10", time: "10:00", type: "reminder" },
];

const typeColors: Record<string, string> = {
  meeting: "bg-primary/20 text-primary border-primary/30",
  deadline: "bg-destructive/20 text-destructive border-destructive/30",
  reminder: "bg-warning/20 text-warning border-warning/30",
  billing: "bg-success/20 text-success border-success/30",
};

const typeLabels: Record<string, string> = {
  meeting: "Reunión",
  deadline: "Vencimiento",
  reminder: "Recordatorio",
  billing: "Facturación",
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 11, 1)); // December 2024

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for Monday start

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="animate-fade-in">
      <Header
        title="Calendario"
        subtitle="Eventos, reuniones y recordatorios"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Evento
          </Button>
        }
      />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-24 bg-muted/30 rounded-lg" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    const isToday = day === 2 && currentDate.getMonth() === 11 && currentDate.getFullYear() === 2024;
                    
                    return (
                      <div
                        key={day}
                        className={`h-24 p-1 rounded-lg border ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"} hover:bg-muted/50 cursor-pointer transition-colors`}
                      >
                        <span className={`text-sm ${isToday ? "font-bold text-primary" : ""}`}>{day}</span>
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs px-1 py-0.5 rounded truncate border ${typeColors[event.type]}`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{dayEvents.length - 2} más</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Próximos eventos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="text-center min-w-[40px]">
                      <div className="text-lg font-bold">{new Date(event.date).getDate()}</div>
                      <div className="text-xs text-muted-foreground">
                        {monthNames[new Date(event.date).getMonth()].slice(0, 3)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.time !== "00:00" && event.time}</p>
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-1 ${typeColors[event.type]}`}>
                        {typeLabels[event.type]}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Leyenda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(typeLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${typeColors[key].split(" ")[0]}`} />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
