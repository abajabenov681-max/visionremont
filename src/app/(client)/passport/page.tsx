"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Home, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { MotionItem, MotionList } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/fetcher";
import { formatDate, formatMoney, pluralRu } from "@/lib/format";
import type { PassportAddress } from "@/services/PassportService";

export default function PassportListPage() {
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["passport"],
    queryFn: () => apiFetch<PassportAddress[]>("/api/passport"),
  });

  return (
    <div>
      <PageHeader
        title="Паспорт ремонта"
        subtitle="Долгосрочная история ремонта по каждому адресу"
      />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : addresses && addresses.length > 0 ? (
        <MotionList className="space-y-3">
          {addresses.map((item) => (
            <MotionItem key={item.address}>
              <Link href={`/passport/${encodeURIComponent(item.address)}`}>
                <Card className="rounded-2xl transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
                      <Home className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.works_count} {pluralRu(item.works_count, "работа", "работы", "работ")} ·{" "}
                        {formatMoney(item.total_spent)} · последняя {formatDate(item.last_work_at)}
                      </p>
                    </div>
                    {item.active_warranties > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                        <ShieldCheck className="size-3.5" />
                        {item.active_warranties}
                      </span>
                    )}
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </MotionItem>
          ))}
        </MotionList>
      ) : (
        <EmptyState
          icon={Home}
          title="История ремонта пока пуста"
          description="После подтверждения первой работы здесь появится паспорт ремонта вашей квартиры"
        />
      )}
    </div>
  );
}
