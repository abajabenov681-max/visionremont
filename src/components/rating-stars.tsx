"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  onChange,
  size = "sm",
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "lg";
  className?: string;
}) {
  const interactive = Boolean(onChange);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={cn(!interactive && "cursor-default", interactive && "transition-transform hover:scale-110")}
          aria-label={`${star} из 5`}
        >
          <Star
            className={cn(
              size === "lg" ? "size-7" : "size-4",
              star <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
            )}
          />
        </button>
      ))}
    </span>
  );
}
