"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Hammer, ListPlus, ShieldCheck, Wrench, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "@/components/order-card";
import { useMe } from "@/hooks/useMe";
import { apiFetch } from "@/lib/fetcher";
import type { OrderWithRelations } from "@/types/db";

export default function ClientHomePage() {
  const { data: me } = useMe();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "my"],
    queryFn: () => apiFetch<OrderWithRelations[]>("/api/orders"),
  });

  const activeOrders = (orders ?? []).filter((o) =>
    ["MATCHING", "IN_PROGRESS", "WAIT_CONFIRMATION"].includes(o.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {me?.client?.full_name ? `Здравствуйте, ${me.client.full_name.split(" ")[0]}!` : "Здравствуйте!"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Что нужно починить сегодня?</p>
      </div>

      {/* Главная кнопка «Аварийный вызов» */}
      <Link href="/urgent" className="block">
        <div className="group relative overflow-hidden rounded-2xl bg-urgent p-6 text-urgent-foreground shadow-lg transition-transform active:scale-[0.99]">
          <div className="relative z-10 flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Zap className="size-8" />
            </span>
            <div className="flex-1">
              <p className="text-xl font-bold">Аварийный вызов</p>
              <p className="text-sm opacity-90">Мастер на линии примет заявку за минуты</p>
            </div>
            <ArrowRight className="size-6 transition-transform group-hover:translate-x-1" />
          </div>
          <Wrench className="absolute -right-4 -bottom-6 size-32 rotate-12 opacity-10" />
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/orders/new">
          <Card className="h-full rounded-2xl transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                <ListPlus className="size-5" />
              </span>
              <p className="font-semibold">Обычный заказ</p>
              <p className="text-xs text-muted-foreground">Сравните отклики и цены мастеров</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/warranties">
          <Card className="h-full rounded-2xl transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-success/10">
                <ShieldCheck className="size-5 text-success" />
              </span>
              <p className="font-semibold">Мои гарантии</p>
              <p className="text-xs text-muted-foreground">Цифровые сертификаты с фото до/после</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Активные заказы</h2>
          <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
            Все заказы
          </Link>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : activeOrders.length > 0 ? (
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} href={`/orders/${order.id}`} />
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
              <Hammer className="size-5" />
              Активных заказов нет — создайте первый
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
