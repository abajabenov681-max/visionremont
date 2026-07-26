"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink, RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { MasterCard } from "@/components/master-card";
import { PageHeader } from "@/components/page-header";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { DOCUMENT_STATUS_LABELS, type DocumentStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MasterPublic } from "@/types/db";

type Decision = "VERIFIED" | "REJECTED" | "PENDING";

const STATUS_BADGE: Record<DocumentStatus, string> = {
  NONE: "bg-muted text-muted-foreground",
  PENDING: "bg-brand-muted text-brand",
  VERIFIED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/15 text-destructive",
};

/** Верификация мастеров: просмотр документов, решение админа, пересчёт Trust Score. */
export default function AdminMastersPage() {
  const queryClient = useQueryClient();
  const { data: masters, isLoading } = useQuery({
    queryKey: ["admin-masters"],
    queryFn: () => apiFetch<MasterPublic[]>("/api/admin/masters"),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Decision }) =>
      apiFetch(`/api/admin/masters/${id}/verify`, { method: "POST", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-masters"] });
      toast.success("Статус документов обновлён, Trust Score пересчитан");
    },
    onError: (e) => toast.error(e instanceof FetchError ? e.message : "Ошибка"),
  });

  return (
    <div>
      <PageHeader title="Проверка мастеров" subtitle="Документы проходят обязательную проверку администратором" />
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
              <div className="flex flex-wrap items-center gap-2 px-1">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    STATUS_BADGE[master.document_status ?? "NONE"]
                  )}
                >
                  {DOCUMENT_STATUS_LABELS[master.document_status ?? "NONE"]}
                </span>
                {master.document_url && (
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <a href={master.document_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                      Документ
                    </a>
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  {master.document_status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        className="rounded-xl bg-success text-success-foreground hover:bg-success/90"
                        disabled={decisionMutation.isPending}
                        onClick={() => decisionMutation.mutate({ id: master.id, status: "VERIFIED" })}
                      >
                        <BadgeCheck className="size-3.5" />
                        Подтвердить
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-destructive"
                        disabled={decisionMutation.isPending}
                        onClick={() => decisionMutation.mutate({ id: master.id, status: "REJECTED" })}
                      >
                        <ShieldX className="size-3.5" />
                        Отклонить
                      </Button>
                    </>
                  )}
                  {(master.document_status === "VERIFIED" || master.document_status === "REJECTED") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={decisionMutation.isPending}
                      onClick={() => decisionMutation.mutate({ id: master.id, status: "PENDING" })}
                    >
                      <RotateCcw className="size-3.5" />
                      Вернуть на проверку
                    </Button>
                  )}
                </div>
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
