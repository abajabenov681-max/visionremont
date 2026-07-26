/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Loader2, MapPin, Pencil, ShieldCheck, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckDraw } from "@/components/motion";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { RatingStars } from "@/components/rating-stars";
import { TrustBadge } from "@/components/trust-badge";
import { ApplicationsList } from "@/features/orders/applications-list";
import { ImageUploader } from "@/features/orders/image-uploader";
import { ChatPanel } from "@/features/chat/chat-panel";
import { ReviewForm } from "@/features/reviews/review-form";
import { FavoriteButton } from "@/features/favorites/favorite-button";
import { EscrowBreakdown, EscrowCard } from "@/features/escrow/escrow-card";
import { useMe } from "@/hooks/useMe";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { EscrowTransactionRow, OrderWithRelations, ReviewRow, WarrantyWithRelations } from "@/types/db";

export default function ClientOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<{ escrow: EscrowTransactionRow } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiFetch<OrderWithRelations>(`/api/orders/${id}`),
  });

  const { data: review } = useQuery({
    queryKey: ["order-review", id],
    queryFn: () => apiFetch<ReviewRow | null>(`/api/reviews?order_id=${id}`),
    enabled: order?.status === "COMPLETED" || order?.status === "WARRANTY_ACTIVE",
  });

  const { data: warranties } = useQuery({
    queryKey: ["warranties"],
    queryFn: () => apiFetch<WarrantyWithRelations[]>("/api/warranties"),
    enabled: order?.status === "WARRANTY_ACTIVE",
  });
  const warranty = warranties?.find((w) => w.order_id === id);

  async function confirmCompletion() {
    setConfirming(true);
    try {
      const created = await apiFetch<{ warranty: WarrantyWithRelations; escrow: EscrowTransactionRow }>(
        `/api/orders/${id}/confirm`,
        { method: "POST" }
      );
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      // Оверлей: галочка + escrow-разбивка (F = O × 0.07, M = O − F), затем сертификат
      setConfirmed({ escrow: created.escrow });
      setTimeout(() => router.push(`/warranties/${created.warranty.id}`), 3200);
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
      setConfirming(false);
    }
  }

  async function deleteOrder() {
    setDeleting(true);
    try {
      await apiFetch(`/api/orders/${id}`, { method: "DELETE" });
      toast.success("Заказ удалён");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.replace("/orders");
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
      setDeleting(false);
    }
  }

  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  const beforeImages = order.images.filter((i) => i.type === "BEFORE");
  const afterImages = order.images.filter((i) => i.type === "AFTER");
  const chatOpen = Boolean(order.selected_master) && order.status !== "CANCELLED";

  return (
    <div className="space-y-4">
      {/* Оверлей подтверждения: галочка, затем анимированный переход
          «Средства зарезервированы» -> «Переведено мастеру» с разбивкой по TVEP */}
      <AnimatePresence>
        {confirmed && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CheckDraw className="size-20 text-success" />
            <p className="text-lg font-bold">Гарантия активирована!</p>
            <motion.div
              className="w-full max-w-sm space-y-2 rounded-2xl border bg-card p-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.35, ease: "easeOut" }}
            >
              <motion.p
                className="text-sm font-medium text-muted-foreground"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ delay: 1.6, duration: 0.3 }}
              >
                Средства зарезервированы 🔒
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 0.35 }}
                className="space-y-2"
              >
                <p className="font-semibold">Переведено мастеру ✅</p>
                <EscrowBreakdown escrow={confirmed.escrow} />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        title={order.title}
        subtitle={`Создан ${formatDateTime(order.created_at)}`}
        action={<StatusBadge status={order.status} />}
      />

      {/* Детали заказа */}
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
              <span className="font-semibold text-foreground">{formatMoney(Number(order.budget))}</span>
            )}
          </div>
          {order.status === "WAITING" && (
            <div className="flex gap-2 border-t pt-3">
              <ImageUploader orderId={id} type="BEFORE" label="Фото «до»" />
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/orders/${id}/edit`}>
                  <Pencil className="size-4" />
                  Изменить
                </Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="ml-auto rounded-xl">
                    <Trash2 className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Удалить заказ?</DialogTitle>
                    <DialogDescription>Заказ пропадёт из ленты мастеров. Действие можно выполнить только для заказов без выбранного мастера.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="destructive" className="rounded-xl" onClick={deleteOrder} disabled={deleting}>
                      {deleting && <Loader2 className="size-4 animate-spin" />}
                      Удалить
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Escrow: состояние безопасной сделки */}
      <EscrowCard escrow={order.escrow} />

      {/* Фото */}
      {(beforeImages.length > 0 || afterImages.length > 0) && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Фото</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[...beforeImages, ...afterImages].map((img) => (
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

      {/* Выбранный мастер */}
      {order.master && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Ваш мастер</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarImage src={order.master.avatar_url ?? undefined} />
              <AvatarFallback>{(order.master.full_name || "М").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link href={`/masters/${order.master.id}`} className="flex items-center gap-1 font-semibold hover:underline">
                {order.master.full_name || "Мастер"}
                {order.master.id_verified && <BadgeCheck className="size-4 text-success" />}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <RatingStars value={Number(order.master.rating)} />
                <TrustBadge score={Number(order.master.trust_score)} />
              </div>
            </div>
            <FavoriteButton masterId={order.master.id} />
          </CardContent>
        </Card>
      )}

      {/* Подтверждение завершения */}
      {order.status === "WAIT_CONFIRMATION" && (
        <Card className="rounded-2xl border-2 border-success/40">
          <CardContent className="space-y-3">
            <p className="font-semibold">Мастер сообщил, что работа выполнена</p>
            <p className="text-sm text-muted-foreground">
              Проверьте результат по фото «после». После подтверждения автоматически активируется цифровая гарантия
              с сертификатом.
            </p>
            <Button
              className="h-11 w-full rounded-xl bg-success text-success-foreground hover:bg-success/90"
              onClick={confirmCompletion}
              disabled={confirming}
            >
              {confirming ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Подтвердить и активировать гарантию
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Гарантия */}
      {order.status === "WARRANTY_ACTIVE" && warranty && (
        <Button asChild variant="outline" className="h-11 w-full rounded-xl border-success/40 text-success">
          <Link href={`/warranties/${warranty.id}`}>
            <ShieldCheck className="size-4" />
            Открыть сертификат гарантии
          </Link>
        </Button>
      )}

      {/* Отзыв */}
      {(order.status === "COMPLETED" || order.status === "WARRANTY_ACTIVE") && !review && (
        <ReviewForm orderId={id} />
      )}

      {/* Отклики (для обычных заказов в ожидании) */}
      {!order.is_urgent && order.status === "WAITING" && (
        <section>
          <h2 className="mb-3 font-semibold">Отклики мастеров</h2>
          <ApplicationsList orderId={id} canSelect />
        </section>
      )}

      {/* Чат */}
      {chatOpen && me && <ChatPanel orderId={id} myUserId={me.user.id} />}
    </div>
  );
}
