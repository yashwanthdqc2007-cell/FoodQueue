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
  MapPin,
  CheckCircle2,
  Building2,
  Phone,
  RefreshCw,
  Compass,
  Award,
} from "lucide-react";
import { RescueClock } from "@/components/kitchen/rescue-clock";
import { AiClassifyModal } from "@/components/kitchen/ai-classify-modal";
import { MapView, type MapMarkerLocation } from "@/components/shared/map-view";
import type { RescueClockResult } from "@/lib/rules/rescue-clock";
import type { RecoveryDecision } from "@/lib/rules/recovery-engine";

interface SurplusDetailPageProps {
  params: Promise<{ id: string }>;
}

interface MatchCandidate {
  matchId: string | null;
  rank: number;
  isTopRecommended: boolean;
  receiverId: string;
  organizationId?: string | null;
  receiverName: string;
  receiverType: string;
  address: string | null;
  contactPhone: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  maxCapacity: number;
  distanceKm?: number;
  finalScore: number;
  status: string;
  breakdown?: {
    distanceScore: number;
    quantityScore: number;
    urgencyScore: number;
    capacityScore: number;
    priorityScore: number;
    distanceKm: number;
  };
  explainableReasons: string[];
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
    latitude?: number | null;
    longitude?: number | null;
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
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [kitchenCoords, setKitchenCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matchErrorMsg, setMatchErrorMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const [surplusRes, matchesRes] = await Promise.all([
          fetch(`/api/surplus/${id}`),
          fetch(`/api/matching/${id}`),
        ]);

        const surplusJson = await surplusRes.json();
        const matchesJson = await matchesRes.json();

        if (!ignore) {
          if (!surplusRes.ok || surplusJson.error) {
            throw new Error(surplusJson.error?.message || "Failed to load surplus item");
          }
          setSurplus(surplusJson.data);

          if (matchesRes.ok && matchesJson.data?.matches) {
            setMatches(matchesJson.data.matches);
            if (matchesJson.data.kitchenCoordinates) {
              setKitchenCoords(matchesJson.data.kitchenCoordinates);
            }
          }
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

  async function handleGenerateMatches() {
    setIsGeneratingMatches(true);
    setMatchErrorMsg(null);
    try {
      const res = await fetch("/api/matching/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surplusId: id }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to generate matches");
      }

      setMatches(json.data.matches || []);
      if (json.data.kitchenCoordinates) {
        setKitchenCoords(json.data.kitchenCoordinates);
      }
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setMatchErrorMsg(err instanceof Error ? err.message : "Failed to run matching engine");
    } finally {
      setIsGeneratingMatches(false);
    }
  }

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

  const topMatch = matches.find((m) => m.isTopRecommended) || matches[0];

  // Map markers
  const originLocation = {
    name: surplus.kitchen?.name || "Origin Kitchen",
    latitude: kitchenCoords?.latitude || Number(surplus.kitchen?.latitude) || 13.0827,
    longitude: kitchenCoords?.longitude || Number(surplus.kitchen?.longitude) || 80.2707,
  };

  const destinationMarkers: MapMarkerLocation[] = matches
    .filter((m) => m.coordinates?.latitude && m.coordinates?.longitude)
    .map((m) => ({
      id: m.receiverId,
      name: m.receiverName,
      latitude: m.coordinates!.latitude,
      longitude: m.coordinates!.longitude,
      type: "receiver",
      score: m.finalScore,
      distanceKm: m.distanceKm,
      isTopRecommended: m.isTopRecommended,
    }));

  return (
    <div className="space-y-6 max-w-6xl">
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
            disabled={isGeneratingMatches || surplus.status !== "active"}
            onClick={handleGenerateMatches}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            {isGeneratingMatches ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Generate Receiver Matches</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
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

      {/* ============================================================ */}
      {/* PHASE 4: SMART MATCHING & REDISTRIBUTION SECTION */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Redistribution Matching &amp; Recommendations
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic multi-factor matching engine (Distance 40%, Quantity 25%, Urgency 20%, Capacity 10%, Priority 5%).
            </p>
          </div>

          <button
            type="button"
            disabled={isGeneratingMatches || surplus.status !== "active"}
            onClick={handleGenerateMatches}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 self-start sm:self-auto"
          >
            {isGeneratingMatches ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{matches.length > 0 ? "Regenerate Matches" : "Run Matching Engine"}</span>
          </button>
        </div>

        {matchErrorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {matchErrorMsg}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
            <Compass className="w-10 h-10 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No active matches generated yet</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Click &ldquo;Run Matching Engine&rdquo; to deterministically score and rank nearby verified receivers for this {surplus.quantity} {surplus.unit} {surplus.foodName} batch.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Recommended Receiver Highlight Banner */}
            {topMatch && (
              <div className="relative rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 sm:p-7 text-white shadow-lg overflow-hidden border border-purple-800">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black tracking-wide flex items-center gap-1 shadow-xs">
                        <Award className="w-3.5 h-3.5" />
                        <span>Recommended ✓</span>
                      </span>
                      <span className="text-xs text-purple-200 uppercase font-semibold">
                        Rank #1 Candidate
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight">
                        {topMatch.receiverName}
                      </h3>
                      <p className="text-xs text-purple-200/80 mt-0.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-300" />
                        <span className="capitalize">{topMatch.receiverType.replace("_", " ")}</span> &bull;{" "}
                        <MapPin className="w-3.5 h-3.5 text-purple-300" />
                        <span>{topMatch.address || "Chennai, Tamil Nadu"}</span>
                      </p>
                    </div>

                    {/* Rationale badges */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {topMatch.explainableReasons.map((r, i) => (
                        <span
                          key={i}
                          className="text-xs font-medium bg-white/10 border border-white/20 text-purple-100 px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{r}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Score Box */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center shrink-0 min-w-44">
                    <span className="text-[11px] uppercase font-bold text-purple-200 tracking-wider block">
                      Match Score
                    </span>
                    <div className="text-4xl font-black text-white mt-1">
                      {topMatch.finalScore}
                      <span className="text-base font-medium text-purple-300">/100</span>
                    </div>
                    <span className="inline-block text-[11px] text-emerald-300 font-bold mt-1">
                      {topMatch.distanceKm !== undefined ? `${topMatch.distanceKm} km transit` : "High Proximity"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Ranked Alternatives List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Ranked Redistribution Candidates ({matches.length})
              </h3>

              <div className="space-y-3">
                {matches.map((m) => (
                  <div
                    key={m.receiverId}
                    className={`p-4 sm:p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      m.isTopRecommended
                        ? "bg-purple-50/50 border-purple-200"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          m.isTopRecommended
                            ? "bg-purple-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {m.rank}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{m.receiverName}</h4>
                          {m.isTopRecommended && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              Top Recommendation
                            </span>
                          )}
                          <span className="text-xs text-slate-400 capitalize">
                            &bull; {m.receiverType.replace("_", " ")}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                          {m.distanceKm !== undefined && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{m.distanceKm} km away</span>
                            </span>
                          )}
                          <span>
                            Capacity: <strong className="text-slate-700">{m.maxCapacity} {surplus.unit}</strong>
                          </span>
                          {m.status && (
                            <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                              Status: {m.status}
                            </span>
                          )}
                        </div>

                        {/* Explainable snippets */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {m.explainableReasons.slice(0, 3).map((r, i) => (
                            <span
                              key={i}
                              className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                            >
                              ✓ {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-slate-100 sm:pl-5 shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
                      <span className="text-xs text-slate-400 font-semibold uppercase">Score</span>
                      <span className="text-2xl font-black text-purple-700">{m.finalScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map Visualization */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span>Geographic Redistribution Map</span>
                </span>
                <span className="text-xs text-slate-400">MapLibre GL JS</span>
              </div>

              <MapView
                origin={originLocation}
                destinations={destinationMarkers}
                height="380px"
              />
            </div>
          </div>
        )}
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

