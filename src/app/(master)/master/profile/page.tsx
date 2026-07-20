import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/features/profile/profile-form";
import { OnlineToggle } from "@/features/matching/online-toggle";

export const metadata: Metadata = { title: "Профиль мастера" };

export default function MasterProfilePage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Профиль" />
      <OnlineToggle />
      <ProfileForm />
    </div>
  );
}
