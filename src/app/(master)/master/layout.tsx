import { BottomNav } from "@/components/bottom-nav";
import { MasterUrgentListener } from "@/features/matching/master-urgent-listener";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <main className="mx-auto w-full max-w-2xl px-4 pt-5 pb-24">{children}</main>
      {/* Глобальный слушатель срочных заявок: всплывает на любой странице мастера */}
      <MasterUrgentListener />
      <BottomNav zone="master" />
    </div>
  );
}
