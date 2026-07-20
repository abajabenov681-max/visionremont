"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSpecializations } from "@/hooks/useSpecializations";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/db";

const schema = z.object({
  specialization_id: z.string().uuid("Выберите специализацию"),
  title: z.string().min(3, "Минимум 3 символа"),
  description: z.string().optional(),
  budget: z.string().optional(),
  address: z.string().min(3, "Укажите адрес"),
});
type FormValues = z.infer<typeof schema>;

export function OrderForm({ order }: { order?: OrderWithRelations }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: specializations } = useSpecializations();
  const isEdit = Boolean(order);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      specialization_id: order?.specialization_id ?? "",
      title: order?.title ?? "",
      description: order?.description ?? "",
      budget: order?.budget != null ? String(order.budget) : "",
      address: order?.address ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const payload = {
      ...(isEdit ? {} : { specialization_id: values.specialization_id }),
      title: values.title,
      description: values.description || undefined,
      budget: values.budget ? Number(values.budget) : undefined,
      address: values.address,
    };
    try {
      const saved = isEdit
        ? await apiFetch<OrderWithRelations>(`/api/orders/${order!.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch<OrderWithRelations>("/api/orders", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(isEdit ? "Заказ обновлён" : "Заказ создан — ждите отклики мастеров");
      router.push(`/orders/${saved.id}`);
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    }
  }

  const selectedSpec = form.watch("specialization_id");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label>Специализация</Label>
        <div className="grid grid-cols-3 gap-2">
          {(specializations ?? []).map((spec) => (
            <button
              key={spec.id}
              type="button"
              disabled={isEdit}
              onClick={() => form.setValue("specialization_id", spec.id, { shouldValidate: true })}
              className={cn(
                "rounded-xl border-2 px-2 py-3 text-sm font-medium transition-colors disabled:opacity-60",
                selectedSpec === spec.id
                  ? "border-foreground bg-secondary"
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
        <Label htmlFor="title">Название</Label>
        <Input id="title" placeholder="Например: заменить смеситель на кухне" {...form.register("title")} />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea id="description" rows={4} placeholder="Подробности задачи" {...form.register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="budget">Бюджет, ₸</Label>
          <Input id="budget" type="number" min="0" placeholder="Не обязательно" {...form.register("budget")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Адрес</Label>
          <Input id="address" placeholder="Улица, дом" {...form.register("address")} />
        </div>
      </div>
      {form.formState.errors.address && (
        <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
      )}

      <Button type="submit" className="h-11 w-full rounded-xl" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isEdit ? "Сохранить изменения" : "Опубликовать заказ"}
      </Button>
    </form>
  );
}
