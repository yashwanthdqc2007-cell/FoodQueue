"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  PlusCircle,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ChefHat,
  HeartHandshake,
  MapPin,
  Phone,
  Filter,
  ShieldCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface OrganizationItem {
  id: string;
  name: string;
  organization_type: "kitchen" | "receiver" | "institution" | "ngo" | "processing_unit";
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  created_at: string;
  kitchens?: Array<{ id: string; name: string; timezone: string; active: boolean }>;
  receivers?: Array<{ id: string; receiver_type: string; max_capacity: number; priority_level: number; verified: boolean }>;
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<"kitchen" | "receiver" | "institution" | "ngo" | "processing_unit">("kitchen");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [receiverMaxCapacity, setReceiverMaxCapacity] = useState("100");
  const [receiverType, setReceiverType] = useState<"ngo" | "shelter" | "hostel" | "community_center" | "other">("ngo");

  useEffect(() => {
    let ignore = false;

    async function loadOrganizations() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        let url = `/api/admin/organizations?limit=100`;
        if (typeFilter !== "all") {
          url += `&type=${typeFilter}`;
        }
        if (searchQuery.trim()) {
          url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load organizations");
          }
          setOrganizations(json.data.organizations || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching organizations");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      ignore = true;
    };
  }, [typeFilter, searchQuery, refreshKey]);

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) {
      setModalError("Organization name is required");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const payload: Record<string, unknown> = {
        name: orgName.trim(),
        organizationType: orgType,
        address: orgAddress.trim() || undefined,
        contactPhone: orgPhone.trim() || undefined,
      };

      if (orgType === "kitchen" || orgType === "institution") {
        payload.kitchen = {
          name: `${orgName.trim()} Main Kitchen`,
          timezone: "Asia/Kolkata",
        };
      } else if (orgType === "receiver" || orgType === "ngo") {
        payload.receiver = {
          receiverType,
          maxCapacity: parseFloat(receiverMaxCapacity) || 50,
          acceptedFoodTypes: ["all"],
          operatingHours: { standard: "08:00-20:00" },
        };
      }

      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to register organization");
      }

      // Reset form & close modal
      setOrgName("");
      setOrgAddress("");
      setOrgPhone("");
      setIsCreateOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Facility Management
            </span>
            <span className="text-brand-border">&bull;</span>
            <span className="text-xs text-brand-muted font-medium">Directory &amp; Provisioning</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">
            Organization Directory
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-2xl leading-relaxed">
            Provision and audit registered institutional donor kitchens, community receiver NGOs, shelters, and processing centers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-xs sm:text-sm font-bold transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Facility</span>
          </button>

          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2.5 rounded-xl bg-brand-surface border border-brand-border hover:bg-brand-card text-brand-text shadow-2xs transition"
            title="Refresh Directory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search organizations by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-medium bg-brand-card text-brand-text placeholder:text-brand-muted/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-brand-muted shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-brand-border bg-brand-card text-xs font-bold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">All Facility Types</option>
            <option value="kitchen">Donor Kitchen</option>
            <option value="receiver">Community Receiver</option>
            <option value="ngo">NGO</option>
            <option value="institution">Institution</option>
            <option value="processing_unit">Processing Unit</option>
          </select>
        </div>
      </div>

      {/* Main Directory Table */}
      {isLoading ? (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <span className="text-xs font-semibold text-brand-muted">Loading registered facilities...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-brand-red/10 border border-brand-red/25 rounded-2xl p-6 text-center text-xs text-brand-red flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Organizations Found"
          description="No facilities match the selected search or filter criteria. Use the register button above to onboard new partners."
          action={{
            label: "Register New Facility",
            onClick: () => setIsCreateOpen(true),
            icon: PlusCircle,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {organizations.map((org) => {
            const isReceiverOrg = org.organization_type === "receiver" || org.organization_type === "ngo";
            const receiverEntity = org.receivers?.[0];
            const isKitchenOrg = org.organization_type === "kitchen" || org.organization_type === "institution";

            return (
              <div
                key={org.id}
                className="bg-brand-surface border border-brand-border hover:border-brand-primary/40 rounded-2xl p-5 shadow-xs transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-brand-border pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-brand-card text-brand-mint tracking-wider border border-brand-border">
                        {org.organization_type.replace("_", " ")}
                      </span>
                      <h3 className="text-base font-extrabold text-brand-text mt-2">{org.name}</h3>
                    </div>

                    {isReceiverOrg && receiverEntity && (
                      <Badge
                        variant={receiverEntity.verified ? "verified" : "pending"}
                        size="sm"
                      >
                        {receiverEntity.verified ? "Verified" : "Pending"}
                      </Badge>
                    )}

                    {isKitchenOrg && (
                      <Badge variant="primary" size="sm">
                        Active Kitchen
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-brand-muted space-y-2 pt-3">
                    {org.address && (
                      <div className="flex items-start gap-1.5 text-brand-text/80">
                        <MapPin className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                        <span className="truncate">{org.address}</span>
                      </div>
                    )}
                    {org.contact_phone && (
                      <div className="flex items-center gap-1.5 text-brand-text/80">
                        <Phone className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                        <span>{org.contact_phone}</span>
                      </div>
                    )}

                    {receiverEntity && (
                      <div className="pt-2 border-t border-brand-border text-xs text-brand-violet flex justify-between items-center">
                        <span className="font-semibold text-brand-muted">Intake Capacity:</span>
                        <strong className="font-bold text-brand-violet">{receiverEntity.max_capacity} kg / batch</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-border flex items-center justify-between text-[11px] text-brand-muted">
                  <span>Enrolled: {new Date(org.created_at).toLocaleDateString()}</span>
                  <span className="font-semibold text-brand-primary">Operational</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Organization Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-surface rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-brand-border space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-brand-border pb-3.5">
              <h3 className="text-base font-extrabold text-brand-text flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-primary" />
                <span>Register New Facility</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-brand-muted hover:text-brand-text p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-brand-red/10 border border-brand-red/25 text-xs text-brand-red">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateOrganization} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-brand-text block mb-1.5">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Central Institutional Kitchen"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-medium text-brand-text bg-brand-card"
                />
              </div>

              <div>
                <label className="font-bold text-brand-text block mb-1.5">
                  Organization Type *
                </label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-card focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-semibold text-brand-text"
                >
                  <option value="kitchen">Donor Kitchen</option>
                  <option value="receiver">Community Receiver (Shelter / Food Bank)</option>
                  <option value="ngo">NGO (Non-profit Foundation)</option>
                  <option value="institution">Educational / Corporate Institution</option>
                  <option value="processing_unit">Processing &amp; Composting Unit</option>
                </select>
              </div>

              {(orgType === "receiver" || orgType === "ngo") && (
                <div className="p-4 rounded-2xl bg-brand-card/70 border border-brand-violet/30 space-y-3">
                  <span className="text-[11px] font-bold text-brand-violet uppercase block tracking-wider">
                    Receiver Intake Settings
                  </span>

                  <div>
                    <label className="font-bold text-brand-text block mb-1">
                      Receiver Classification
                    </label>
                    <select
                      value={receiverType}
                      onChange={(e) => setReceiverType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-xs font-semibold text-brand-text"
                    >
                      <option value="ngo">NGO</option>
                      <option value="shelter">Homeless / Community Shelter</option>
                      <option value="community_center">Community Center</option>
                      <option value="hostel">Hostel</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-brand-text block mb-1">
                      Max Batch Intake Capacity (kg)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={receiverMaxCapacity}
                      onChange={(e) => setReceiverMaxCapacity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-xs font-medium text-brand-text"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-brand-text block mb-1.5">
                  Physical Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 124 Campus Avenue, Sector 4"
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-medium text-brand-text bg-brand-card"
                />
              </div>

              <div>
                <label className="font-bold text-brand-text block mb-1.5">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-xs font-medium text-brand-text bg-brand-card"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-xs font-bold text-brand-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !orgName.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save Facility</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
