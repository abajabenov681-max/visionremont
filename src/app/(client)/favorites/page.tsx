"use client";

import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { MasterCard } from "@/components/master-card";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/fetcher";
import type { MasterPublic } from "@/types/db";

export default function FavoritesPage() {
  const { data: favorites, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => apiFetch<MasterPublic[]>("/api/favorites"),
  });

  return (
    <div>
      <PageHeader title="Избранные мастера" />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : favorites && favorites.length > 0 ? (
        <div className="space-y-3">
          {favorites.map((master) => (
            <MasterCard key={master.id} master={master} href={`/masters/${master.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="Избранных мастеров нет"
          description="Добавляйте проверенных мастеров в избранное из карточки заказа"
        />
      )}
    </div>
  );
}
