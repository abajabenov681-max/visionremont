"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, MapPin, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/fetcher";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/constants";
import type { OrderWithRelations } from "@/types/db";

const STATUS_FILTERS: ("" | OrderStatus)[] = ["", "WAITING", "MATCHING", "IN_PROGRESS", "WAIT_CONFIRMATION", "COMPLETED", "WARRANTY_ACTIVE", "CANCELLED"];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<"" | OrderStatus>("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      return apiFetch<OrderWithRelations[]>(`/api/admin/orders?${params}`);
    },
  });

  return (
    <div>
      <PageHeader title="Заказы" subtitle="Все заказы платформы, включая удалённые" />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              status === s ? "bg-brand text-brand-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "" ? "Все" : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className={cn("rounded-2xl", order.deleted_at && "opacity-60")}>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {order.is_urgent && <Zap className="size-4 text-urgent" />}
                    <span className="line-clamp-1">{order.title}</span>
                  </p>
                  <StatusBadge status={order.status} className="shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {order.address}
                  </span>
                  <span>Клиент: {order.client?.full_name || "—"}</span>
                  <span>Мастер: {order.master?.full_name || "—"}</span>
                  <span>{formatDateTime(order.created_at)}</span>
                  {order.budget != null && <span className="font-semibold text-foreground">{formatMoney(Number(order.budget))}</span>}
                  {order.deleted_at && <span className="text-destructive">Удалён</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={ListChecks} title="Заказов нет" />
      )}
    </div>
  );
}
