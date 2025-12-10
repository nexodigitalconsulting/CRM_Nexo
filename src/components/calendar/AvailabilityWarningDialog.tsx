import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Clock, Bell } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AvailabilityWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  selectedDate: Date;
  availableHours?: { start: string; end: string } | null;
  isOutsideAvailability: boolean;
}

export function AvailabilityWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  selectedDate,
  availableHours,
  isOutsideAvailability,
}: AvailabilityWarningDialogProps) {
  const dayName = format(selectedDate, "EEEE", { locale: es });
  const dateFormatted = format(selectedDate, "d 'de' MMMM", { locale: es });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <DialogTitle className="text-xl">Fuera de horario disponible</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Advertencia sobre disponibilidad para el evento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Calendar className="h-5 w-5 text-warning flex-shrink-0" />
            <div>
              <p className="font-medium capitalize">{dayName}</p>
              <p className="text-sm text-muted-foreground">{dateFormatted}</p>
            </div>
          </div>

          {!availableHours ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <Clock className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Sin disponibilidad configurada</p>
                  <p className="text-sm text-muted-foreground">
                    No tienes horario de disponibilidad para este día. 
                    Puedes configurarlo en la pestaña "Disponibilidad".
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 border border-border">
                <Bell className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Se creará una alerta</p>
                  <p className="text-sm text-muted-foreground">
                    Si continúas, el día quedará marcado como alerta en el calendario 
                    y se generará una notificación.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted border border-border">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Tu horario disponible</p>
                  <p className="text-sm text-muted-foreground">
                    {availableHours.start} - {availableHours.end}
                  </p>
                </div>
              </div>

              {isOutsideAvailability && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 border border-border">
                  <Bell className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Evento fuera del horario</p>
                    <p className="text-sm text-muted-foreground">
                      El evento está programado fuera de tu horario disponible.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="gap-2">
            <Bell className="h-4 w-4" />
            Continuar y crear alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
