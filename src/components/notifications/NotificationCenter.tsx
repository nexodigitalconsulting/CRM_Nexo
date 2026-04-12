"use client";

import { useState, useEffect } from "react";
import { Bell, X, Check, AlertCircle, Calendar, FileText, Receipt, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/api/notifications";

const notificationIcons: Record<NotificationRow["type"], typeof Bell> = {
  contract_expiring: Calendar,
  invoice_due: Receipt,
  quote_pending: FileText,
  billing_reminder: Clock,
  general: AlertCircle,
};

const notificationColors: Record<NotificationRow["type"], string> = {
  contract_expiring: "text-warning",
  invoice_due: "text-destructive",
  quote_pending: "text-primary",
  billing_reminder: "text-success",
  general: "text-muted-foreground",
};

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [toastsShown, setToastsShown] = useState(false);

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 5 * 60 * 1000,
  });

  const markOneMutation = useMutation({
    mutationFn: ({ entityId, entityType }: { entityId: string; entityType: string }) =>
      markNotificationRead(entityId, entityType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  // Show toasts for new unread notifications (once per load)
  useEffect(() => {
    if (!toastsShown && notifs.length > 0 && !isOpen) {
      const unread = notifs.filter((n) => !n.isRead);
      if (unread.length > 0 && unread.length <= 3) {
        unread.slice(0, 3).forEach((notification) => {
          const Icon = notificationIcons[notification.type];
          toast(notification.title, {
            description: notification.message,
            duration: 5000,
            icon: <Icon className={cn("h-4 w-4", notificationColors[notification.type])} />,
          });
        });
        setToastsShown(true);
      }
    }
  }, [notifs, isOpen, toastsShown]);

  const handleMarkOne = (n: NotificationRow) => {
    if (!n.isRead && n.entityId && n.entityType) {
      markOneMutation.mutate({ entityId: n.entityId, entityType: n.entityType });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h4 className="font-semibold">Notificaciones</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} nuevas</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando notificaciones...
            </div>
          ) : notifs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifs.map((notification) => {
                const Icon = notificationIcons[notification.type];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      !notification.isRead && "bg-primary/5"
                    )}
                    onClick={() => handleMarkOne(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "p-2 rounded-full shrink-0",
                        notification.type === "contract_expiring" && "bg-warning/10",
                        notification.type === "invoice_due" && "bg-destructive/10",
                        notification.type === "quote_pending" && "bg-primary/10",
                        notification.type === "billing_reminder" && "bg-success/10",
                        notification.type === "general" && "bg-muted"
                      )}>
                        <Icon className={cn("h-4 w-4", notificationColors[notification.type])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            notification.isRead && "text-muted-foreground"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
