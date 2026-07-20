"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { CertificateCard } from "@/features/warranties/certificate-card";
import { apiFetch } from "@/lib/fetcher";
import type { WarrantyWithRelations } from "@/types/db";

export default function WarrantyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: warranty, isLoading } = useQuery({
    queryKey: ["warranty", id],
    queryFn: () => apiFetch<WarrantyWithRelations>(`/api/warranties/${id}`),
  });

  return (
    <div>
      <PageHeader title="Сертификат гарантии" />
      {isLoading || !warranty ? <Skeleton className="h-96 rounded-2xl" /> : <CertificateCard warranty={warranty} />}
    </div>
  );
}
