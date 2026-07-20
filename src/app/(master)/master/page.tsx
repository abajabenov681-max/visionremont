"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ListChecks, ShieldCheck, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "@/components/order-card";
import { TrustBadge } from "@/components/trust-badge";
import { OnlineToggle } from "@/features/matching/online-toggle";
import { useMe } from "@/hooks/useMe";
import { apiFetch } from "@/lib/fetcher";
import type { OrderWithRelations } from "@/types/db";

export default function MasterHomePage() {
  const { data: me } = useMe();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: () => apiFetch<OrderWithRelations[]>("/api/orders"),
  });

  const activeOrders = (orders ?? []).filter((o) => ["IN_PROGRESS", "WAIT_CONFIRMATION"].includes(o.status));
  const master = me?.master;
  const noSpecializations = master && master.specializations.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {master?.full_name ? `Привет, ${master.full_name.split(" ")[0]}!` : "Рабочий кабинет"}
        </h1>
        {master && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TrustBadge score={Number(master.trust_score)} />
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {Number(master.rating).toFixed(1)} · {master.completed_orders} заказов
            </span>
          </div>
        )}
      </div>

      {/* Тумблер «На линии» — вход в поток срочных заявок */}
      <OnlineToggle size="lg" />

      {noSpecializations && (
        <Card className="rounded-2xl border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm">
              Укажите специализации в профиле, чтобы получать срочные вызовы
            </p>
            <Link href="/master/profile" className="shrink-0 text-sm font-semibold hover:underline">
              В профиль
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/master/orders/feed">
          <Card className="h-full rounded-2xl transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                <ListChecks className="size-5" />
              </span>
              <p className="font-semibold">Лента заказов</p>
              <p className="text-xs text-muted-foreground">Откликайтесь на обычные заказы</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/master/warranties">
          <Card className="h-full rounded-2xl transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-success/10">
                <ShieldCheck className="size-5 text-success" />
              </span>
              <p className="font-semibold">Гарантии</p>
              <p className="text-xs text-muted-foreground">Выданные сертификаты</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Заказы в работе</h2>
          <Link href="/master/orders" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Все <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : activeOrders.length > 0 ? (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} href={`/master/orders/${order.id}`} />
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="text-sm text-muted-foreground">
              Заказов в работе нет. Включите «На линии», чтобы ловить срочные вызовы, или откликайтесь в ленте.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
