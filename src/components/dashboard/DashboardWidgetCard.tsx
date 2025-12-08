import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Settings, X } from "lucide-react";
import type { DashboardWidget } from "@/hooks/useDashboardWidgets";
import { cn } from "@/lib/utils";

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
  children: ReactNode;
  isEditing?: boolean;
  onRemove?: () => void;
  onConfigure?: () => void;
}

export function DashboardWidgetCard({
  widget,
  children,
  isEditing = false,
  onRemove,
  onConfigure,
}: DashboardWidgetCardProps) {
  const sizeClasses = {
    small: "col-span-1",
    medium: "col-span-1 lg:col-span-2",
    large: "col-span-1 lg:col-span-2 xl:col-span-3",
  };

  return (
    <Card
      className={cn(
        "relative transition-all duration-200",
        sizeClasses[widget.size],
        isEditing && "ring-2 ring-primary/20 ring-offset-2"
      )}
    >
      {isEditing && (
        <div className="absolute -top-2 -right-2 flex gap-1 z-10">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 rounded-full shadow-md"
            onClick={onConfigure}
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6 rounded-full shadow-md"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {isEditing && (
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          )}
          <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
