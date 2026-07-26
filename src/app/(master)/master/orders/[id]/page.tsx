/* eslint-disable @next/next/no-img-element */
"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ApplyForm } from "@/features/orders/apply-form";
import { ImageUploader } from "@/features/orders/image-uploader";
import { ChatPanel } from "@/features/chat/chat-panel";
import { useMe } from "@/hooks/useMe";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { ApplicationWithRelations, OrderWithRelations } from "@/types/db";

export default function MasterOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [completing, setCompleting] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiFetch<OrderWithRelations>(`/api/orders/${id}`),
  });

  const { data: myApplications } = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => apiFetch<ApplicationWithRelations[]>("/api/applications"),
  });

  const masterId = me?.master?.id;
  const isMine = Boolean(order && masterId && order.selected_master === masterId);
  const alreadyApplied = Boolean(myApplications?.some((a) => a.order_id === id));

  async function markComplete() {
    setCompleting(true);
    try {
      await apiFetch(`/api/orders/${id}/complete`, { method: "POST" });
      toast.success("Работа отправлена на подтверждение клиенту");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    } finally {
      setCompleting(false);
    }
  }

  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const afterImages = order.images.filter((i) => i.type === "AFTER");

  return (
    <div className="space-y-4">
      <PageHeader
        title={order.title}
        subtitle={`Создан ${formatDateTime(order.created_at)}`}
        action={<StatusBadge status={order.status} />}
      />

      <Card className="rounded-2xl">
        <CardContent className="space-y-3">
          {order.is_urgent && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-urgent">
              <Zap className="size-4" />
              Срочный вызов
            </p>
          )}
          {order.description && <p className="text-sm">{order.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" />
              {order.address}
            </span>
            {order.specialization && <span>{order.specialization.name}</span>}
            {order.budget != null && (
              <span className="font-semibold text-foreground">Бюджет: {formatMoney(Number(order.budget))}</span>
            )}
          </div>
          {order.client && (
            <p className="border-t pt-3 text-sm text-muted-foreground">
              Клиент: <span className="font-medium text-foreground">{order.client.full_name || "Без имени"}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Фото */}
      {order.images.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Фото</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {order.images.map((img) => (
              <figure key={img.id}>
                <img src={img.image_url} alt={img.type === "BEFORE" ? "До" : "После"} className="aspect-square w-full rounded-xl object-cover" />
                <figcaption className="mt-1 text-center text-xs text-muted-foreground">
                  {img.type === "BEFORE" ? "До" : "После"}
                </figcaption>
              </figure>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Чат выше завершения — при фокусе на поле ввода браузер не уводит кнопку «Работа выполнена» */}
      {isMine && me && <ChatPanel orderId={id} myUserId={me.user.id} />}

      {/* Работа в процессе: фото «до/после» + завершение (как в первом варианте) */}
      {isMine && order.status === "IN_PROGRESS" && (
        <Card className="rounded-2xl border-2 border-blue-500/30">
          <CardContent className="space-y-3">
            <p className="font-semibold">Завершение работы</p>
            <p className="text-sm text-muted-foreground">
              Загрузите фото результата — они попадут в сертификат гарантии. Затем отправьте работу на
              подтверждение клиенту.
            </p>
            <div className="flex flex-wrap gap-2">
              <ImageUploader orderId={id} type="BEFORE" label="Фото «до»" />
              <ImageUploader orderId={id} type="AFTER" label="Фото «после»" />
            </div>
            <Button
              className="h-11 w-full rounded-xl bg-success text-success-foreground hover:bg-success/90"
              onClick={markComplete}
              disabled={completing || afterImages.length === 0}
            >
              {completing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {afterImages.length === 0 ? "Сначала загрузите фото «после»" : "Работа выполнена"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isMine && order.status === "WAIT_CONFIRMATION" && (
        <Card className="rounded-2xl border-amber-500/40 bg-amber-500/5">
          <CardContent className="text-sm">
            Ожидаем подтверждения клиента. После подтверждения заказ перейдёт в гарантию, а статистика — в ваш
            рейтинг.
          </CardContent>
        </Card>
      )}

      {/* Отклик на обычный заказ */}
      {!isMine && !order.is_urgent && order.status === "WAITING" && !alreadyApplied && <ApplyForm orderId={id} />}
      {!isMine && order.status === "WAITING" && alreadyApplied && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="text-sm text-muted-foreground">
            Вы откликнулись на этот заказ. Ждём решения клиента.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
