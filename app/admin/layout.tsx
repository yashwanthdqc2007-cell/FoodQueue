import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import type { ProfileModel } from "@/types/models";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    redirect("/auth/login");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userData.user.id)
    .returns<ProfileModel[]>();

  const profile = profiles?.[0];

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col md:flex-row font-sans">
      <AdminNav
        userEmail={userData.user.email}
        userFullName={profile.full_name}
        role="admin"
      />
      <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
