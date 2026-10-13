import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/auth/actions";
import type { ProfileModel } from "@/types/models";
import {
  Shield,
  LogOut,
  Building2,
  CheckCircle2,
  User,
  ChefHat,
  HeartHandshake,
  Leaf,
  Users,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { WorkspaceOnboarding } from "@/components/dashboard/workspace-onboarding";
import { FoodQueueLogo } from "@/components/brand/foodqueue-logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

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
  const role = profile?.role || "kitchen";
  const isAdmin = role === "admin";
  const isAssigned = Boolean(profile?.organization_id && profile?.organizations);
  const organization = profile?.organizations;

  const roleIcons = {
    kitchen: ChefHat,
    receiver: HeartHandshake,
    admin: Shield,
  };

  const RoleIcon = roleIcons[role] || User;
  const initialRequestedWorkspace =
    (user.user_metadata?.requested_workspace as "kitchen" | "receiver" | undefined) || null;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row text-brand-text">
      {/* Left Application Shell Sidebar / Mobile Header */}
      <DashboardNav
        facilityName={organization?.name || (isAdmin ? "Platform Governance" : "Account Setup")}
        userEmail={user.email}
        userFullName={profile?.full_name}
        userRole={role}
        isAdmin={isAdmin}
        isAssigned={isAssigned}
        role={role}
      />

      {/* Main Content Body */}
      <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 overflow-y-auto">
        {!isAdmin && !isAssigned ? (
          /* Dedicated Rich Onboarding Experience for Unassigned Users */
          <WorkspaceOnboarding
            initialRequestedWorkspace={initialRequestedWorkspace}
            userEmail={user.email || ""}
            userFullName={profile?.full_name}
            assignedRole={role}
          />
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome User Profile Header */}
            <div className="glass-card rounded-3xl p-6 sm:p-7 border border-brand-border bg-brand-card shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-forest/40 border border-brand-primary/40 text-brand-mint flex items-center justify-center font-black text-xl shadow-xs">
                    {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-brand-text tracking-tight">
                        {profile?.full_name || "FoodQueue User"}
                      </h1>
                    </div>
                    <p className="text-xs text-brand-muted mt-0.5 font-medium">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-surface text-brand-text border border-brand-border capitalize shadow-2xs">
                    <RoleIcon className="w-3.5 h-3.5 text-brand-primary" />
                    <span>{role}</span>
                  </div>
                  {isAdmin ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-forest text-brand-mint border border-brand-mint/20">
                      Platform Authority
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                      Active &amp; Assigned
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ADMIN VIEW: Platform Governance Command Deck */}
            {isAdmin && (
              <div className="space-y-6">
                <div className="glass-card rounded-3xl p-6 sm:p-7 border border-brand-border bg-brand-card shadow-lg">
                  <div className="flex items-center gap-2 text-brand-text font-bold text-sm mb-4">
                    <Shield className="w-4 h-4 text-brand-primary" />
                    <span>Platform Administrator Console</span>
                  </div>
                  <p className="text-xs text-brand-muted leading-relaxed mb-6">
                    You are authenticated with global administrative privileges. Manage organization provisioning, user role assignments, receiver NGO verifications, and global food rescue telemetry.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                      href="/admin"
                      className="p-4 rounded-2xl bg-brand-surface hover:bg-brand-primary/10 border border-brand-border hover:border-brand-primary/40 transition group flex flex-col justify-between"
                    >
                      <div>
                        <BarChart3 className="w-5 h-5 text-brand-primary mb-2" />
                        <div className="text-sm font-bold text-brand-text group-hover:text-brand-primary transition">
                          System Overview
                        </div>
                        <div className="text-xs text-brand-muted mt-1">Cross-organization telemetry &amp; impact</div>
                      </div>
                      <div className="mt-4 text-xs font-semibold text-brand-primary flex items-center gap-1">
                        <span>Launch</span> <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>

                    <Link
                      href="/admin/organizations"
                      className="p-4 rounded-2xl bg-brand-surface hover:bg-brand-primary/10 border border-brand-border hover:border-brand-primary/40 transition group flex flex-col justify-between"
                    >
                      <div>
                        <Building2 className="w-5 h-5 text-brand-text mb-2" />
                        <div className="text-sm font-bold text-brand-text group-hover:text-brand-primary transition">
                          Organizations
                        </div>
                        <div className="text-xs text-brand-muted mt-1">Directory, creation &amp; coordinates</div>
                      </div>
                      <div className="mt-4 text-xs font-semibold text-brand-primary flex items-center gap-1">
                        <span>Manage</span> <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>

                    <Link
                      href="/admin/receivers"
                      className="p-4 rounded-2xl bg-brand-surface hover:bg-brand-violet/10 border border-brand-border hover:border-brand-violet/40 transition group flex flex-col justify-between"
                    >
                      <div>
                        <HeartHandshake className="w-5 h-5 text-brand-violet mb-2" />
                        <div className="text-sm font-bold text-brand-text group-hover:text-brand-violet transition">
                          Receivers
                        </div>
                        <div className="text-xs text-brand-muted mt-1">NGO intake capacity &amp; verification</div>
                      </div>
                      <div className="mt-4 text-xs font-semibold text-brand-violet flex items-center gap-1">
                        <span>Verify</span> <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>

                    <Link
                      href="/admin/users"
                      className="p-4 rounded-2xl bg-brand-surface hover:bg-brand-primary/10 border border-brand-border hover:border-brand-primary/40 transition group flex flex-col justify-between"
                    >
                      <div>
                        <Users className="w-5 h-5 text-brand-primary mb-2" />
                        <div className="text-sm font-bold text-brand-text group-hover:text-brand-primary transition">
                          User Directory
                        </div>
                        <div className="text-xs text-brand-muted mt-1">Role &amp; organization assignment</div>
                      </div>
                      <div className="mt-4 text-xs font-semibold text-brand-primary flex items-center gap-1">
                        <span>Assign</span> <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Administrative Quick Portals for Testing & Verification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-card rounded-2xl p-5 border border-brand-border bg-brand-card flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-wider">
                        <ChefHat className="w-4 h-4" />
                        <span>Kitchen Operations</span>
                      </div>
                      <p className="text-xs text-brand-muted mt-1">Inspect kitchen meal planning and surplus records</p>
                    </div>
                    <Link
                      href="/kitchen"
                      className="px-3.5 py-2 rounded-xl bg-brand-surface hover:bg-brand-primary/15 text-brand-text hover:text-brand-primary text-xs font-bold transition border border-brand-border shrink-0"
                    >
                      View Portal
                    </Link>
                  </div>

                  <div className="glass-card rounded-2xl p-5 border border-brand-border bg-brand-card flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-brand-violet font-bold text-xs uppercase tracking-wider">
                        <HeartHandshake className="w-4 h-4" />
                        <span>Receiver Portal</span>
                      </div>
                      <p className="text-xs text-brand-muted mt-1">Inspect food rescue opportunities &amp; match requests</p>
                    </div>
                    <Link
                      href="/receiver"
                      className="px-3.5 py-2 rounded-xl bg-brand-surface hover:bg-brand-violet/15 text-brand-text hover:text-brand-violet text-xs font-bold transition border border-brand-border shrink-0"
                    >
                      View Portal
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* NON-ADMIN: Assigned Organization Card */}
            {!isAdmin && isAssigned && (
              <div className="glass-card rounded-3xl p-6 sm:p-7 border border-emerald-800/50 bg-brand-card shadow-lg">
                <div className="flex items-center gap-2 text-brand-primary font-bold text-sm mb-4">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                  <span>Organization Assigned &amp; Verified</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border">
                    <div className="text-xs text-brand-muted font-semibold flex items-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Operating Facility</span>
                    </div>
                    <div className="text-sm font-bold text-brand-text">{organization?.name}</div>
                    <div className="text-xs text-brand-muted capitalize mt-0.5">{organization?.organization_type}</div>
                    {organization?.address && (
                      <div className="text-xs text-brand-muted mt-1 truncate">{organization.address}</div>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border">
                    <div className="text-xs text-brand-muted font-semibold flex items-center gap-1.5 mb-1">
                      <RoleIcon className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Operational Access</span>
                    </div>
                    <div className="text-sm font-bold text-brand-text capitalize">{role} Workspace</div>
                    <div className="text-xs text-brand-primary font-semibold mt-0.5">Active &amp; Authorized</div>
                  </div>
                </div>
              </div>
            )}

          {/* Role Operational Workspace Launchers for Assigned Users */}
          {isAssigned && role === "kitchen" && (
            <div className="bg-gradient-to-r from-brand-forest to-[#1A5238] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-brand-primary/30">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-primary text-brand-forest-dark border border-brand-mint/20">
                  Kitchen Operations Hub
                </span>
                <h3 className="text-lg sm:text-xl font-black mt-2">Open Kitchen Workspace</h3>
                <p className="text-xs text-emerald-100/90 mt-1 max-w-md leading-relaxed">
                  Plan daily meal schedules, audit consumption mass-balance, record surplus batches, and coordinate audited handovers.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/kitchen/analytics"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </Link>
                <Link
                  href="/kitchen"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-brand-forest-dark hover:bg-brand-primary-hover text-xs font-extrabold transition shadow-md"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Launch Hub</span>
                </Link>
              </div>
            </div>
          )}

          {isAssigned && role === "receiver" && (
            <div className="bg-gradient-to-r from-[#2F1F54] to-brand-forest text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-brand-violet/30">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-violet text-brand-forest-dark border border-purple-300/30">
                  Community Receiver Portal
                </span>
                <h3 className="text-lg sm:text-xl font-black mt-2">Open Receiver Network Hub</h3>
                <p className="text-xs text-purple-100/90 mt-1 max-w-md leading-relaxed">
                  Browse surplus matches from partner kitchens, coordinate collections, upload proof of handover, and track impact footprint.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/receiver/impact"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Estimated Impact</span>
                </Link>
                <Link
                  href="/receiver"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-violet text-brand-forest-dark hover:bg-brand-violet/90 text-xs font-extrabold transition shadow-md"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Launch Portal</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
    </div>
  );
}
