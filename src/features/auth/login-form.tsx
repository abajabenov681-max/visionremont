"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Hammer, Loader2, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, FetchError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/api";

const phoneSchema = z.object({
  phone: z.string().min(10, "Введите номер телефона"),
});
const codeSchema = z.object({
  code: z.string().min(4, "Введите код из SMS"),
});

type Step = "phone" | "code";
type Role = "CLIENT" | "MASTER";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("CLIENT");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });
  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  async function onRequestCode(values: z.infer<typeof phoneSchema>) {
    setLoading(true);
    try {
      const data = await apiFetch<{ phone: string; devCode?: string }>("/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setPhone(data.phone);
      setDevCode(data.devCode);
      setStep("code");
      if (data.devCode) codeForm.setValue("code", data.devCode);
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(values: z.infer<typeof codeSchema>) {
    setLoading(true);
    try {
      const data = await apiFetch<{ user: SessionUser; isNew: boolean }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code: values.code, role }),
      });
      toast.success(data.isNew ? "Добро пожаловать в RepairLink!" : "С возвращением!");
      const home = data.user.role === "MASTER" ? "/master" : data.user.role === "ADMIN" ? "/admin" : "/";
      router.replace(home);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof FetchError ? e.message : "Ошибка сети");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 size-16 overflow-hidden rounded-2xl shadow-md">
          <Image src="/logo.png" alt="RepairLink" width={64} height={64} className="size-full object-cover" priority />
        </div>
        <CardTitle className="text-2xl">
          <span className="text-brand">Repair</span>Link
        </CardTitle>
        <CardDescription>
          Бытовой ремонт как такси: мастер за минуты, фиксированная цена, цифровая гарантия
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "phone" ? (
          <form onSubmit={phoneForm.handleSubmit(onRequestCode)} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "CLIENT", label: "Я клиент", icon: UserRound },
                  { value: "MASTER", label: "Я мастер", icon: Hammer },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-sm font-medium transition-colors",
                    role === option.value
                      ? "border-brand bg-brand-muted text-brand"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40"
                  )}
                >
                  <option.icon className="size-5" />
                  {option.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Номер телефона</Label>
              <div className="relative">
                <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 700 000 00 00"
                  className="h-11 pl-9"
                  {...phoneForm.register("phone")}
                />
              </div>
              {phoneForm.formState.errors.phone && (
                <p className="text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>
              )}
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl text-base" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Получить код
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Роль выбирается один раз при первой регистрации
            </p>
          </form>
        ) : (
          <form onSubmit={codeForm.handleSubmit(onVerify)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код из SMS для {phone}</Label>
              <Input
                id="code"
                inputMode="numeric"
                placeholder="••••"
                className="h-12 text-center text-xl tracking-[0.5em]"
                {...codeForm.register("code")}
              />
              {devCode && (
                <p className="flex items-center gap-1 text-xs text-success">
                  <ShieldCheck className="size-3.5" />
                  Dev-режим: код {devCode} подставлен автоматически
                </p>
              )}
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl text-base" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Войти
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep("phone")}
              disabled={loading}
            >
              Изменить номер
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
