"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CircleCheck, FileText, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RatingStars } from "@/components/rating-stars";
import { useMe } from "@/hooks/useMe";
import { apiFetch } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import type { ReviewWithRelations } from "@/types/db";

/** Экран рейтинга мастера с разбором формулы Trust Score. */
export default function MasterRatingPage() {
  const { data: me, isLoading } = useMe();
  const master = me?.master;

  const { data: reviews } = useQuery({
    queryKey: ["master-reviews", master?.id],
    queryFn: () => apiFetch<ReviewWithRelations[]>(`/api/reviews?master_id=${master!.id}`),
    enabled: Boolean(master?.id),
  });

  if (isLoading || !master) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  const breakdown = [
    {
      icon: Star,
      label: "Рейтинг отзывов",
      weight: "40%",
      value: `${Number(master.rating).toFixed(1)} из 5`,
    },
    {
      icon: CircleCheck,
      label: "Завершённые заказы",
      weight: "30%",
      value: `${master.completed_orders} выполнено`,
    },
    {
      icon: FileText,
      label: "Подтверждённые документы",
      weight: "20%",
      value: master.id_verified ? "Подтверждены" : "Не подтверждены",
    },
    {
      icon: TrendingUp,
      label: "Объём заказов",
      weight: "10%",
      value: `${master.completed_orders} всего`,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Рейтинг и доверие" />

      <Card className="rounded-2xl bg-foreground text-background">
        <CardContent className="flex flex-col items-center gap-1 py-8 text-center">
          <p className="text-sm opacity-70">Trust Score</p>
          <p className="text-5xl font-bold">
            {Math.round(Number(master.trust_score))}
            <span className="text-2xl opacity-60">/100</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <RatingStars value={Number(master.rating)} />
            <span className="text-sm opacity-70">{master.reviews_count} отзывов</span>
          </div>
          {master.id_verified && (
            <p className="mt-2 flex items-center gap-1 rounded-full bg-background/10 px-3 py-1 text-xs">
              <BadgeCheck className="size-3.5" />
              Документы подтверждены
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Из чего складывается Trust Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                <item.icon className="size-4.5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.value}</p>
              </div>
              <span className="text-sm font-bold text-muted-foreground">{item.weight}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Отзывы клиентов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!reviews || reviews.length === 0 ? (
            <EmptyState icon={Star} title="Отзывов пока нет" description="Завершайте заказы — клиенты оставят оценки" />
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{review.client?.full_name || "Клиент"}</p>
                  <RatingStars value={review.rating} />
                </div>
                {review.comment && <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
