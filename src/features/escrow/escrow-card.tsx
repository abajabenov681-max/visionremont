"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { PLATFORM_COMMISSION_RATE } from "@/lib/constants";
import type { EscrowTransactionRow } from "@/types/db";

const COMMISSION_PERCENT = Math.round(PLATFORM_COMMISSION_RATE * 100);

/** Плашка-пояснение механики эскроу (формулировка из TVEP). */
export function EscrowNote() {
  return (
    <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      Комиссия платформы удерживается только после подтверждения работы
    </p>
  );
}

/** Разбивка выплаты по формулам TVEP: F = O × 0.07, M = O − F. */
export function EscrowBreakdown({ escrow }: { escrow: EscrowTransactionRow }) {
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Стоимость работы (O)</span>
        <span className="font-semibold">{formatMoney(Number(escrow.amount ?? 0))}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Комиссия платформы (F = O × 0.0{COMMISSION_PERCENT})</span>
        <span className="font-semibold">−{formatMoney(Number(escrow.commission ?? 0))}</span>
      </div>
      <div className="flex justify-between border-t pt-1.5">
        <span className="font-medium">Переведено мастеру (M = O − F)</span>
        <span className="font-bold text-success">{formatMoney(Number(escrow.master_amount ?? 0))}</span>
      </div>
    </div>
  );
}

/**
 * Состояние безопасной сделки на экране заказа:
 * RESERVED — «Средства зарезервированы 🔒», RELEASED — «Переведено мастеру ✅»
 * с разбивкой по формулам. Анимированный переход между состояниями.
 */
export function EscrowCard({ escrow }: { escrow: EscrowTransactionRow | null | undefined }) {
  if (!escrow || escrow.status === "REFUNDED") return null;

  return (
    <Card className="rounded-2xl border-brand/30">
      <CardContent className="space-y-3">
        <AnimatePresence mode="wait" initial={false}>
          {escrow.status === "RESERVED" ? (
            <motion.div
              key="reserved"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
                  <Lock className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Средства зарезервированы 🔒</p>
                  <p className="text-xs text-muted-foreground">
                    {escrow.amount != null
                      ? `${formatMoney(Number(escrow.amount))} — до подтверждения работы`
                      : "Сумма фиксируется по завершении работы"}
                  </p>
                </div>
                {escrow.amount != null && (
                  <p className="shrink-0 text-lg font-bold">{formatMoney(Number(escrow.amount))}</p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="released"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                  <CheckCircle2 className="size-5" />
                </span>
                <p className="font-semibold">Переведено мастеру ✅</p>
              </div>
              <EscrowBreakdown escrow={escrow} />
            </motion.div>
          )}
        </AnimatePresence>
        <EscrowNote />
      </CardContent>
    </Card>
  );
}
