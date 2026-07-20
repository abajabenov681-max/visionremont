"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { SpecializationRow } from "@/types/db";

export function useSpecializations() {
  return useQuery({
    queryKey: ["specializations"],
    queryFn: () => apiFetch<SpecializationRow[]>("/api/specializations"),
    staleTime: Infinity,
  });
}
