"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, RotateCcw, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UserRow } from "@/types/db";

const ROLE_LABELS: Record<string, string> = { CLIENT: "Клиент", MASTER: "Мастер", ADMIN: "Админ" };

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", role, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (search) params.set("search", search);
      return apiFetch<UserRow[]>(`/api/admin/users?${params}`);
    },
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ blocked }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Готово");
    },
    onError: (e) => toast.error(e instanceof FetchError ? e.message : "Ошибка"),
  });

  return (
    <div>
      <PageHeader title="Пользователи" />
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Поиск по телефону" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["", "CLIENT", "MASTER", "ADMIN"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                role === r ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "" ? "Все" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : users && users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user) => {
            const blocked = Boolean(user.deleted_at);
            return (
              <Card key={user.id} className={cn("rounded-2xl", blocked && "opacity-60")}>
                <CardContent className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{user.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      Регистрация: {formatDate(user.created_at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                  {blocked && <Badge className="rounded-full bg-destructive/10 text-destructive">Заблокирован</Badge>}
                  <Button
                    variant={blocked ? "outline" : "destructive"}
                    size="icon"
                    className="rounded-xl"
                    disabled={blockMutation.isPending}
                    onClick={() => blockMutation.mutate({ id: user.id, blocked: !blocked })}
                    aria-label={blocked ? "Разблокировать" : "Заблокировать"}
                  >
                    {blocked ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Users} title="Пользователи не найдены" />
      )}
    </div>
  );
}
