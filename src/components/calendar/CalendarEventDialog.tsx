import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCalendarCategories, useCreateCalendarEvent, useUpdateCalendarEvent, CalendarEvent, CalendarEventInsert } from "@/hooks/useCalendarEvents";
import { useClients } from "@/hooks/useClients";
import { useContacts } from "@/hooks/useContacts";
import { format } from "date-fns";
import { Loader2, MapPin, Clock, User, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  defaultDate?: Date;
}

export function CalendarEventDialog({ open, onOpenChange, event, defaultDate }: CalendarEventDialogProps) {
  const { data: categories } = useCalendarCategories();
  const { data: clients } = useClients();
  const { data: contacts } = useContacts();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [importance, setImportance] = useState<"high" | "medium" | "low">("medium");
  const [location, setLocation] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactId, setContactId] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setStartDate(format(new Date(event.start_datetime), "yyyy-MM-dd"));
      setStartTime(format(new Date(event.start_datetime), "HH:mm"));
      setEndDate(format(new Date(event.end_datetime), "yyyy-MM-dd"));
      setEndTime(format(new Date(event.end_datetime), "HH:mm"));
      setAllDay(event.all_day);
      setCategoryId(event.category_id || "");
      setImportance(event.importance);
      setLocation(event.location || "");
      setClientId(event.client_id || "");
      setContactId(event.contact_id || "");
      setReminderMinutes(event.reminder_minutes?.toString() || "");
      setNotes(event.notes || "");
    } else {
      const date = defaultDate || new Date();
      setTitle("");
      setDescription("");
      setStartDate(format(date, "yyyy-MM-dd"));
      setStartTime("09:00");
      setEndDate(format(date, "yyyy-MM-dd"));
      setEndTime("10:00");
      setAllDay(false);
      setCategoryId("");
      setImportance("medium");
      setLocation("");
      setClientId("");
      setContactId("");
      setReminderMinutes("");
      setNotes("");
    }
  }, [event, defaultDate, open]);

  const handleSubmit = async () => {
    const startDatetime = allDay 
      ? `${startDate}T00:00:00`
      : `${startDate}T${startTime}:00`;
    const endDatetime = allDay 
      ? `${endDate}T23:59:59`
      : `${endDate}T${endTime}:00`;

    const eventData: CalendarEventInsert = {
      title,
      description: description || null,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      all_day: allDay,
      category_id: categoryId || null,
      importance,
      location: location || null,
      client_id: clientId || null,
      contact_id: contactId || null,
      reminder_minutes: reminderMinutes ? parseInt(reminderMinutes) : null,
      notes: notes || null,
    };

    if (event) {
      await updateEvent.mutateAsync({ id: event.id, event: eventData });
    } else {
      await createEvent.mutateAsync(eventData);
    }
    onOpenChange(false);
  };

  const isLoading = createEvent.isPending || updateEvent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{event ? "Editar Evento" : "Nuevo Evento"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del evento"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Switch checked={allDay} onCheckedChange={setAllDay} />
                <Label>Todo el día</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha inicio *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                {!allDay && (
                  <div className="space-y-2">
                    <Label>Hora inicio</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha fin *</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {!allDay && (
                  <div className="space-y-2">
                    <Label>Hora fin</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Category & Importance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Importancia</Label>
                <Select value={importance} onValueChange={(v: "high" | "medium" | "low") => setImportance(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Dirección o enlace de videollamada"
              />
            </div>

            {/* Client / Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </Label>
                <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {clients?.filter(c => c.id).map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contacto
                </Label>
                <Select value={contactId || "none"} onValueChange={(v) => setContactId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin contacto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin contacto</SelectItem>
                    {contacts?.filter(c => c.id).map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reminder */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recordatorio
              </Label>
              <Select value={reminderMinutes || "none"} onValueChange={(v) => setReminderMinutes(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin recordatorio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin recordatorio</SelectItem>
                  <SelectItem value="15">15 minutos antes</SelectItem>
                  <SelectItem value="30">30 minutos antes</SelectItem>
                  <SelectItem value="60">1 hora antes</SelectItem>
                  <SelectItem value="1440">1 día antes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del evento..."
                rows={3}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notas internas
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas privadas..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !startDate || !endDate || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {event ? "Guardar cambios" : "Crear evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
