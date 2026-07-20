"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { OrderForm } from "@/features/orders/order-form";
import { apiFetch } from "@/lib/fetcher";
import type { OrderWithRelations } from "@/types/db";

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => apiFetch<OrderWithRelations>(`/api/orders/${id}`),
  });

  return (
    <div>
      <PageHeader title="Редактировать заказ" />
      {isLoading || !order ? <Skeleton className="h-96 rounded-2xl" /> : <OrderForm order={order} />}
    </div>
  );
}
