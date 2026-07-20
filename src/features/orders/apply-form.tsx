"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, FetchError } from "@/lib/fetcher";

const schema = z.object({
  price: z.string().min(1, "Укажите цену"),
  estimated_days: z.string().min(1, "Укажите срок"),
  comment: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/** Форма отклика мастера. Цена фиксируется до начала работы — гарантия оплаты. */
export function ApplyForm({ orderId, onDone }: { orderId: string; onDone?: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { price: "", estimated_days: "1", comment: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await apiFetch(`/api/orders/${orderId}/applications`, {
        method: "POST",
        body: JSON.stringify({
          price: Number(values.price),
          estimated_days: Number(values.estimated_days),
          comment: values.comment || undefined,
        }),
      });
      toast.success("Отклик отправлен");
      queryClient.invalidateQueries({ queryKey: ["applications", orderId] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      onDone?.();
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Откликнуться на заказ</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Ваша цена, ₸</Label>
              <Input id="price" type="number" min="0" placeholder="15000" {...form.register("price")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_days">Срок, дней</Label>
              <Input id="estimated_days" type="number" min="1" {...form.register("estimated_days")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea id="comment" rows={2} placeholder="Что входит в цену, когда можете приступить" {...form.register("comment")} />
          </div>
          <Button type="submit" className="h-10 w-full rounded-xl" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Отправить отклик
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
