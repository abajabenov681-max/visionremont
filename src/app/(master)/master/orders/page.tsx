"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { OrderCard } from "@/components/order-card";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/fetcher";
import type { OrderWithRelations } from "@/types/db";

/** Мои заказы мастера (назначенные ему). */
export default function MasterOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: () => apiFetch<OrderWithRelations[]>("/api/orders"),
  });

  return (
    <div>
      <PageHeader
        title="Мои заказы"
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/master/orders/feed">
              <Newspaper className="size-4" />
              Лента
            </Link>
          </Button>
        }
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} href={`/master/orders/${order.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="Назначенных заказов нет"
          description="Примите срочный вызов или дождитесь выбора клиента по вашему отклику"
          action={
            <Button asChild className="rounded-xl">
              <Link href="/master/orders/feed">Открыть ленту заказов</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
