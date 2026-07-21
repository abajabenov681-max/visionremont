import Image from "next/image";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="size-7 overflow-hidden rounded-lg">
        <Image src="/logo.png" alt="RepairLink" width={28} height={28} className="size-full object-cover" priority />
      </div>
      <span className="text-sm font-bold tracking-tight">
        <span className="text-brand">Repair</span>Link
      </span>
    </header>
  );
}
