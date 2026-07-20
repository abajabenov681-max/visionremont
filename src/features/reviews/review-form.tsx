"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "@/components/rating-stars";
import { apiFetch, FetchError } from "@/lib/fetcher";

export function ReviewForm({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (rating === 0) {
      toast.error("Поставьте оценку");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ order_id: orderId, rating, comment: comment || undefined }),
      });
      toast.success("Спасибо за отзыв!");
      queryClient.invalidateQueries({ queryKey: ["order-review", orderId] });
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Оцените работу мастера</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-center">
          <RatingStars value={rating} onChange={setRating} size="lg" />
        </div>
        <Textarea
          rows={3}
          placeholder="Как всё прошло? (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button className="h-10 w-full rounded-xl" onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Отправить отзыв
        </Button>
      </CardContent>
    </Card>
  );
}
