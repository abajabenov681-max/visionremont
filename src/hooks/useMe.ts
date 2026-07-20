"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { MyProfile } from "@/services/ProfileService";

export type { MyProfile };

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MyProfile>("/api/auth/me"),
    staleTime: 60_000,
  });
}
