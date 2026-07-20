import Link from "next/link";
import { BadgeCheck, Circle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/rating-stars";
import { TrustBadge } from "@/components/trust-badge";
import { cn } from "@/lib/utils";
import type { MasterPublic } from "@/types/db";

export function MasterCard({
  master,
  href,
  action,
}: {
  master: MasterPublic;
  href?: string;
  action?: React.ReactNode;
}) {
  const body = (
    <Card className="rounded-2xl transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3">
        <Avatar className="size-12">
          <AvatarImage src={master.avatar_url ?? undefined} alt={master.full_name} />
          <AvatarFallback>{(master.full_name || "М").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold">{master.full_name || "Мастер"}</p>
            {master.id_verified && <BadgeCheck className="size-4 shrink-0 text-success" />}
            <Circle
              className={cn(
                "ml-auto size-2.5 shrink-0",
                master.is_online ? "fill-success text-success" : "fill-muted text-muted"
              )}
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <RatingStars value={Number(master.rating)} />
            <span className="text-xs text-muted-foreground">
              {Number(master.rating).toFixed(1)} · {master.reviews_count} отз. · {master.completed_orders} заказов
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TrustBadge score={Number(master.trust_score)} />
            {master.specializations.map((s) => (
              <Badge key={s.id} variant="secondary" className="rounded-full font-normal">
                {s.name}
              </Badge>
            ))}
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{body}</Link>;
  return body;
}
