"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { MasterCard } from "@/components/master-card";
import { PageHeader } from "@/components/page-header";
import { apiFetch, FetchError } from "@/lib/fetcher";
import type { MasterPublic } from "@/types/db";

/** Верификация мастеров: просмотр документов и подтверждение личности. */
export default function AdminMastersPage() {
  const queryClient = useQueryClient();
  const { data: masters, isLoading } = useQuery({
    queryKey: ["admin-masters"],
    queryFn: () => apiFetch<MasterPublic[]>("/api/admin/masters"),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      apiFetch(`/api/admin/masters/${id}/verify`, { method: "POST", body: JSON.stringify({ verified }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-masters"] });
      toast.success("Статус верификации обновлён");
    },
    onError: (e) => toast.error(e instanceof FetchError ? e.message : "Ошибка"),
  });

  return (
    <div>
      <PageHeader title="Проверка мастеров" subtitle="Подтверждение документов повышает Trust Score" />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : masters && masters.length > 0 ? (
        <div className="space-y-3">
          {masters.map((master) => (
            <div key={master.id} className="space-y-2">
              <MasterCard master={master} />
              <div className="flex flex-wrap gap-2 px-1">
                {master.document_url ? (
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <a href={master.document_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                      Документ
                    </a>
                  </Button>
                ) : (
                  <span className="self-center text-xs text-muted-foreground">Документы не загружены</span>
                )}
                {master.id_verified ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto rounded-xl"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate({ id: master.id, verified: false })}
                  >
                    <ShieldX className="size-3.5" />
                    Снять подтверждение
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="ml-auto rounded-xl bg-success text-success-foreground hover:bg-success/90"
                    disabled={verifyMutation.isPending || !master.document_url}
                    onClick={() => verifyMutation.mutate({ id: master.id, verified: true })}
                  >
                    <BadgeCheck className="size-3.5" />
                    Подтвердить
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={ShieldCheck} title="Мастеров нет" />
      )}
    </div>
  );
}
