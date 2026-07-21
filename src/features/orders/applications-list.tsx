"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { MotionItem, MotionList } from "@/components/motion";
import { RatingStars } from "@/components/rating-stars";
import { TrustBadge } from "@/components/trust-badge";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { formatMoney, pluralRu } from "@/lib/format";
import type { ApplicationWithRelations } from "@/types/db";

/** Список откликов на заказ (для клиента) с выбором мастера. */
export function ApplicationsList({ orderId, canSelect }: { orderId: string; canSelect: boolean }) {
  const queryClient = useQueryClient();
  const [selecting, setSelecting] = useState<string | null>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications", orderId],
    queryFn: () => apiFetch<ApplicationWithRelations[]>(`/api/orders/${orderId}/applications`),
  });

  async function select(applicationId: string) {
    setSelecting(applicationId);
    try {
      await apiFetch(`/api/orders/${orderId}/select-master`, {
        method: "POST",
        body: JSON.stringify({ application_id: applicationId }),
      });
      toast.success("Мастер выбран, чат открыт");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    } finally {
      setSelecting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="Откликов пока нет"
        description="Мастера увидят заказ в ленте и предложат цену"
      />
    );
  }

  return (
    <MotionList className="space-y-3">
      {applications.map((app) => (
        <MotionItem key={app.id}>
        <Card className="rounded-2xl">
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="size-10">
                <AvatarImage src={app.master?.avatar_url ?? undefined} />
                <AvatarFallback>{(app.master?.full_name || "М").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{app.master?.full_name || "Мастер"}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <RatingStars value={Number(app.master?.rating ?? 0)} />
                  {app.master && <TrustBadge score={Number(app.master.trust_score)} />}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatMoney(Number(app.price))}</p>
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {app.estimated_days} {pluralRu(app.estimated_days, "день", "дня", "дней")}
                </p>
              </div>
            </div>
            {app.comment && <p className="text-sm text-muted-foreground">{app.comment}</p>}
            {canSelect && (
              <Button
                className="h-10 w-full rounded-xl"
                onClick={() => select(app.id)}
                disabled={selecting !== null}
              >
                {selecting === app.id && <Loader2 className="size-4 animate-spin" />}
                Выбрать этого мастера
              </Button>
            )}
          </CardContent>
        </Card>
        </MotionItem>
      ))}
    </MotionList>
  );
}
