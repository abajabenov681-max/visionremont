"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/fetcher";
import { formatDateTime, formatMoney, pluralRu } from "@/lib/format";
import type { ApplicationWithRelations } from "@/types/db";

export default function MasterApplicationsPage() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => apiFetch<ApplicationWithRelations[]>("/api/applications"),
  });

  return (
    <div>
      <PageHeader title="Мои отклики" />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : applications && applications.length > 0 ? (
        <div className="space-y-3">
          {applications.map((app) => (
            <Link key={app.id} href={`/master/orders/${app.order_id}`}>
              <Card className="rounded-2xl transition-shadow hover:shadow-md">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 font-semibold">{app.order?.title ?? "Заказ"}</p>
                    {app.order && <StatusBadge status={app.order.status} className="shrink-0" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatMoney(Number(app.price))}</span>
                    <span>
                      {app.estimated_days} {pluralRu(app.estimated_days, "день", "дня", "дней")}
                    </span>
                    <span>{formatDateTime(app.created_at)}</span>
                  </div>
                  {app.comment && <p className="line-clamp-2 text-sm text-muted-foreground">{app.comment}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessagesSquare}
          title="Откликов нет"
          description="Найдите подходящий заказ в ленте и предложите цену"
        />
      )}
    </div>
  );
}
