"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Building2,
  ChefHat,
  HeartHandshake,
  Shield,
  UserCheck,
  AlertCircle,
  X,
} from "lucide-react";
import type { AdminUserListItem } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface OrgOption {
  id: string;
  name: string;
  organization_type: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [unassignedOnly, setUnassignedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Assign Modal state
  const [activeUser, setActiveUser] = useState<AdminUserListItem | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"kitchen" | "receiver" | "admin">("kitchen");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        let url = `/api/admin/users?limit=100`;
        if (roleFilter !== "all") {
          url += `&role=${roleFilter}`;
        }
        if (unassignedOnly) {
          url += `&unassignedOnly=true`;
        }

        const [usersRes, orgsRes] = await Promise.all([
          fetch(url),
          fetch("/api/admin/organizations?limit=100"),
        ]);

        const usersJson = await usersRes.json();
        const orgsJson = await orgsRes.json();

        if (!ignore) {
          if (!usersRes.ok || usersJson.error) {
            throw new Error(usersJson.error?.message || "Failed to load users");
          }
          setUsers(usersJson.data.users || []);
          setOrganizations(orgsJson.data?.organizations || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching users");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [roleFilter, unassignedOnly, refreshKey]);

  function openAssignModal(u: AdminUserListItem) {
    setActiveUser(u);
    setSelectedOrgId(u.organizationId || (organizations[0]?.id ?? ""));
    setSelectedRole(u.role);
    setAssignError(null);
  }

  async function handleAssignUser(e: React.FormEvent) {
    e.preventDefault();
    if (!activeUser || !selectedOrgId) return;

    setIsSubmittingAssign(true);
    setAssignError(null);

    try {
      const res = await fetch("/api/admin/users/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUser.id,
          organizationId: selectedOrgId,
          role: selectedRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to assign user");
      }

      setActiveUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "Failed to execute assignment");
    } finally {
      setIsSubmittingAssign(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.organizationName && u.organizationName.toLowerCase().includes(query))
    );
  });

  const unassignedCount = users.filter((u) => !u.organizationId).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Identity &amp; Governance
            </span>
            <span className="text-brand-border">&bull;</span>
            <span className="text-xs text-brand-muted font-medium">RBAC User Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">
            User Directory &amp; Roles
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-2xl leading-relaxed">
            Manage authenticated platform accounts, assign kitchen and receiver facility roles, and configure organization linkage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-card text-xs font-bold text-brand-text shadow-2xs transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRoleFilter("all");
              setUnassignedOnly(false);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              roleFilter === "all" && !unassignedOnly
                ? "bg-brand-primary text-brand-bg shadow-xs font-black"
                : "bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            All Accounts ({users.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleFilter("all");
              setUnassignedOnly(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              unassignedOnly
                ? "bg-brand-amber text-brand-bg shadow-xs font-black"
                : "bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Unassigned ({unassignedCount})</span>
          </button>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setUnassignedOnly(false);
            }}
            className="px-3.5 py-2 rounded-xl border border-brand-border bg-brand-card text-xs font-bold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">Filter by Role</option>
            <option value="kitchen">Kitchen Staff</option>
            <option value="receiver">Receiver Staff</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, or facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-medium bg-brand-card text-brand-text placeholder:text-brand-muted/60"
          />
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <span className="text-xs font-semibold text-brand-muted">Loading user accounts...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-brand-red/10 border border-brand-red/25 rounded-2xl p-6 text-center text-xs text-brand-red flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Matching Accounts Found"
          description="No user profiles match the selected role or search criteria."
        />
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-brand-card/90 text-brand-muted font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5">User Profile</th>
                  <th className="py-3.5 px-4">Assigned Role</th>
                  <th className="py-3.5 px-4">Requested Intent</th>
                  <th className="py-3.5 px-4">Facility Linkage</th>
                  <th className="py-3.5 px-4">Enrolled Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-brand-text">
                {filteredUsers.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-brand-card/50 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-brand-text text-sm">{u.fullName}</div>
                        <div className="text-[11px] text-brand-muted">{u.email || "No email"}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            u.role === "kitchen"
                              ? "primary"
                              : u.role === "receiver"
                              ? "violet"
                              : "forest"
                          }
                          size="sm"
                          icon={
                            u.role === "kitchen" ? (
                              <ChefHat className="w-3 h-3" />
                            ) : u.role === "receiver" ? (
                              <HeartHandshake className="w-3 h-3" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )
                          }
                        >
                          <span className="capitalize">{u.role}</span>
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.requestedWorkspace === "kitchen" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-mint bg-brand-forest/30 border border-brand-forest/60 px-2 py-0.5 rounded-lg">
                            <ChefHat className="w-3 h-3 text-brand-primary" />
                            <span>Prefers Kitchen</span>
                          </span>
                        ) : u.requestedWorkspace === "receiver" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-violet bg-brand-violet/15 border border-brand-violet/30 px-2 py-0.5 rounded-lg">
                            <HeartHandshake className="w-3 h-3" />
                            <span>Prefers Receiver</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-brand-muted/70 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {u.organizationName ? (
                          <div className="flex items-center gap-1.5 font-bold text-brand-text">
                            <Building2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                            <span>{u.organizationName}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-brand-amber bg-brand-amber/15 px-2.5 py-0.5 rounded-full border border-brand-amber/30">
                            Pending Assignment
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-brand-muted font-medium">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => openAssignModal(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-text text-xs font-bold shadow-2xs transition"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-brand-primary" />
                          <span>{u.organizationId ? "Change Facility" : "Assign Facility"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Organization Modal */}
      {activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-surface rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-brand-border space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3.5">
              <h3 className="text-base font-extrabold text-brand-text flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-primary" />
                <span>Assign Facility Linkage</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveUser(null)}
                className="text-brand-muted hover:text-brand-text p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-brand-card p-3.5 rounded-xl border border-brand-border text-xs">
              <span className="text-brand-muted block font-semibold mb-0.5">Target User:</span>
              <strong className="text-brand-text font-bold">{activeUser.fullName}</strong> ({activeUser.email})
              {activeUser.requestedWorkspace && (
                <div className="mt-1 pt-1 border-t border-brand-border text-[11px] text-brand-muted">
                  User requested workspace:{" "}
                  <strong className="text-brand-mint capitalize">{activeUser.requestedWorkspace}</strong>
                </div>
              )}
            </div>

            {assignError && (
              <div className="p-3.5 rounded-xl bg-brand-red/10 border border-brand-red/25 text-xs text-brand-red">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignUser} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-brand-text block mb-1.5">
                  Select Operating Facility *
                </label>
                <select
                  required
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-card focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-semibold text-brand-text"
                >
                  <option value="">Choose a facility...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.organization_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-brand-text block mb-1.5">
                  Designated System Role *
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-card focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-semibold text-brand-text"
                >
                  <option value="kitchen">Kitchen Staff (Donor Portal)</option>
                  <option value="receiver">Receiver Staff (Community Partner Portal)</option>
                  <option value="admin">Platform Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setActiveUser(null)}
                  className="px-4 py-2 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-xs font-bold text-brand-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign || !selectedOrgId}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingAssign ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
