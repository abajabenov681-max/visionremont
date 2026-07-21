import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

const STATUS_STYLES: Record<OrderStatus, string> = {
  WAITING: "bg-brand-muted text-brand",
  MATCHING: "bg-brand-muted text-brand",
  IN_PROGRESS: "bg-brand-muted text-brand",
  WAIT_CONFIRMATION: "bg-brand-muted text-brand",
  COMPLETED: "bg-success/10 text-success",
  WARRANTY_ACTIVE: "bg-success/15 text-success",
  CANCELLED: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", STATUS_STYLES[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
