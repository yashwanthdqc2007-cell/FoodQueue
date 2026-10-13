"use client";

import { useEffect, useState, useCallback } from "react";
import {
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Building2,
  MapPin,
  Phone,
  Scale,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { useRealtimeSync } from "@/lib/realtime/use-realtime-sync";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface ReceiverOrgItem {
  id: string;
  name: string;
  organization_type: string;
  address: string | null;
  contact_phone: string | null;
  receivers: Array<{
    id: string;
    receiver_type: string;
    max_capacity: number;
    priority_level: number;
    verified: boolean;
  }>;
}

export default function AdminReceiversVerificationPage() {
  const toast = useToast();
  const [organizations, setOrganizations] = useState<ReceiverOrgItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Action states
  const [actionReceiver, setActionReceiver] = useState<{ id: string; orgName: string; verified: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { status: syncStatus, lastUpdated, refresh: syncRefresh } = useRealtimeSync({
    channelName: "admin-receivers-sync",
    tables: ["receivers", "organizations"],
    onUpdate: () => setRefreshKey((k) => k + 1),
    pollingIntervalMs: 20000,
  });

  useEffect(() => {
    let ignore = false;

    async function loadReceivers() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/admin/organizations?limit=100");
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load receiver organizations");
          }
          const allReceivers = (json.data.organizations || []).filter(
            (org: ReceiverOrgItem) => org.receivers && org.receivers.length > 0
          );
          setOrganizations(allReceivers);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching receivers");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadReceivers();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function handleToggleVerification() {
    if (!actionReceiver) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      const nextStatus = !actionReceiver.verified;
      const res = await fetch(`/api/admin/receivers/${actionReceiver.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: nextStatus }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to update verification status");
      }

      toast.success(
        `${actionReceiver.orgName} is now ${nextStatus ? "VERIFIED (eligible for matching)" : "UNVERIFIED"}`,
        nextStatus ? "Receiver Approved" : "Verification Revoked"
      );

      setActionReceiver(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating verification status";
      setActionError(msg);
      toast.error(msg, "Action Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filtered receivers list
  const filteredList = organizations
    .filter((org) => org.receivers && org.receivers.length > 0)
    .filter((org) => {
      const receiver = org.receivers[0];
      if (statusFilter === "verified") return receiver.verified;
      if (statusFilter === "pending") return !receiver.verified;
      return true;
    })
    .filter((org) => {
      if (!searchQuery.trim()) return true;
      return org.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });

  const verifiedCount = organizations.filter((o) => o.receivers?.[0]?.verified).length;
  const pendingCount = organizations.filter((o) => o.receivers && !o.receivers[0]?.verified).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">
              Community Governance
            </span>
            <span className="text-brand-border">&bull;</span>
            <span className="text-xs text-brand-muted font-medium">NGO Eligibility &amp; Capacity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">
            Receiver Verification Queue
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-2xl leading-relaxed">
            Audit intake capacity, verify NGO and community shelter eligibility, and unlock surplus matching recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <RealtimeStatusBadge
            status={syncStatus}
            lastUpdated={lastUpdated}
            onRefresh={() => {
              syncRefresh();
              setRefreshKey((k) => k + 1);
            }}
          />
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === "all"
                ? "bg-brand-primary text-brand-bg shadow-xs"
                : "bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            All Receivers ({organizations.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-brand-amber text-brand-bg shadow-xs font-black"
                : "bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pending Review ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("verified")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "verified"
                ? "bg-brand-primary text-brand-bg shadow-xs"
                : "bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Partners ({verifiedCount})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receiver name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-medium bg-brand-card text-brand-text placeholder:text-brand-muted/60"
          />
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-violet" />
          <span className="text-xs font-semibold text-brand-muted">Loading receiver verification queue...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-brand-red/10 border border-brand-red/25 rounded-2xl p-6 text-center text-xs text-brand-red flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No Receiver Records Found"
          description="No community receiver organizations match the selected criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map((org) => {
            const receiver = org.receivers[0];
            const isVerified = receiver.verified;

            return (
              <div
                key={receiver.id}
                className="bg-brand-surface border border-brand-border hover:border-brand-primary/40 rounded-2xl p-5 shadow-xs transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-brand-border pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-brand-card text-brand-violet tracking-wider border border-brand-violet/30">
                        {receiver.receiver_type}
                      </span>
                      <h3 className="text-base font-extrabold text-brand-text mt-2">{org.name}</h3>
                    </div>

                    <Badge variant={isVerified ? "verified" : "pending"} size="sm">
                      {isVerified ? "Verified" : "Pending"}
                    </Badge>
                  </div>

                  <div className="text-xs text-brand-muted space-y-2.5 pt-3">
                    <div className="flex justify-between items-center bg-brand-card p-2.5 rounded-xl border border-brand-border">
                      <span className="font-semibold text-brand-muted flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-brand-mint" />
                        <span>Intake Capacity:</span>
                      </span>
                      <strong className="font-bold text-brand-text">{receiver.max_capacity} kg / batch</strong>
                    </div>

                    <div className="flex justify-between items-center bg-brand-card p-2.5 rounded-xl border border-brand-border">
                      <span className="font-semibold text-brand-muted">Priority Tier:</span>
                      <strong className="font-bold text-brand-text">Tier {receiver.priority_level}</strong>
                    </div>

                    {org.address && (
                      <div className="flex items-start gap-1.5 text-brand-text/80 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                        <span className="truncate">{org.address}</span>
                      </div>
                    )}

                    {org.contact_phone && (
                      <div className="flex items-center gap-1.5 text-brand-text/80 text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        <span>{org.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-border flex items-center justify-between gap-2">
                  <span className="text-[10px] text-brand-muted font-medium">Eligible for Matching:</span>

                  {isVerified ? (
                    <button
                      type="button"
                      onClick={() => setActionReceiver({ id: receiver.id, orgName: org.name, verified: true })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-red/15 border border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white text-xs font-bold transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActionReceiver({ id: receiver.id, orgName: org.name, verified: false })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-xs font-bold transition shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Approve &amp; Verify</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {actionReceiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-surface rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-brand-border space-y-4">
            <div className="flex items-center gap-2.5">
              {actionReceiver.verified ? (
                <ShieldAlert className="w-5 h-5 text-brand-red shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-brand-primary shrink-0" />
              )}
              <h3 className="text-base font-extrabold text-brand-text">
                {actionReceiver.verified ? "Revoke Receiver Verification?" : "Verify Receiver Organization?"}
              </h3>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              {actionReceiver.verified
                ? `Revoking verification for ${actionReceiver.orgName} will exclude this partner from automatic surplus matching recommendations until re-verified.`
                : `Verifying ${actionReceiver.orgName} confirms intake capacity and allows the matching engine to dispatch surplus batch recommendations.`}
            </p>

            {actionError && (
              <div className="p-3.5 rounded-xl bg-brand-red/10 border border-brand-red/25 text-xs text-brand-red">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-border">
              <button
                type="button"
                onClick={() => setActionReceiver(null)}
                className="px-4 py-2 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-xs font-bold text-brand-text transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleToggleVerification}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 ${
                  actionReceiver.verified
                    ? "bg-brand-red hover:bg-rose-700 text-white"
                    : "bg-brand-primary hover:bg-brand-primary-hover text-brand-bg"
                }`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{actionReceiver.verified ? "Confirm Revocation" : "Confirm Verification"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
