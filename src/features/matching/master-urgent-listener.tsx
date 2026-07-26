"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/useMe";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { apiFetch, apiFetchWithMessage, FetchError } from "@/lib/fetcher";
import { channels, REALTIME_EVENTS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { OrderWithRelations } from "@/types/db";

interface UrgentCard {
  id: string;
  title: string;
  description: string | null;
  address: string;
  specialization: string;
  created_at: string;
}

/**
 * Глобальный слушатель «аварийных вызовов» для мастера.
 * Пока мастер на линии, подписан на Realtime-каналы своих специализаций:
 * новая заявка всплывает карточкой с кнопками «Принять» / «Пропустить»;
 * событие urgent_taken мгновенно убирает карточку у всех остальных.
 */
export function MasterUrgentListener() {
  const { data: me } = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<UrgentCard[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);

  const isOnline = me?.master?.is_online ?? false;
  const specializations = me?.master?.specializations ?? [];

  const pushCard = useCallback((card: UrgentCard) => {
    setQueue((prev) => (prev.some((c) => c.id === card.id) ? prev : [...prev, card]));
  }, []);

  const removeCard = useCallback((orderId: string) => {
    setQueue((prev) => prev.filter((c) => c.id !== orderId));
  }, []);

  // Подхват заявок, созданных до подписки (вход в онлайн, перезагрузка страницы)
  useEffect(() => {
    if (!isOnline) {
      setQueue([]);
      return;
    }
    apiFetch<OrderWithRelations[]>("/api/orders/urgent/active")
      .then((orders) => {
        for (const order of orders) {
          pushCard({
            id: order.id,
            title: order.title,
            description: order.description,
            address: order.address,
            specialization: order.specialization?.name ?? "",
            created_at: order.created_at,
          });
        }
      })
      .catch(() => {});
  }, [isOnline, pushCard]);

  const handlers = {
    [REALTIME_EVENTS.URGENT_NEW]: (payload: Record<string, unknown>) => {
      const order = payload.order as UrgentCard | undefined;
      if (order) pushCard(order);
    },
    [REALTIME_EVENTS.URGENT_TAKEN]: (payload: Record<string, unknown>) => {
      const orderId = payload.order_id as string | undefined;
      if (orderId) removeCard(orderId);
    },
  };

  // Отдельная подписка на канал каждой специализации мастера.
  // Хуки нельзя вызывать в цикле переменной длины — фиксируем слоты под все MVP-специализации.
  useRealtimeChannel(specializations[0] ? channels.urgent(specializations[0].id) : null, handlers, isOnline);
  useRealtimeChannel(specializations[1] ? channels.urgent(specializations[1].id) : null, handlers, isOnline);
  useRealtimeChannel(specializations[2] ? channels.urgent(specializations[2].id) : null, handlers, isOnline);
  useRealtimeChannel(specializations[3] ? channels.urgent(specializations[3].id) : null, handlers, isOnline);

  async function accept(orderId: string) {
    setAccepting(orderId);
    try {
      const { message } = await apiFetchWithMessage<OrderWithRelations>(
        `/api/orders/${orderId}/accept-urgent`,
        { method: "POST" }
      );
      toast.success(message ?? "Заказ принят!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setQueue([]);
      router.push(`/master/orders/${orderId}`);
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
      removeCard(orderId);
    } finally {
      setAccepting(null);
    }
  }

  const card = queue[0];
  if (!card || !isOnline) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-24 sm:items-center">
      <div className="w-full max-w-md animate-in rounded-2xl border border-brand/40 bg-elevated p-5 shadow-2xl slide-in-from-bottom-4">
        <div className="flex items-center gap-2 text-urgent">
          <span className="flex size-9 items-center justify-center rounded-full bg-urgent/10">
            <Zap className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">Аварийный вызов</p>
            <p className="text-xs text-muted-foreground">
              {card.specialization} · {formatDateTime(card.created_at)}
            </p>
          </div>
          {queue.length > 1 && (
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              +{queue.length - 1} в очереди
            </span>
          )}
        </div>
        <p className="mt-3 font-semibold">{card.title}</p>
        {card.description && <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>}
        <p className="mt-2 flex items-center gap-1.5 text-sm">
          <MapPin className="size-4 text-muted-foreground" />
          {card.address}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => removeCard(card.id)}
            disabled={accepting === card.id}
          >
            Пропустить
          </Button>
          <Button
            className="h-11 rounded-xl bg-urgent text-urgent-foreground hover:bg-brand-hover"
            onClick={() => accept(card.id)}
            disabled={accepting === card.id}
          >
            {accepting === card.id && <Loader2 className="size-4 animate-spin" />}
            Принять
          </Button>
        </div>
      </div>
    </div>
  );
}
