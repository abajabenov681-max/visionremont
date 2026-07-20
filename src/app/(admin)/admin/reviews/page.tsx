"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RatingStars } from "@/components/rating-stars";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import type { ReviewWithRelations } from "@/types/db";

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => apiFetch<ReviewWithRelations[]>("/api/admin/reviews"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Отзыв удалён, рейтинг мастера пересчитан");
    },
    onError: (e) => toast.error(e instanceof FetchError ? e.message : "Ошибка"),
  });

  return (
    <div>
      <PageHeader title="Отзывы" subtitle="Модерация отзывов клиентов" />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="rounded-2xl">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <RatingStars value={review.rating} />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-xl"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(review.id)}
                    aria-label="Удалить отзыв"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {review.comment && <p className="text-sm">{review.comment}</p>}
                <p className="text-xs text-muted-foreground">
                  Заказ: {review.order?.title ?? review.order_id} · {formatDate(review.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Star} title="Отзывов нет" />
      )}
    </div>
  );
}
