"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { MotionItem, MotionList } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WarrantyWithRelations } from "@/types/db";

export default function WarrantiesPage() {
  const { data: warranties, isLoading } = useQuery({
    queryKey: ["warranties"],
    queryFn: () => apiFetch<WarrantyWithRelations[]>("/api/warranties"),
  });

  return (
    <div>
      <PageHeader title="Гарантии" subtitle="Цифровые сертификаты на выполненные работы" />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : warranties && warranties.length > 0 ? (
        <MotionList className="space-y-3">
          {warranties.map((w) => {
            const active = new Date(w.expires_at) > new Date();
            return (
              <MotionItem key={w.id}>
              <Link href={`/warranties/${w.id}`}>
                <Card className="rounded-2xl transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl",
                        active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <ShieldCheck className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{w.order?.title ?? "Работа"}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.certificate?.certificate_number} · до {formatDate(w.expires_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {active ? "Активна" : "Истекла"}
                    </span>
                  </CardContent>
                </Card>
              </Link>
              </MotionItem>
            );
          })}
        </MotionList>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="Гарантий пока нет"
          description="Гарантия активируется автоматически после подтверждения выполненной работы"
        />
      )}
    </div>
  );
}
