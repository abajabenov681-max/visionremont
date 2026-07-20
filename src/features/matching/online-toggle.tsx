"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Radio } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/hooks/useMe";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

export function OnlineToggle({ size = "md" }: { size?: "md" | "lg" }) {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const isOnline = me?.master?.is_online ?? false;

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      apiFetch<{ is_online: boolean }>("/api/masters/online-status", {
        method: "PATCH",
        body: JSON.stringify({ is_online: next }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(data.is_online ? "Вы на линии — ждите заявки" : "Вы не на линии");
    },
    onError: (e) => toast.error(e instanceof FetchError ? e.message : "Ошибка сети"),
  });

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors",
        size === "lg" && "p-5",
        isOnline && "border-success/40 bg-success/5"
      )}
    >
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-full",
            isOnline ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          )}
        >
          <Radio className={cn("size-5", isOnline && "animate-pulse")} />
        </span>
        <span>
          <span className={cn("block font-semibold", size === "lg" && "text-lg")}>
            {isOnline ? "На линии" : "Не на линии"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {isOnline ? "Срочные заявки приходят мгновенно" : "Включите, чтобы получать срочные вызовы"}
          </span>
        </span>
      </span>
      <Switch
        checked={isOnline}
        disabled={!me?.master || mutation.isPending}
        onCheckedChange={(checked) => mutation.mutate(checked)}
        className="data-[state=checked]:bg-success"
      />
    </label>
  );
}
