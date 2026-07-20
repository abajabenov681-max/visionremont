import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";

const STATUS_STYLES: Record<OrderStatus, string> = {
  WAITING: "bg-muted text-muted-foreground",
  MATCHING: "bg-urgent/10 text-urgent",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600",
  WAIT_CONFIRMATION: "bg-amber-500/10 text-amber-600",
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
