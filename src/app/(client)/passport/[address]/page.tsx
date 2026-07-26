"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Home, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { FadeIn, MotionItem, MotionList } from "@/components/motion";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { formatDate, formatMoney, pluralRu } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PassportDetail } from "@/services/PassportService";

/** Хронологическая лента всех выполненных работ по адресу. */
export default function PassportDetailPage() {
  const params = useParams<{ address: string }>();
  const address = decodeURIComponent(params.address);

  const { data: passport, isLoading, error } = useQuery({
    queryKey: ["passport", address],
    queryFn: () => apiFetch<PassportDetail>(`/api/passport/${encodeURIComponent(address)}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (error || !passport) {
    return (
      <EmptyState
        icon={Home}
        title="Паспорт не найден"
        description={error instanceof FetchError ? error.message : "По этому адресу нет завершённых работ"}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link href="/passport">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">Паспорт ремонта</h1>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => window.print()}>
          <FileDown className="size-4" />
          Скачать PDF
        </Button>
      </div>

      {/* Шапка паспорта */}
      <FadeIn>
        <Card className="rounded-2xl bg-gradient-to-br from-brand to-brand-hover text-brand-foreground">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Home className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide opacity-80">Адрес квартиры</p>
                <p className="truncate font-bold">{passport.address}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/10 p-2">
                <p className="text-lg font-bold">{passport.works_count}</p>
                <p className="text-[11px] opacity-80">
                  {pluralRu(passport.works_count, "работа", "работы", "работ")}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-2">
                <p className="text-lg font-bold">{formatMoney(passport.total_spent)}</p>
                <p className="text-[11px] opacity-80">вложено</p>
              </div>
              <div className="rounded-xl bg-white/10 p-2">
                <p className="text-lg font-bold">{passport.active_warranties}</p>
                <p className="text-[11px] opacity-80">гарантии активны</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Хронологическая лента работ */}
      <MotionList className="relative space-y-3 pl-5">
        <span className="absolute top-2 bottom-2 left-[9px] w-px bg-border" aria-hidden />
        {passport.entries.map(({ order, warranty, price, warranty_active }) => {
          const before = order.images.find((i) => i.type === "BEFORE");
          const after = order.images.find((i) => i.type === "AFTER");
          return (
            <MotionItem key={order.id} className="relative">
              <span
                className={cn(
                  "absolute top-5 -left-5 size-2.5 rounded-full ring-4 ring-background",
                  warranty_active ? "bg-success" : "bg-muted-foreground"
                )}
                aria-hidden
              />
              <Card className="rounded-2xl">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      <p className="font-semibold">{order.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.specialization?.name}
                        {order.master?.full_name ? ` · мастер ${order.master.full_name}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold">{formatMoney(price)}</p>
                  </div>

                  {(before || after) && (
                    <div className="grid grid-cols-2 gap-2">
                      {before && (
                        <div>
                          <img src={before.image_url} alt="До" className="h-24 w-full rounded-lg object-cover" />
                          <p className="mt-0.5 text-center text-[11px] text-muted-foreground">До</p>
                        </div>
                      )}
                      {after && (
                        <div>
                          <img src={after.image_url} alt="После" className="h-24 w-full rounded-lg object-cover" />
                          <p className="mt-0.5 text-center text-[11px] text-muted-foreground">После</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        warranty_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {warranty_active ? <ShieldCheck className="size-3.5" /> : <ShieldOff className="size-3.5" />}
                      {warranty
                        ? warranty_active
                          ? `Гарантия до ${formatDate(warranty.expires_at)}`
                          : "Гарантия истекла"
                        : "Без гарантии"}
                    </span>
                    {warranty && (
                      <Link
                        href={`/warranties/${warranty.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground print:hidden"
                      >
                        Сертификат
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </MotionItem>
          );
        })}
      </MotionList>
    </div>
  );
}
