import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/auth/actions";
import type { ProfileModel } from "@/types/models";
import {
  Shield,
  LogOut,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  ChefHat,
  HeartHandshake,
  Lock,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Verify user authentication
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    redirect("/auth/login");
  }

  const user = userData.user;

  // 2. Fetch profile and organization info under RLS
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
      updated_at,
      organizations (
        id,
        name,
        organization_type,
        address
      )
    `)
    .eq("id", user.id)
    .returns<ProfileModel[]>();

  const profile = profiles?.[0];
  const isAssigned = Boolean(profile?.organization_id && profile?.organizations);
  const organization = profile?.organizations;

  const roleIcons = {
    kitchen: ChefHat,
    receiver: HeartHandshake,
    admin: Lock,
  };

  const RoleIcon = (profile?.role && roleIcons[profile.role]) || User;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Application Shell Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900">FoodQueue</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Phase 1 Shell
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900">{profile?.full_name || user.email}</div>
              <div className="text-[11px] text-slate-500 capitalize">{profile?.role || "User"}</div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Welcome Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Welcome, {profile?.full_name || "User"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 capitalize">
                <RoleIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>{profile?.role || "User"}</span>
              </div>
            </div>
          </div>

          {/* Profile & Organization Assignment Status */}
          {isAssigned ? (
            <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-4">
                <CheckCircle2 className="w-4 h-4" />
                <span>Organization Assigned</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Organization Name</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{organization?.name}</div>
                  <div className="text-xs text-slate-500 capitalize mt-0.5">{organization?.organization_type}</div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                    <RoleIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Operational Access</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 capitalize">{profile?.role} Portal</div>
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">Active &amp; Verified</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-amber-900">Awaiting Organization Assignment</h2>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Your account has been registered successfully with default role <strong>{profile?.role || "kitchen"}</strong>. An administrator must provision and link your profile to an authorized kitchen or receiver organization before operational features become accessible.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>Account ID: {profile?.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operational Kitchen Portal Quick Launch */}
          {isAssigned && (profile?.role === "kitchen" || profile?.role === "admin") && (
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600/80 text-emerald-100">
                  Kitchen Intelligence Module Ready
                </span>
                <h3 className="text-lg font-bold mt-2">Open Kitchen Operations Hub</h3>
                <p className="text-xs text-emerald-100/90 mt-1 max-w-md">
                  Plan daily meal schedules, review baseline demand forecasts, record post-service consumption, and hand off leftover surplus.
                </p>
              </div>

              <Link
                href="/kitchen"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition shadow-sm shrink-0"
              >
                <ChefHat className="w-4 h-4" />
                <span>Launch Kitchen Hub</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
