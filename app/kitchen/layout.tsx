import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KitchenNav } from "@/components/kitchen/kitchen-nav";
import type { ProfileModel, KitchenModel } from "@/types/models";

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Verify caller identity
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    redirect("/auth/login");
  }

  // 2. Fetch profile
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      organization_id,
      created_at,
      updated_at
    `)
    .eq("id", userData.user.id)
    .returns<ProfileModel[]>();

  const profile = profiles?.[0];

  // 3. Role and organization guards
  if (!profile || profile.role === "receiver") {
    redirect("/dashboard");
  }

  if (profile.role !== "admin" && !profile.organization_id) {
    redirect("/dashboard");
  }

  // 4. Fetch kitchen
  let query = supabase
    .from("kitchens")
    .select("id, organization_id, name, address, timezone, active")
    .eq("active", true);

  if (profile.role !== "admin" && profile.organization_id) {
    query = query.eq("organization_id", profile.organization_id);
  }

  const { data: kitchens } = await query.returns<KitchenModel[]>();
  const currentKitchen = kitchens?.[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <KitchenNav
        kitchenName={currentKitchen?.name || "Kitchen Operations"}
        userEmail={profile.email || userData.user.email}
        role={profile.role}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
