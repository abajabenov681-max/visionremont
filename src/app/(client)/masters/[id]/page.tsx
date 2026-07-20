"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { RatingStars } from "@/components/rating-stars";
import { TrustBadge } from "@/components/trust-badge";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { apiFetch } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import type { MasterPublic, ReviewWithRelations } from "@/types/db";

export default function MasterPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["master", id],
    queryFn: () => apiFetch<{ master: MasterPublic; reviews: ReviewWithRelations[] }>(`/api/masters/${id}`),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  const { master, reviews } = data;

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardContent className="space-y-3">
          <div className="flex items-start gap-4">
            <Avatar className="size-16">
              <AvatarImage src={master.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">
                {(master.full_name || "М").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-lg font-bold">
                {master.full_name || "Мастер"}
                {master.id_verified && <BadgeCheck className="size-5 text-success" />}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <RatingStars value={Number(master.rating)} />
                <span className="text-sm text-muted-foreground">
                  {Number(master.rating).toFixed(1)} · {master.reviews_count} отзывов
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {master.specializations.map((s) => (
                  <Badge key={s.id} variant="secondary" className="rounded-full font-normal">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
            <FavoriteButton masterId={master.id} />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <TrustBadge score={Number(master.trust_score)} />
            <span className="text-sm text-muted-foreground">{master.completed_orders} завершённых заказов</span>
          </div>
          {master.description && <p className="text-sm text-muted-foreground">{master.description}</p>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Отзывы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 ? (
            <EmptyState icon={Star} title="Отзывов пока нет" />
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
