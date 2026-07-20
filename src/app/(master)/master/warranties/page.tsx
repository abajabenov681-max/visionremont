"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { CertificateCard } from "@/features/warranties/certificate-card";
import { apiFetch } from "@/lib/fetcher";
import type { WarrantyWithRelations } from "@/types/db";

export default function MasterWarrantiesPage() {
  const { data: warranties, isLoading } = useQuery({
    queryKey: ["warranties"],
    queryFn: () => apiFetch<WarrantyWithRelations[]>("/api/warranties"),
  });

  return (
    <div>
      <PageHeader title="Выданные гарантии" subtitle="Сертификаты по вашим завершённым работам" />
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : warranties && warranties.length > 0 ? (
        <div className="space-y-4">
          {warranties.map((w) => (
            <CertificateCard key={w.id} warranty={w} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="Гарантий пока нет"
          description="Гарантия создаётся автоматически, когда клиент подтверждает выполненную работу"
        />
      )}
    </div>
  );
}
