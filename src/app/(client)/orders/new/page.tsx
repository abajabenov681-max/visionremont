import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { OrderForm } from "@/features/orders/order-form";

export const metadata: Metadata = { title: "Новый заказ" };

export default function NewOrderPage() {
  return (
    <div>
      <PageHeader title="Новый заказ" subtitle="Мастера откликнутся с ценой и сроками" />
      <OrderForm />
    </div>
  );
}
