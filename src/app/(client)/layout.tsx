import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 pt-5 pb-24">{children}</main>
      <BottomNav zone="client" />
    </div>
  );
}
