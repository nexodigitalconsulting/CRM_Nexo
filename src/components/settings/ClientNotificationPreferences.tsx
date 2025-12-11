import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";
import { 
  useNotificationRules,
  useClientNotificationPreferences,
  useUpdateClientNotificationPreference
} from "@/hooks/useEmailSettings";

const RULE_LABELS: Record<string, string> = {
  invoice_due_3days: "Recordatorio facturas por vencer",
  invoice_overdue: "Aviso facturas vencidas",
  contract_pending: "Recordatorio contratos pendientes",
  contract_expiring: "Aviso contratos por vencer",
  quote_no_response: "Seguimiento presupuestos",
};

interface ClientNotificationPreferencesProps {
  clientId: string;
}

export function ClientNotificationPreferences({ clientId }: ClientNotificationPreferencesProps) {
  const { data: rules, isLoading: loadingRules } = useNotificationRules();
  const { data: preferences, isLoading: loadingPrefs } = useClientNotificationPreferences(clientId);
  const updatePreference = useUpdateClientNotificationPreference();

  const isEnabled = (ruleType: string) => {
    const pref = preferences?.find(p => p.rule_type === ruleType);
    // Default to enabled if no preference exists
    return pref ? pref.is_enabled : true;
  };

  const handleToggle = (ruleType: string, currentEnabled: boolean) => {
    updatePreference.mutate({
      clientId,
      ruleType,
      isEnabled: !currentEnabled,
    });
  };

  if (loadingRules || loadingPrefs) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Preferencias de Notificación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules?.filter(r => r.is_active).map((rule) => {
          const enabled = isEnabled(rule.rule_type);
          return (
            <div
              key={rule.id}
              className="flex items-center justify-between py-2"
            >
              <span className="text-sm">
                {RULE_LABELS[rule.rule_type] || rule.name}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={() => handleToggle(rule.rule_type, enabled)}
                disabled={updatePreference.isPending}
              />
            </div>
          );
        })}
        
        {(!rules || rules.filter(r => r.is_active).length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay reglas de notificación activas
          </p>
        )}
      </CardContent>
    </Card>
  );
}
