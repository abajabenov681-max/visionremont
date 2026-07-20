"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Heart,
  Home,
  ListChecks,
  MessagesSquare,
  ShieldCheck,
  Star,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

// Конфиги навигации живут в клиентском модуле: компоненты-иконки нельзя
// сериализовать из серверного layout в клиентский компонент.
const NAV_CONFIGS = {
  client: [
    { href: "/", label: "Главная", icon: Home, exact: true },
    { href: "/orders", label: "Заказы", icon: ListChecks },
    { href: "/warranties", label: "Гарантии", icon: ShieldCheck },
    { href: "/favorites", label: "Избранное", icon: Heart },
    { href: "/profile", label: "Профиль", icon: UserRound },
  ],
  master: [
    { href: "/master", label: "На линии", icon: Gauge, exact: true },
    { href: "/master/orders", label: "Заказы", icon: ListChecks },
    { href: "/master/applications", label: "Отклики", icon: MessagesSquare },
    { href: "/master/warranties", label: "Гарантии", icon: ShieldCheck },
    { href: "/master/rating", label: "Рейтинг", icon: Star },
    { href: "/master/profile", label: "Профиль", icon: UserRound },
  ],
  admin: [
    { href: "/admin", label: "Дашборд", icon: Gauge, exact: true },
    { href: "/admin/users", label: "Люди", icon: Users },
    { href: "/admin/orders", label: "Заказы", icon: ListChecks },
    { href: "/admin/reviews", label: "Отзывы", icon: Star },
    { href: "/admin/masters", label: "Проверка", icon: ShieldCheck },
  ],
} satisfies Record<string, NavItem[]>;

export function BottomNav({ zone }: { zone: keyof typeof NAV_CONFIGS }) {
  const items = NAV_CONFIGS[zone];
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[11px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("size-5", active && "stroke-[2.4]")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
