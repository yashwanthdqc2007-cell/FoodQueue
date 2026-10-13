"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Phone,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Eye,
  AlertTriangle,
  MapPin,
  Sparkles,
  UploadCloud,
  Check,
  Package,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { useRealtimeSync } from "@/lib/realtime/use-realtime-sync";
import { RealtimeStatusBadge } from "@/components/shared/realtime-status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

interface PickupItem {
  id: string;
  surplusId: string;
  receiverId: string;
  status: "requested" | "scheduled" | "picked_up" | "cancelled";
  requestedAt: string;
  scheduledAt: string | null;
  pickedUpAt: string | null;
  proofImagePath: string | null;
  signedProofUrl: string | null;
  notes: string | null;
  surplus: {
    id: string;
    foodName: string;
    quantity: number;
    unit: string;
    category: string;
    status: string;
    redistributionDeadline: string | null;
    kitchen: {
      id: string | null;
      name: string;
      address: string;
      contactPhone: string | null;
    };
  };
  receiver: {
    id: string;
    name: string;
    receiverType: string;
    address: string | null;
    contactPhone: string | null;
  };
  impact: {
    id: string;
    foodSavedQuantity: number;
    estimatedMealsSaved: number;
    estimatedWasteDiverted: number;
    estimatedCo2eAvoided: number | null;
    estimatedValueSaved: number | null;
    recordedAt: string;
  } | null;
}

export default function ReceiverPickupsPage() {
  const toast = useToast();
  const [pickups, setPickups] = useState<PickupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "picked_up" | "cancelled">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal states
  const [activePickup, setActivePickup] = useState<PickupItem | null>(null);
  const [actionType, setActionType] = useState<"complete" | "cancel" | "view_proof" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<string>("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const { status: syncStatus, lastUpdated, refresh: syncRefresh } = useRealtimeSync({
    channelName: "receiver-pickups-sync",
    tables: ["pickup_requests", "surplus_items", "impact_records"],
    onUpdate: () => setRefreshKey((k) => k + 1),
    pollingIntervalMs: 15000,
  });

  useEffect(() => {
    let ignore = false;

    async function loadPickups() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        let queryUrl = "/api/pickups";
        if (filterTab === "active") {
          queryUrl = "/api/pickups";
        } else if (filterTab !== "all") {
          queryUrl = `/api/pickups?status=${filterTab}`;
        }

        const res = await fetch(queryUrl);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load collection pickups");
          }
          let results: PickupItem[] = json.data.pickups || [];
          if (filterTab === "active") {
            results = results.filter((p) => p.status === "requested" || p.status === "scheduled");
          }
          setPickups(results);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching collection records");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadPickups();

    return () => {
      ignore = true;
    };
  }, [filterTab, refreshKey]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setModalError("Please upload a valid JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setModalError("Image exceeds 5MB size limit.");
      return;
    }

    setModalError(null);
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  }

  function openCompleteModal(p: PickupItem) {
    setActivePickup(p);
    setActionType("complete");
    setSelectedFile(null);
    setFilePreview(null);
    setActionNotes("");
    setModalError(null);
  }

  function openCancelModal(p: PickupItem) {
    setActivePickup(p);
    setActionType("cancel");
    setActionNotes("");
    setModalError(null);
  }

  function openProofModal(p: PickupItem) {
    setActivePickup(p);
    setActionType("view_proof");
  }

  async function handleSubmitAction() {
    if (!activePickup) return;
    setIsSubmittingAction(true);
    setModalError(null);

    try {
      if (actionType === "complete") {
        // Step 1: Upload proof if selected
        let uploadedPath: string | null = null;
        if (selectedFile) {
          const formData = new FormData();
          formData.append("file", selectedFile);
          formData.append("pickupId", activePickup.id);

          const uploadRes = await fetch("/api/pickups/upload-proof", {
            method: "POST",
            body: formData,
          });
          const uploadJson = await uploadRes.json();
          if (!uploadRes.ok || uploadJson.error) {
            throw new Error(uploadJson.error?.message || "Failed to upload handover proof image.");
          }
          uploadedPath = uploadJson.data.proofImagePath;
          toast.info("Handover photo proof uploaded successfully", "Proof Stored");
        }

        // Step 2: Mark pickup as picked_up
        const completeRes = await fetch(`/api/pickups/${activePickup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "picked_up",
            notes: actionNotes || undefined,
            proofImagePath: uploadedPath || undefined,
          }),
        });
        const completeJson = await completeRes.json();
        if (!completeRes.ok || completeJson.error) {
          throw new Error(completeJson.error?.message || "Failed to complete pickup collection.");
        }
        toast.success(`Collection completed for ${activePickup.surplus.foodName}. Impact credited!`, "Collection Verified");
      } else if (actionType === "cancel") {
        const cancelRes = await fetch(`/api/pickups/${activePickup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "cancelled",
            notes: actionNotes || "Cancelled by receiver organization",
          }),
        });
        const cancelJson = await cancelRes.json();
        if (!cancelRes.ok || cancelJson.error) {
          throw new Error(cancelJson.error?.message || "Failed to cancel pickup");
        }
        toast.info(`Pickup cancelled for ${activePickup.surplus.foodName}`, "Pickup Cancelled");
      }

      setActionType(null);
      setActivePickup(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute transaction update";
      setModalError(msg);
      toast.error(msg, "Action Failed");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  const activeCount = pickups.filter((p) => p.status === "requested" || p.status === "scheduled").length;
  const completedCount = pickups.filter((p) => p.status === "picked_up").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-brand-text">
      {/* Header */}
      <PageHeader
        title="Food Collection & Pickups"
        description="Coordinate collection handovers with partner donor kitchens, upload verification proofs, and record community food rescue impact."
        actions={
          <RealtimeStatusBadge
            status={syncStatus}
            lastUpdated={lastUpdated}
            onRefresh={() => {
              syncRefresh();
              setRefreshKey((k) => k + 1);
            }}
          />
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-brand-border/60 pb-3">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filterTab === "all"
              ? "bg-brand-violet text-brand-forest-dark shadow-xs font-extrabold"
              : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
          }`}
        >
          All Pickups ({pickups.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("active")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterTab === "active"
              ? "bg-amber-600 text-white shadow-xs font-extrabold"
              : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Active Collections ({activeCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("picked_up")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterTab === "picked_up"
              ? "bg-emerald-600 text-white shadow-xs font-extrabold"
              : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed ({completedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("cancelled")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filterTab === "cancelled"
              ? "bg-rose-600 text-white shadow-xs font-extrabold"
              : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-brand-violet" />
          <span className="text-xs font-bold text-brand-muted">Loading collection transactions...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-brand-red-light border border-brand-red/30 rounded-2xl p-6 text-center text-xs text-brand-red">
          {errorMsg}
        </div>
      ) : pickups.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No pickup collections found"
          description="When you accept surplus opportunities from donor kitchens, scheduled collections and handover records will appear here."
          action={{
            label: "Check Opportunities",
            href: "/receiver",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pickups.map((p) => {
            const statusConfig = {
              requested: { badge: "bg-amber-950/70 text-amber-300 border-amber-700/50", label: "Requested" },
              scheduled: { badge: "bg-sky-950/70 text-sky-300 border-sky-700/50", label: "Scheduled" },
              picked_up: { badge: "bg-emerald-950/70 text-emerald-300 border-emerald-700/50", label: "Completed" },
              cancelled: { badge: "bg-brand-surface text-brand-muted border-brand-border", label: "Cancelled" },
            }[p.status] || { badge: "bg-brand-surface text-brand-muted border-brand-border", label: p.status };

            // Step timeline calculation
            const stepIndex = p.status === "cancelled" ? -1 : p.status === "requested" ? 1 : p.status === "scheduled" ? 2 : 3;

            return (
              <div
                key={p.id}
                className="glass-card bg-brand-card border border-brand-border rounded-2xl p-5 shadow-sm hover:border-brand-violet/40 transition flex flex-col justify-between space-y-4 text-brand-text"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 border-b border-brand-border/60 pb-3">
                    <div>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${statusConfig.badge}`}>
                        {statusConfig.label}
                      </span>
                      <h3 className="text-base font-bold text-brand-text mt-1.5">{p.surplus.foodName}</h3>
                      <p className="text-xs text-brand-muted">
                        Batch Quantity: <span className="font-extrabold text-brand-text">{p.surplus.quantity} {p.surplus.unit}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                      <span className="text-xs font-semibold text-slate-700 capitalize">{p.surplus.category.replace("_", " ")}</span>
                    </div>
                  </div>

                  {/* Step Progress Timeline (if not cancelled) */}
                  {p.status !== "cancelled" && (
                    <div className="py-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-brand-muted mb-1.5 px-1">
                        <span className={stepIndex >= 1 ? "text-brand-violet font-extrabold" : ""}>1. Requested</span>
                        <span className={stepIndex >= 2 ? "text-sky-400 font-extrabold" : ""}>2. Scheduled</span>
                        <span className={stepIndex >= 3 ? "text-brand-primary font-extrabold" : ""}>3. Collected</span>
                      </div>
                      <div className="w-full bg-brand-surface h-1.5 rounded-full overflow-hidden border border-brand-border/60">
                        <div
                          className={`h-full transition-all duration-500 ${
                            stepIndex === 3 ? "bg-brand-primary w-full" : stepIndex === 2 ? "bg-sky-400 w-2/3" : "bg-brand-violet w-1/3"
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Donor Kitchen Location & Contact */}
                  <div className="bg-brand-surface rounded-xl p-3 text-xs text-brand-text space-y-1.5 border border-brand-border mt-2">
                    <div className="flex items-center gap-1.5 font-bold text-brand-text">
                      <Building2 className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                      <span>{p.surplus.kitchen.name}</span>
                    </div>
                    {p.surplus.kitchen.address && (
                      <div className="flex items-start gap-1.5 text-brand-muted">
                        <MapPin className="w-3.5 h-3.5 text-brand-muted shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{p.surplus.kitchen.address}</span>
                      </div>
                    )}
                    {p.surplus.kitchen.contactPhone && (
                      <div className="flex items-center gap-1.5 text-brand-muted">
                        <Phone className="w-3.5 h-3.5 text-brand-muted shrink-0" />
                        <span>{p.surplus.kitchen.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Logistics Timestamps */}
                  <div className="text-[11px] text-brand-muted space-y-1.5 pt-3">
                    <div className="flex justify-between">
                      <span>Requested:</span>
                      <span className="text-brand-text font-semibold">
                        {new Date(p.requestedAt).toLocaleString()}
                      </span>
                    </div>

                    {p.scheduledAt && (
                      <div className="flex justify-between">
                        <span>Scheduled:</span>
                        <span className="text-sky-300 font-bold">
                          {new Date(p.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {p.pickedUpAt && (
                      <div className="flex justify-between">
                        <span>Handover Completed:</span>
                        <span className="text-brand-primary font-bold">
                          {new Date(p.pickedUpAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Impact Summary (If completed) */}
                  {p.impact && (
                    <div className="mt-3 p-3 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-xs space-y-1.5 text-emerald-300">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Estimated Impact Credited</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="bg-brand-surface p-2 rounded-lg border border-brand-border">
                          <span className="text-[10px] text-brand-muted block">Food Rescued</span>
                          <span className="font-extrabold text-emerald-300">{p.impact.foodSavedQuantity} kg</span>
                        </div>
                        <div className="bg-brand-surface p-2 rounded-lg border border-brand-border">
                          <span className="text-[10px] text-brand-muted block">Meals Saved</span>
                          <span className="font-extrabold text-emerald-300">{p.impact.estimatedMealsSaved}</span>
                        </div>
                        <div className="bg-brand-surface p-2 rounded-lg border border-brand-border">
                          <span className="text-[10px] text-brand-muted block">CO₂e Avoided</span>
                          <span className="font-extrabold text-emerald-300">{p.impact.estimatedCo2eAvoided} kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {p.notes && (
                    <div className="text-[11px] text-brand-muted italic pt-2">
                      Handover note: &ldquo;{p.notes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-brand-border/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {(p.status === "scheduled" || p.status === "requested") && (
                      <button
                        type="button"
                        onClick={() => openCompleteModal(p)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-forest-dark text-xs font-black transition shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Complete Handover</span>
                      </button>
                    )}

                    {p.signedProofUrl && (
                      <button
                        type="button"
                        onClick={() => openProofModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-card text-brand-text text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Proof</span>
                      </button>
                    )}
                  </div>

                  {(p.status === "requested" || p.status === "scheduled") && (
                    <button
                      type="button"
                      onClick={() => openCancelModal(p)}
                      className="inline-flex items-center gap-1 text-xs text-brand-red hover:underline font-semibold"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Handover Modal */}
      {actionType === "complete" && activePickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-brand-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-brand-border space-y-4 text-brand-text">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                <span>Complete Collection Handover</span>
              </h3>
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="text-brand-muted hover:text-brand-text text-xs font-bold p-1 rounded-lg hover:bg-brand-surface"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              Confirm food collection handover from <span className="font-bold text-brand-text">{activePickup.surplus.kitchen.name}</span>. This will finalize the transaction and credit verifiable impact.
            </p>

            {modalError && (
              <div className="p-3 rounded-xl bg-brand-red-light border border-brand-red/30 text-xs text-brand-red">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Proof Image Upload */}
              <div>
                <label className="font-bold text-brand-text block mb-1">
                  Upload Verification Proof (Photo)
                </label>
                <div className="border-2 border-dashed border-brand-border rounded-2xl p-4 text-center hover:bg-brand-surface transition cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {filePreview ? (
                    <div className="space-y-2">
                      <div className="relative h-32 w-full rounded-xl overflow-hidden bg-brand-surface">
                        <Image
                          src={filePreview}
                          alt="Proof preview"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[11px] text-brand-primary font-bold block">
                        ✓ {selectedFile?.name} (Click to replace)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                      <UploadCloud className="w-6 h-6 text-brand-muted" />
                      <span className="font-semibold text-brand-text">Click to select handover photo</span>
                      <span className="text-[10px] text-brand-muted">JPEG, PNG, WebP (Max 5MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Handover Notes */}
              <div>
                <label className="font-bold text-brand-text block mb-1">
                  Collection Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Received in good chilled condition by volunteer Team A."
                  className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-brand-text placeholder:text-brand-muted/60 focus:outline-hidden focus:ring-2 focus:ring-brand-primary text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/60">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-card text-xs font-semibold text-brand-muted hover:text-brand-text"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleSubmitAction}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-forest-dark text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isSubmittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Finalize Handover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {actionType === "cancel" && activePickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-brand-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-brand-border space-y-4 text-brand-text">
            <div className="flex items-center gap-2 text-brand-red">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-brand-text">Cancel Pickup Request?</h3>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              Cancelling will inform the kitchen that you cannot collect this batch and make it available for other community receivers if time remains before the deadline.
            </p>

            {modalError && (
              <div className="p-3 rounded-xl bg-brand-red-light border border-brand-red/30 text-xs text-brand-red">
                {modalError}
              </div>
            )}

            <div>
              <label className="font-bold text-brand-text block mb-1 text-xs">
                Cancellation Reason (Optional)
              </label>
              <textarea
                rows={2}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g. Volunteer vehicle unavailable."
                className="w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-brand-text placeholder:text-brand-muted/60 focus:outline-hidden focus:ring-2 focus:ring-brand-red text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/60">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl border border-brand-border bg-brand-surface hover:bg-brand-card text-xs font-semibold text-brand-muted hover:text-brand-text"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleSubmitAction}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-red/90 text-brand-forest-dark text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isSubmittingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Proof Modal */}
      {actionType === "view_proof" && activePickup && activePickup.signedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-brand-card rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-brand-border space-y-4 text-brand-text">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <h3 className="text-base font-bold text-brand-text flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
                <span>Uploaded Handover Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="text-brand-muted hover:text-brand-text text-xs font-bold p-1 rounded-lg hover:bg-brand-surface"
              >
                ✕
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-brand-border bg-brand-surface aspect-video max-h-80">
              <Image
                src={activePickup.signedProofUrl}
                alt="Pickup Handover Proof"
                fill
                className="object-cover"
              />
            </div>

            <div className="text-[11px] text-brand-muted flex justify-between pt-2">
              <span>Donor Kitchen: <strong className="text-brand-text">{activePickup.surplus.kitchen.name}</strong></span>
              <span>Completed: {activePickup.pickedUpAt ? new Date(activePickup.pickedUpAt).toLocaleString() : "N/A"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
