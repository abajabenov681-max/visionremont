"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSpecializations } from "@/hooks/useSpecializations";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { channels, MATCHING_TIMEOUT_SECONDS, REALTIME_EVENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/db";

const schema = z.object({
  specialization_id: z.string().uuid("Выберите специализацию"),
  description: z.string().min(5, "Опишите проблему (минимум 5 символов)"),
  address: z.string().min(3, "Укажите адрес"),
});
type FormValues = z.infer<typeof schema>;

interface AcceptedMaster {
  id: string;
  full_name: string;
  rating: number;
  trust_score: number;
  avatar_url: string | null;
}

/** Полный флоу «аварийного вызова»: форма -> экран «Ищем мастера…» -> переход в заказ. */
export function UrgentCallFlow() {
  const router = useRouter();
  const { data: specializations } = useSpecializations();
  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [onlineMasters, setOnlineMasters] = useState(0);
  const [foundMaster, setFoundMaster] = useState<AcceptedMaster | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { specialization_id: "", description: "", address: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const data = await apiFetch<{ order: OrderWithRelations; online_masters: number }>(
        "/api/orders/urgent",
        { method: "POST", body: JSON.stringify(values) }
      );
      setOrder(data.order);
      setOnlineMasters(data.online_masters);
      setElapsed(0);
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    }
  }

  // Ждём событие "заказ принят" по каналу заказа
  useRealtimeChannel(
    order ? channels.order(order.id) : null,
    {
      [REALTIME_EVENTS.ORDER_ACCEPTED]: (payload) => {
        const master = payload.master as AcceptedMaster | undefined;
        if (master) setFoundMaster(master);
      },
    },
    Boolean(order) && !foundMaster
  );

  // Таймер + резервный опрос статуса (на случай пропуска realtime-события)
  useEffect(() => {
    if (!order || foundMaster) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    const poll = setInterval(async () => {
      try {
        const fresh = await apiFetch<OrderWithRelations>(`/api/orders/${order.id}`);
        if (fresh.status === "IN_PROGRESS" && fresh.master) {
          setFoundMaster({
            id: fresh.master.id,
            full_name: fresh.master.full_name,
            rating: Number(fresh.master.rating),
            trust_score: Number(fresh.master.trust_score),
            avatar_url: fresh.master.avatar_url,
          });
        }
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [order, foundMaster]);

  // Мастер найден: пауза на показ результата и переход в заказ с чатом
  useEffect(() => {
    if (!foundMaster || !order) return;
    const t = setTimeout(() => router.push(`/orders/${order.id}`), 1800);
    return () => clearTimeout(t);
  }, [foundMaster, order, router]);

  async function cancelSearch() {
    if (!order) return;
    setCancelling(true);
    try {
      await apiFetch(`/api/orders/${order.id}/cancel-urgent`, { method: "POST" });
      toast.info("Поиск отменён");
      setOrder(null);
      setFoundMaster(null);
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    } finally {
      setCancelling(false);
    }
  }

  /* ---------- экран «Ищем мастера…» ---------- */
  if (order) {
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {foundMaster ? (
            <>
              <span className="flex size-20 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="size-10 text-success" />
              </span>
              <div>
                <p className="text-xl font-bold">Мастер найден!</p>
                <p className="mt-1 text-muted-foreground">
                  {foundMaster.full_name || "Мастер"} · рейтинг {Number(foundMaster.rating).toFixed(1)} · доверие{" "}
                  {Math.round(Number(foundMaster.trust_score))}/100
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Открываем заказ и чат…</p>
              </div>
            </>
          ) : (
            <>
              <span className="relative flex size-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-urgent/20" />
                <span className="relative flex size-20 items-center justify-center rounded-full bg-urgent/10">
                  <Zap className="size-10 text-urgent" />
                </span>
              </span>
              <div>
                <p className="text-xl font-bold">Ищем мастера…</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Заявка отправлена {onlineMasters > 0 ? `${onlineMasters} мастерам на линии` : "мастерам на линии"}
                </p>
              </div>
              <p className="font-mono text-3xl font-bold tabular-nums">
                {minutes}:{seconds}
              </p>
              {elapsed >= MATCHING_TIMEOUT_SECONDS && (
                <p className="max-w-xs text-sm text-muted-foreground">
                  Поиск идёт дольше обычного. Можно продолжить ждать или отменить вызов и создать обычный заказ.
                </p>
              )}
              <Button variant="outline" className="rounded-xl" onClick={cancelSearch} disabled={cancelling}>
                {cancelling && <Loader2 className="size-4 animate-spin" />}
                Отменить поиск
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ---------- форма вызова ---------- */
  const selectedSpec = form.watch("specialization_id");
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label>Кто нужен?</Label>
        <div className="grid grid-cols-3 gap-2">
          {(specializations ?? []).map((spec) => (
            <button
              key={spec.id}
              type="button"
              onClick={() => form.setValue("specialization_id", spec.id, { shouldValidate: true })}
              className={cn(
                "rounded-xl border-2 px-2 py-3 text-sm font-medium transition-colors",
                selectedSpec === spec.id
                  ? "border-urgent bg-urgent/5 text-urgent"
                  : "border-border text-muted-foreground hover:border-muted-foreground/40"
              )}
            >
              {spec.name}
            </button>
          ))}
        </div>
        {form.formState.errors.specialization_id && (
          <p className="text-sm text-destructive">{form.formState.errors.specialization_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Что случилось?</Label>
        <Textarea
          id="description"
          rows={3}
          placeholder="Например: прорвало трубу под раковиной, вода хлещет"
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Адрес</Label>
        <div className="relative">
          <MapPin className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="address" placeholder="Улица, дом, квартира" className="pl-9" {...form.register("address")} />
        </div>
        {form.formState.errors.address && (
          <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="h-14 w-full rounded-xl bg-urgent text-lg font-bold text-urgent-foreground hover:bg-urgent/90"
      >
        {form.formState.isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5" />}
        Вызвать мастера сейчас
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Заявку мгновенно увидят все мастера выбранной специализации, находящиеся на линии
      </p>
    </form>
  );
}
