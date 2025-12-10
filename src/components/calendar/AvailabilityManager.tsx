import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUserAvailability, useSetUserAvailability } from "@/hooks/useCalendarEvents";
import { Loader2, Save, Clock } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

interface DayAvailability {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

export function AvailabilityManager() {
  const { data: savedAvailability, isLoading } = useUserAvailability();
  const setAvailability = useSetUserAvailability();

  const [availability, setLocalAvailability] = useState<DayAvailability[]>([]);

  useEffect(() => {
    if (savedAvailability) {
      const mapped = DAYS_OF_WEEK.map((day) => {
        const existing = savedAvailability.find((a) => a.day_of_week === day.value);
        return {
          day_of_week: day.value,
          is_available: existing?.is_available ?? (day.value >= 1 && day.value <= 5),
          start_time: existing?.start_time || "09:00",
          end_time: existing?.end_time || "18:00",
        };
      });
      setLocalAvailability(mapped);
    } else {
      // Default availability (Mon-Fri 9-18)
      const defaults = DAYS_OF_WEEK.map((day) => ({
        day_of_week: day.value,
        is_available: day.value >= 1 && day.value <= 5,
        start_time: "09:00",
        end_time: "18:00",
      }));
      setLocalAvailability(defaults);
    }
  }, [savedAvailability]);

  const updateDay = (dayOfWeek: number, field: keyof DayAvailability, value: any) => {
    setLocalAvailability((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d
      )
    );
  };

  const handleSave = async () => {
    const availableSlots = availability.filter((a) => a.is_available);
    await setAvailability.mutateAsync(availableSlots);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horarios de Disponibilidad
        </CardTitle>
        <Button onClick={handleSave} disabled={setAvailability.isPending}>
          {setAvailability.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayData = availability.find((a) => a.day_of_week === day.value);
            if (!dayData) return null;

            return (
              <div
                key={day.value}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  dayData.is_available
                    ? "bg-success/5 border-success/20"
                    : "bg-muted/50 border-border"
                }`}
              >
                <Switch
                  checked={dayData.is_available}
                  onCheckedChange={(v) => updateDay(day.value, "is_available", v)}
                />
                <Label className="w-28 font-medium">{day.label}</Label>
                
                {dayData.is_available && (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={dayData.start_time}
                      onChange={(e) => updateDay(day.value, "start_time", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={dayData.end_time}
                      onChange={(e) => updateDay(day.value, "end_time", e.target.value)}
                      className="w-32"
                    />
                  </div>
                )}
                
                {!dayData.is_available && (
                  <span className="text-sm text-muted-foreground">No disponible</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">Información</h4>
          <p className="text-sm text-muted-foreground">
            Configura tus horarios disponibles para reuniones y citas. 
            Esta disponibilidad se usará para bloquear automáticamente huecos en tu calendario.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
