"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { MotionItem, MotionList } from "@/components/motion";
import { OrderCard } from "@/components/order-card";
import { PageHeader } from "@/components/page-header";
import { useSpecializations } from "@/hooks/useSpecializations";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/db";

/** Открытая лента заказов с фильтрами по специализации и поиском. */
export default function OrdersFeedPage() {
  const [specId, setSpecId] = useState<string>("");
  const [search, setSearch] = useState("");
  const { data: specializations } = useSpecializations();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "feed", specId, search],
    queryFn: () => {
      const params = new URLSearchParams({ scope: "feed" });
      if (specId) params.set("specialization_id", specId);
      if (search) params.set("search", search);
      return apiFetch<OrderWithRelations[]>(`/api/orders?${params}`);
    },
  });

  return (
    <div>
      <PageHeader title="Лента заказов" subtitle="Открытые заказы, ожидающие откликов" />
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSpecId("")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              !specId ? "bg-brand text-brand-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Все
          </button>
          {(specializations ?? []).map((spec) => (
            <button
              key={spec.id}
              onClick={() => setSpecId(spec.id === specId ? "" : spec.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                specId === spec.id ? "bg-brand text-brand-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {spec.name}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : orders && orders.length > 0 ? (
        <MotionList className="space-y-3">
          {orders.map((order) => (
            <MotionItem key={order.id}>
              <OrderCard order={order} href={`/master/orders/${order.id}`} />
            </MotionItem>
          ))}
        </MotionList>
      ) : (
        <EmptyState icon={Newspaper} title="Открытых заказов нет" description="Загляните позже или измените фильтры" />
      )}
    </div>
  );
}
