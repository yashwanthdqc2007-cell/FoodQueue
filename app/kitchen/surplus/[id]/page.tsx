"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Sparkles,
  Utensils,
  Clock,
  ShieldCheck,
  PackageCheck,
  Layers,
  Loader2,
} from "lucide-react";
import { RescueClock } from "@/components/kitchen/rescue-clock";
import { AiClassifyModal } from "@/components/kitchen/ai-classify-modal";
import type { RescueClockResult } from "@/lib/rules/rescue-clock";
import type { RecoveryDecision } from "@/lib/rules/recovery-engine";

interface SurplusDetailPageProps {
  params: Promise<{ id: string }>;
}

interface SurplusDetail {
  id: string;
  kitchenId: string;
  sourceMealId: string | null;
  foodName: string;
  quantity: number;
  unit: string;
  preparedAt: string | null;
  reportedAt: string;
  redistributionDeadline: string | null;
  status: "active" | "matched" | "pickup_pending" | "picked_up" | "expired" | "recovered" | "disposed";
  category: "edible_surplus" | "reusable" | "organic" | "unsafe" | "unknown";
  aiConfidence: number | null;
  imagePath: string | null;
  signedImageUrl: string | null;
  notes: string | null;
  createdAt: string;
  kitchen?: {
    id: string;
    name: string;
    address: string | null;
    timezone: string;
  } | null;
  sourceMeal?: {
    id: string;
    mealName: string;
    mealDate: string;
    mealPeriod: string;
    plannedQuantity: number;
    unit: string;
  } | null;
  rescueClock: RescueClockResult;
  recoveryDecision: RecoveryDecision;
  advisoryNotice: string;
}

export default function SurplusDetailPage({ params }: SurplusDetailPageProps) {
  const { id } = use(params);

  const [surplus, setSurplus] = useState<SurplusDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/surplus/${id}`);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load surplus item");
          }
          setSurplus(json.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching surplus details");
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
  }, [id, refreshKey]);

  async function handleUpdateStatus(newStatus: string) {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/surplus/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to update surplus status");
      }

      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-xs font-semibold text-slate-600">Loading surplus item details &amp; intelligence...</span>
      </div>
    );
  }

  if (errorMsg || !surplus) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-700 space-y-3">
        <p>{errorMsg || "Surplus item not found"}</p>
        <Link
          href="/kitchen/surplus"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Surplus Hub</span>
        </Link>
      </div>
    );
  }

  const categoryColor = {
    edible_surplus: "bg-emerald-100 text-emerald-800 border-emerald-200",
    reusable: "bg-blue-100 text-blue-800 border-blue-200",
    organic: "bg-amber-100 text-amber-800 border-amber-200",
    unsafe: "bg-rose-100 text-rose-800 border-rose-200",
    unknown: "bg-slate-100 text-slate-700 border-slate-200",
  }[surplus.category] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/kitchen/surplus"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Surplus Hub</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">Surplus ID: {surplus.id.slice(0, 8)}</span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0 mt-1">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs uppercase font-bold px-2.5 py-0.5 rounded-md border ${categoryColor}`}>
                {surplus.category.replace("_", " ")}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-mono">
                Status: <span className="font-bold uppercase text-slate-800">{surplus.status}</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{surplus.foodName}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {surplus.kitchen?.name || "Kitchen Facility"} &bull; Reported at {new Date(surplus.reportedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>{surplus.aiConfidence ? "Re-Inspect with Gemini" : "Analyze Photo with AI"}</span>
          </button>
        </div>
      </div>

      {/* Grid: Visual Intelligence & Decision Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Provenance & AI Visual Inspection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo & Storage Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Private Food Image Record</span>
              </span>
              <span className="text-[11px] text-slate-400">Bucket: food-images (Private)</span>
            </div>

            {surplus.signedImageUrl ? (
              <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video max-h-80">
                <Image
                  src={surplus.signedImageUrl}
                  alt={surplus.foodName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
                <Utensils className="w-8 h-8 text-slate-300" />
                <span className="text-xs font-semibold text-slate-700">No image uploaded for this batch</span>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="text-xs font-bold text-purple-700 hover:underline mt-1"
                >
                  Upload photo to enable AI analysis
                </button>
              </div>
            )}
          </div>

          {/* Gemini AI Visual Assessment Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 uppercase tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Gemini Vision Assessment</span>
              </span>
              {surplus.aiConfidence ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {Math.round(surplus.aiConfidence * 100)}% Confidence
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                  Not Scanned
                </span>
              )}
            </div>

            {/* Advisory Safety Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">AI Visual Assessment:</span> {surplus.advisoryNotice}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Observation Notes</span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {surplus.notes || "No notes recorded yet."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Rescue Clock & Decision Engine */}
        <div className="space-y-6">
          {/* Rescue Clock */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Food Rescue Clock</span>
            </span>

            <RescueClock
              deadlineIso={surplus.redistributionDeadline}
              initialClock={surplus.rescueClock}
            />

            <div className="text-[11px] text-slate-500 space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Quantity Logged:</span>
                <span className="font-bold text-slate-800">{surplus.quantity} {surplus.unit}</span>
              </div>
              <div className="flex justify-between">
                <span>Prepared At:</span>
                <span className="text-slate-800">
                  {surplus.preparedAt ? new Date(surplus.preparedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Unspecified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Deadline:</span>
                <span className="text-slate-800">
                  {surplus.redistributionDeadline ? new Date(surplus.redistributionDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Unspecified"}
                </span>
              </div>
            </div>
          </div>

          {/* Deterministic Recovery Decision Engine */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>Recovery Engine Decision</span>
            </span>

            <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider text-center text-white ${
              surplus.recoveryDecision.path === "REDISTRIBUTE"
                ? "bg-emerald-600"
                : surplus.recoveryDecision.path === "RECOVERY"
                ? "bg-amber-600"
                : "bg-rose-600"
            }`}>
              {surplus.recoveryDecision.path}
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Engine Summary</span>
                <p className="text-slate-700">{surplus.recoveryDecision.summary}</p>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-950">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">Recommended Action</span>
                <p className="font-semibold">{surplus.recoveryDecision.actionRecommendation}</p>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
              Operational Status Control
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isUpdatingStatus || surplus.status === "active"}
                onClick={() => handleUpdateStatus("active")}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition disabled:opacity-40"
              >
                Set Active
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || surplus.status === "recovered"}
                onClick={() => handleUpdateStatus("recovered")}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition disabled:opacity-40"
              >
                Mark Recovered
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || surplus.status === "expired"}
                onClick={() => handleUpdateStatus("expired")}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
              >
                Mark Expired
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || surplus.status === "disposed"}
                onClick={() => handleUpdateStatus("disposed")}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 transition disabled:opacity-40"
              >
                Mark Disposed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {isAiModalOpen && (
        <AiClassifyModal
          surplusId={surplus.id}
          foodName={surplus.foodName}
          existingImagePath={surplus.imagePath}
          existingSignedUrl={surplus.signedImageUrl}
          existingCategory={surplus.category}
          existingConfidence={surplus.aiConfidence}
          onClose={() => setIsAiModalOpen(false)}
          onSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
