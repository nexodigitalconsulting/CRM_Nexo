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

interface Notification {
  id: string;
  type: "contract_expiring" | "invoice_due" | "quote_pending" | "billing_reminder" | "general";
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

// Generate notifications from data
function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notification[]> => {
      const res = await fetch("/api/data/notifications");
      if (!res.ok) return [];
      const data = await res.json() as Notification[];
      return data.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

const notificationIcons: Record<Notification["type"], typeof Bell> = {
  contract_expiring: Calendar,
  invoice_due: Receipt,
  quote_pending: FileText,
  billing_reminder: Clock,
  general: AlertCircle,
};

const notificationColors: Record<Notification["type"], string> = {
  contract_expiring: "text-warning",
  invoice_due: "text-destructive",
  quote_pending: "text-primary",
  billing_reminder: "text-success",
  general: "text-muted-foreground",
};

export function NotificationCenter() {
  const { data: notifications = [], isLoading } = useNotifications();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [showToasts, setShowToasts] = useState(true);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // Show toast for new notifications
  useEffect(() => {
    if (showToasts && notifications.length > 0 && !isOpen) {
      const unreadNotifications = notifications.filter((n) => !readIds.has(n.id));
      if (unreadNotifications.length > 0 && unreadNotifications.length <= 3) {
        // Only show toasts if there are 1-3 new notifications
        unreadNotifications.slice(0, 3).forEach((notification) => {
          const Icon = notificationIcons[notification.type];
          toast(notification.title, {
            description: notification.message,
            duration: 5000,
            icon: <Icon className={cn("h-4 w-4", notificationColors[notification.type])} />,
          });
        });
        setShowToasts(false); // Don't show again until next fetch
      }
    }
  }, [notifications, readIds, isOpen, showToasts]);

  const markAsRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
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
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
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
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                const isRead = readIds.has(notification.id);
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      !isRead && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
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
                            isRead && "text-muted-foreground"
                          )}>
                            {notification.title}
                          </p>
                          {!isRead && (
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
