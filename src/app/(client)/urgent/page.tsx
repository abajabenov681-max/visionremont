import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { UrgentCallFlow } from "@/features/matching/urgent-call-flow";

export const metadata: Metadata = { title: "Аварийный вызов" };

export default function UrgentPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-urgent text-urgent-foreground">
          <Zap className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Аварийный вызов</h1>
          <p className="text-sm text-muted-foreground">Как такси, только для ремонта</p>
        </div>
      </div>
      <UrgentCallFlow />
    </div>
  );
}
