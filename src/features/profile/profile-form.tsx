"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, FileCheck2, FileUp, Loader2, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/useMe";
import { useSpecializations } from "@/hooks/useSpecializations";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface FormValues {
  full_name: string;
  description: string;
}

/** Общая форма профиля: для клиента — имя и аватар, для мастера — плюс описание, специализации и документы. */
export function ProfileForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMe();
  const { data: specializations } = useSpecializations();
  const isMaster = Boolean(me?.master);

  const [specIds, setSpecIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState<"avatar" | "document" | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({ defaultValues: { full_name: "", description: "" } });

  useEffect(() => {
    if (!me) return;
    form.reset({
      full_name: me.master?.full_name ?? me.client?.full_name ?? "",
      description: me.master?.description ?? "",
    });
    setSpecIds(me.master?.specializations.map((s) => s.id) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  async function onSubmit(values: FormValues) {
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: values.full_name,
          ...(isMaster && { description: values.description, specialization_ids: specIds }),
        }),
      });
      toast.success("Профиль сохранён");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    }
  }

  async function upload(kind: "avatar" | "document", file: File) {
    setUploading(kind);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const { url } = await apiFetch<{ url: string }>("/api/users/me/upload", {
        method: "POST",
        body: formData,
      });
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(kind === "avatar" ? { avatar_url: url } : { document_url: url }),
      });
      toast.success(kind === "avatar" ? "Фото обновлено" : "Документ загружен на проверку");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(null);
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  if (isLoading || !me) {
    return <Card className="h-64 animate-pulse rounded-2xl" />;
  }

  const avatarUrl = me.master?.avatar_url ?? me.client?.avatar_url ?? undefined;
  const name = me.master?.full_name ?? me.client?.full_name ?? "";

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardContent className="flex items-center gap-4">
          <button
            type="button"
            className="group relative"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploading === "avatar"}
          >
            <Avatar className="size-16">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-xl">{(name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
              {uploading === "avatar" ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload("avatar", e.target.files[0])}
          />
          <div>
            <p className="font-semibold">{name || "Без имени"}</p>
            <p className="text-sm text-muted-foreground">{me.user.phone}</p>
            <p className="text-xs text-muted-foreground">
              {me.user.role === "MASTER" ? "Мастер" : me.user.role === "ADMIN" ? "Администратор" : "Клиент"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto text-muted-foreground" onClick={logout} aria-label="Выйти">
            <LogOut className="size-4" />
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Данные профиля</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Имя и фамилия</Label>
              <Input id="full_name" placeholder="Как к вам обращаться" {...form.register("full_name")} />
            </div>

            {isMaster && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">О себе</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder="Опыт, инструменты, район работы"
                    {...form.register("description")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Специализации</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(specializations ?? []).map((spec) => {
                      const active = specIds.includes(spec.id);
                      return (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() =>
                            setSpecIds((prev) =>
                              active ? prev.filter((id) => id !== spec.id) : [...prev, spec.id]
                            )
                          }
                          className={cn(
                            "rounded-xl border-2 px-2 py-3 text-sm font-medium transition-colors",
                            active
                              ? "border-brand bg-brand-muted text-brand"
                              : "border-border text-muted-foreground hover:border-muted-foreground/40"
                          )}
                        >
                          {spec.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="h-10 w-full rounded-xl" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Сохранить
            </Button>
          </form>
        </CardContent>
      </Card>

      {isMaster && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Документы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {me.master?.id_verified ? (
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <FileCheck2 className="size-4" />
                Документы подтверждены — Trust Score учитывает верификацию
              </p>
            ) : me.master?.document_url ? (
              <p className="text-sm text-muted-foreground">Документ на проверке у администратора</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Загрузите удостоверение личности — подтверждённые мастера получают больше заказов
              </p>
            )}
            <input
              ref={documentInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload("document", e.target.files[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={uploading === "document"}
              onClick={() => documentInputRef.current?.click()}
            >
              {uploading === "document" ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              {me.master?.document_url ? "Заменить документ" : "Загрузить документ"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
