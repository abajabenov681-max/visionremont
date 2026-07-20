"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { OrderCard } from "@/components/order-card";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/db";

const FILTERS = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "done", label: "Завершённые" },
] as const;

export default function ClientOrdersPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: () => apiFetch<OrderWithRelations[]>("/api/orders"),
  });

  const filtered = (orders ?? []).filter((o) => {
    if (filter === "active") return ["WAITING", "MATCHING", "IN_PROGRESS", "WAIT_CONFIRMATION"].includes(o.status);
    if (filter === "done") return ["COMPLETED", "WARRANTY_ACTIVE", "CANCELLED"].includes(o.status);
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Мои заказы"
        action={
          <Button asChild className="rounded-xl">
            <Link href="/orders/new">
              <Plus className="size-4" />
              Новый
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.value ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} href={`/orders/${order.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="Заказов нет"
          description="Создайте заказ — мастера откликнутся с ценами"
          action={
            <Button asChild className="rounded-xl">
              <Link href="/orders/new">Создать заказ</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
