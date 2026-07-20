import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrustBadge({ score, className }: { score: number; className?: string }) {
  const rounded = Math.round(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success",
        className
      )}
    >
      <ShieldCheck className="size-3.5" />
      Доверие: {rounded}/100
    </span>
  );
}
