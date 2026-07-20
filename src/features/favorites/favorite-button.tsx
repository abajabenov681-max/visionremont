"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

export function FavoriteButton({ masterId }: { masterId: string }) {
  const queryClient = useQueryClient();
  const { data: favoriteIds } = useQuery({
    queryKey: ["favorite-ids"],
    queryFn: () => apiFetch<string[]>("/api/favorites?ids=true"),
  });
  const isFavorite = favoriteIds?.includes(masterId) ?? false;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        body: JSON.stringify({ master_id: masterId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(isFavorite ? "Удалено из избранного" : "Добавлено в избранное");
    },
    onError: (e) => toast.error(e instanceof FetchError ? e.message : "Ошибка сети"),
  });

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-xl"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
    >
      <Heart className={cn("size-4", isFavorite && "fill-urgent text-urgent")} />
    </Button>
  );
}
