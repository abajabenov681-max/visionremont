import Link from "next/link";
import { MapPin, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { OrderWithRelations } from "@/types/db";

export function OrderCard({ order, href }: { order: OrderWithRelations; href: string }) {
  return (
    <Link href={href}>
      <Card className="rounded-2xl transition-shadow hover:shadow-md">
        <CardContent className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 font-semibold">
              {order.is_urgent && <Zap className="size-4 shrink-0 text-urgent" />}
              <span className="line-clamp-1">{order.title}</span>
            </p>
            <StatusBadge status={order.status} className="shrink-0" />
          </div>
          {order.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{order.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {order.address}
            </span>
            {order.specialization && <span>{order.specialization.name}</span>}
            <span>{formatDateTime(order.created_at)}</span>
            {order.budget != null && (
              <span className="ml-auto text-sm font-semibold text-foreground">{formatMoney(Number(order.budget))}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
