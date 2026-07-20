"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Gauge, ListChecks, Radio, ShieldCheck, Star, Users, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/fetcher";
import type { DashboardStats } from "@/services/AdminService";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/api/admin/dashboard"),
    refetchInterval: 30_000,
  });

  const cards = stats
    ? [
        { icon: Users, label: "Пользователи", value: stats.users_total, hint: `${stats.clients_total} клиентов · ${stats.masters_total} мастеров` },
        { icon: Radio, label: "Мастеров на линии", value: stats.masters_online, hint: "готовы принять срочный вызов" },
        { icon: Zap, label: "Срочных в поиске", value: stats.orders_urgent_matching, hint: "статус MATCHING" },
        { icon: ListChecks, label: "Всего заказов", value: stats.orders_total, hint: `${stats.orders_active} активных` },
        { icon: CircleCheck, label: "Завершено", value: stats.orders_completed, hint: "включая гарантийные" },
        { icon: ShieldCheck, label: "Гарантий активно", value: stats.warranties_active, hint: "цифровые сертификаты" },
        { icon: Star, label: "Отзывов", value: stats.reviews_total, hint: "всего на платформе" },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Дашборд" subtitle="Ключевые показатели платформы" />
      {isLoading || !stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.label} className="rounded-2xl">
              <CardContent className="flex flex-col gap-1.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                  <card.icon className="size-4.5" />
                </span>
                <p className="text-2xl font-bold">{card.value}</p>
                <div>
                  <p className="text-sm font-medium">{card.label}</p>
                  <p className="text-xs text-muted-foreground">{card.hint}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Gauge className="size-3.5" />
        Данные обновляются каждые 30 секунд
      </p>
    </div>
  );
}
