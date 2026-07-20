import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/features/profile/profile-form";

export const metadata: Metadata = { title: "Профиль" };

export default function ClientProfilePage() {
  return (
    <div>
      <PageHeader title="Профиль" />
      <ProfileForm />
    </div>
  );
}
