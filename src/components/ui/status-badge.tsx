import { cn } from "@/lib/utils";

type StatusVariant = "new" | "active" | "pending" | "inactive" | "danger" | "success";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  new: "status-new",
  active: "status-active",
  pending: "status-pending",
  inactive: "status-inactive",
  danger: "status-danger",
  success: "status-active",
};

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span className={cn("status-badge", variantStyles[variant], className)}>
      {children}
    </span>
  );
}
