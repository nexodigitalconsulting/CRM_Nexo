export interface NotificationRow {
  id: string;
  type: "contract_expiring" | "invoice_due" | "quote_pending" | "billing_reminder" | "general";
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function fetchNotifications(): Promise<NotificationRow[]> {
  const res = await fetch("/api/data/notifications");
  if (!res.ok) return [];
  return res.json() as Promise<NotificationRow[]>;
}

export async function markNotificationRead(entityId: string, entityType: string): Promise<void> {
  await fetch("/api/data/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityId, entityType }),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch("/api/data/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ all: true }),
  });
}
