/* eslint-disable @next/next/no-img-element */
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WarrantyWithRelations } from "@/types/db";

/** Цифровой сертификат гарантии: номер, работа, цена, фото до/после. */
export function CertificateCard({ warranty }: { warranty: WarrantyWithRelations }) {
  const cert = warranty.certificate;
  const active = new Date(warranty.expires_at) > new Date();

  return (
    <Card className={cn("overflow-hidden rounded-2xl border-2", active ? "border-success/40" : "border-border")}>
      <div className={cn("flex items-center gap-2 px-5 py-3", active ? "bg-success text-success-foreground" : "bg-muted")}>
        <ShieldCheck className="size-5" />
        <p className="font-bold">Цифровая гарантия {active ? "активна" : "истекла"}</p>
        <p className="ml-auto text-sm opacity-90">до {formatDate(warranty.expires_at)}</p>
      </div>
      <CardContent className="space-y-4">
        {cert ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Сертификат</p>
                <p className="font-mono font-semibold">{cert.certificate_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Стоимость работ</p>
                <p className="font-semibold">{formatMoney(Number(cert.total_price))}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Работа</p>
              <p className="font-medium">{cert.work_title}</p>
            </div>
            {(cert.before_photo || cert.after_photo) && (
              <div className="grid grid-cols-2 gap-2">
                {cert.before_photo && (
                  <figure>
                    <img src={cert.before_photo} alt="До" className="aspect-square w-full rounded-xl object-cover" />
                    <figcaption className="mt-1 text-center text-xs text-muted-foreground">До</figcaption>
                  </figure>
                )}
                {cert.after_photo && (
                  <figure>
                    <img src={cert.after_photo} alt="После" className="aspect-square w-full rounded-xl object-cover" />
                    <figcaption className="mt-1 text-center text-xs text-muted-foreground">После</figcaption>
                  </figure>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Сертификат оформляется…</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <BadgeCheck className="size-4 text-success" />
            Мастер: {warranty.master?.full_name || "—"}
          </span>
          <span className="text-muted-foreground">
            Срок гарантии: {warranty.warranty_period} мес.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
