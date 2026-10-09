import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReceiverNav } from "@/components/receiver/receiver-nav";
import type { ProfileModel, ReceiverModel } from "@/types/models";

export default async function ReceiverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Authenticate user session
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/auth/login");
  }

  const userId = userData.user.id;

  // 2. Fetch profile & organization
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      organization_id,
      organizations (
        id,
        name
      )
    `)
    .eq("id", userId)
    .returns<ProfileModel[]>();

  const profile = profiles?.[0];

  if (!profile) {
    redirect("/auth/login");
  }

  // 3. Role enforcement: Must be 'receiver' or 'admin'
  if (profile.role !== "receiver" && profile.role !== "admin") {
    redirect("/dashboard");
  }

  // 4. Require organization assignment (for non-admins)
  if (profile.role !== "admin" && !profile.organization_id) {
    redirect("/dashboard");
  }

  // 5. Fetch receiver entity details
  let receiverQuery = supabase.from("receivers").select("id, receiver_type, max_capacity, verified");
  if (profile.role !== "admin" && profile.organization_id) {
    receiverQuery = receiverQuery.eq("organization_id", profile.organization_id);
  }

  const { data: receivers } = await receiverQuery.returns<ReceiverModel[]>();
  const receiver = receivers?.[0] || null;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <ReceiverNav
        receiverName={profile.organizations?.name || "Community Partner"}
        userEmail={userData.user.email}
        role={profile.role}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
