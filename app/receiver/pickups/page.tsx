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
} from "lucide-react";

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

  useEffect(() => {
    let ignore = false;

    async function loadPickups() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        let queryUrl = "/api/pickups";
        if (filterTab === "active") {
          // fetch all and filter in frontend or query requested/scheduled
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
      }

      setActionType(null);
      setActivePickup(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to execute transaction update");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  const activeCount = pickups.filter((p) => p.status === "requested" || p.status === "scheduled").length;
  const completedCount = pickups.filter((p) => p.status === "picked_up").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Food Collection &amp; Pickups</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinate collection handovers with partner donor kitchens, upload verification proofs, and record community food rescue impact.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filterTab === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          All Pickups ({pickups.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("active")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterTab === "active"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Active Collections ({activeCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("picked_up")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            filterTab === "picked_up"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed ({completedCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("cancelled")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filterTab === "cancelled"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="text-xs font-semibold text-slate-600">Loading collection transactions...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-700">
          {errorMsg}
        </div>
      ) : pickups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <Calendar className="w-10 h-10 text-slate-300" />
          <h3 className="text-base font-bold text-slate-900">No pickup collections found</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            When you accept surplus opportunities from donor kitchens, scheduled collections and pickup handovers will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pickups.map((p) => {
            const statusBadge = {
              requested: "bg-amber-100 text-amber-800 border-amber-200",
              scheduled: "bg-blue-100 text-blue-800 border-blue-200",
              picked_up: "bg-emerald-100 text-emerald-800 border-emerald-200",
              cancelled: "bg-slate-100 text-slate-600 border-slate-200",
            }[p.status];

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border tracking-wider ${statusBadge}`}>
                        {p.status.replace("_", " ")}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5">{p.surplus.foodName}</h3>
                      <p className="text-xs text-slate-500">
                        Quantity: <span className="font-bold text-slate-800">{p.surplus.quantity} {p.surplus.unit}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                      <span className="text-xs font-semibold text-slate-700 capitalize">{p.surplus.category.replace("_", " ")}</span>
                    </div>
                  </div>

                  {/* Donor Kitchen Location & Contact */}
                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 space-y-1.5 border border-slate-100 mt-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{p.surplus.kitchen.name}</span>
                    </div>
                    {p.surplus.kitchen.address && (
                      <div className="flex items-start gap-1.5 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{p.surplus.kitchen.address}</span>
                      </div>
                    )}
                    {p.surplus.kitchen.contactPhone && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.surplus.kitchen.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Logistics Timestamps */}
                  <div className="text-[11px] text-slate-500 space-y-1.5 pt-3">
                    <div className="flex justify-between">
                      <span>Requested Date:</span>
                      <span className="text-slate-800 font-medium">
                        {new Date(p.requestedAt).toLocaleString()}
                      </span>
                    </div>

                    {p.scheduledAt && (
                      <div className="flex justify-between">
                        <span>Scheduled Handover:</span>
                        <span className="text-blue-700 font-bold">
                          {new Date(p.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {p.pickedUpAt && (
                      <div className="flex justify-between">
                        <span>Collected At:</span>
                        <span className="text-emerald-700 font-bold">
                          {new Date(p.pickedUpAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Impact Summary (If completed) */}
                  {p.impact && (
                    <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-950">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 uppercase tracking-tight">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Impact Credited</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="bg-white/60 p-1.5 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">Food Saved</span>
                          <span className="font-bold text-emerald-800">{p.impact.foodSavedQuantity} kg</span>
                        </div>
                        <div className="bg-white/60 p-1.5 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">Meals</span>
                          <span className="font-bold text-emerald-800">{p.impact.estimatedMealsSaved}</span>
                        </div>
                        <div className="bg-white/60 p-1.5 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">CO2e Diverted</span>
                          <span className="font-bold text-emerald-800">{p.impact.estimatedCo2eAvoided} kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {p.notes && (
                    <div className="text-[11px] text-slate-500 italic pt-2">
                      Handover note: &ldquo;{p.notes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {(p.status === "scheduled" || p.status === "requested") && (
                      <button
                        type="button"
                        onClick={() => openCompleteModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Complete Handover</span>
                      </button>
                    )}

                    {p.signedProofUrl && (
                      <button
                        type="button"
                        onClick={() => openProofModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
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
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Complete Collection Handover</span>
              </h3>
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm food collection handover from <span className="font-bold text-slate-900">{activePickup.surplus.kitchen.name}</span>. This will finalize the transaction and credit verifiable impact.
            </p>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Proof Image Upload */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Upload Verification Proof (Photo)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {filePreview ? (
                    <div className="space-y-2">
                      <div className="relative h-32 w-full rounded-xl overflow-hidden bg-slate-100">
                        <Image
                          src={filePreview}
                          alt="Proof preview"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold block">
                        ✓ {selectedFile?.name} (Click to change)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                      <UploadCloud className="w-6 h-6 text-slate-400" />
                      <span className="font-semibold text-slate-700">Click to select handover photo</span>
                      <span className="text-[10px] text-slate-400">JPEG, PNG, WebP (Max 5MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Handover Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Collection Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Received in good chilled condition by volunteer Team A."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleSubmitAction}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Cancel Pickup Request?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling will inform the kitchen that you cannot collect this batch and make it available for other community receivers if time remains before the deadline.
            </p>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                Cancellation Reason (Optional)
              </label>
              <textarea
                rows={2}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g. Volunteer vehicle unavailable."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleSubmitAction}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Uploaded Handover Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video max-h-80">
              <Image
                src={activePickup.signedProofUrl}
                alt="Pickup Handover Proof"
                fill
                className="object-cover"
              />
            </div>

            <div className="text-[11px] text-slate-500 flex justify-between pt-2">
              <span>Donor Kitchen: {activePickup.surplus.kitchen.name}</span>
              <span>Completed: {activePickup.pickedUpAt ? new Date(activePickup.pickedUpAt).toLocaleString() : "N/A"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
