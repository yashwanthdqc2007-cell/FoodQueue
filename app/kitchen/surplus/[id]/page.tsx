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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

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
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-16 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        <span className="text-xs font-semibold text-brand-muted">Loading surplus batch details &amp; intelligence...</span>
      </div>
    );
  }

  if (errorMsg || !surplus) {
    return (
      <div className="bg-brand-red/10 border border-brand-red/25 rounded-2xl p-8 text-center text-xs text-brand-red space-y-3 max-w-xl mx-auto my-12">
        <p className="font-bold">{errorMsg || "Surplus item not found"}</p>
        <Link
          href="/kitchen/surplus"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-forest text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Surplus Hub</span>
        </Link>
      </div>
    );
  }

  const categoryBadgeVariant: Record<string, any> = {
    edible_surplus: "edible",
    reusable: "reusable",
    organic: "organic_waste",
    unsafe: "unsafe",
    unknown: "default",
  };

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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <PageHeader
        title={surplus.foodName}
        description={`${surplus.kitchen?.name || "Kitchen Facility"} • Reported at ${new Date(surplus.reportedAt).toLocaleString()}`}
        backHref="/kitchen/surplus"
        backLabel="Back to Surplus Hub"
        badge={
          <div className="flex items-center gap-2">
            <Badge variant={categoryBadgeVariant[surplus.category] || "default"} size="md">
              {surplus.category.replace("_", " ")}
            </Badge>
            <Badge variant="forest" size="md">
              Status: {surplus.status.toUpperCase()}
            </Badge>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isGeneratingMatches || surplus.status !== "active"}
              onClick={handleGenerateMatches}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-violet hover:bg-[#523FA0] text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-forest hover:bg-brand-forest-dark text-white text-xs font-bold shadow-xs transition"
            >
              <Sparkles className="w-4 h-4 text-brand-mint" />
              <span>{surplus.aiConfidence ? "Re-Inspect with Gemini" : "Analyze Photo with AI"}</span>
            </button>
          </div>
        }
      />

      {/* Grid: Visual Intelligence & Decision Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Provenance & AI Visual Inspection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo & Storage Card */}
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <span className="text-xs font-extrabold text-brand-text uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-primary" />
                <span>Private Food Image Record</span>
              </span>
              <span className="text-[11px] text-brand-muted font-mono">Storage: private food-images</span>
            </div>

            {surplus.signedImageUrl ? (
              <div className="relative rounded-2xl border border-brand-border overflow-hidden bg-brand-card aspect-video max-h-80 shadow-xs">
                <Image
                  src={surplus.signedImageUrl}
                  alt={surplus.foodName}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-brand-border rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-2.5 bg-brand-card/40">
                <Utensils className="w-10 h-10 text-brand-muted opacity-40" />
                <span className="text-xs font-bold text-brand-text">No image uploaded for this batch</span>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="text-xs font-bold text-brand-mint hover:underline mt-1"
                >
                  Upload photo to enable multimodal AI verification
                </button>
              </div>
            )}
          </div>

          {/* Gemini AI Visual Assessment Card */}
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <span className="text-xs font-extrabold text-brand-mint uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-mint" />
                <span>Multimodal AI Vision Assessment</span>
              </span>
              {surplus.aiConfidence ? (
                <Badge variant="violet" size="sm">
                  {Math.round(surplus.aiConfidence * 100)}% Confidence
                </Badge>
              ) : (
                <Badge variant="muted" size="sm">
                  Not Scanned
                </Badge>
              )}
            </div>

            {/* Advisory Safety Warning */}
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-amber-300">AI Visual Boundary Notice:</span> {surplus.advisoryNotice}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-brand-card rounded-xl border border-brand-border">
                <span className="text-[10px] uppercase font-bold text-brand-muted block mb-1">Visual Observation Notes</span>
                <p className="text-brand-text leading-relaxed font-medium">
                  {surplus.notes || "No notes recorded yet."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Rescue Clock & Decision Engine */}
        <div className="space-y-6">
          {/* Rescue Clock */}
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-4">
            <span className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-2 border-b border-brand-border pb-3">
              <Clock className="w-4 h-4 text-brand-primary" />
              <span>Food Rescue Clock</span>
            </span>

            <RescueClock
              deadlineIso={surplus.redistributionDeadline}
              initialClock={surplus.rescueClock}
            />

            <div className="text-xs text-brand-muted space-y-2 pt-3 border-t border-brand-border font-medium">
              <div className="flex justify-between">
                <span>Declared Quantity:</span>
                <strong className="text-brand-text">{surplus.quantity} {surplus.unit}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cooking Time:</span>
                <span className="text-brand-text">
                  {surplus.preparedAt ? new Date(surplus.preparedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Unspecified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Safe Rescue Deadline:</span>
                <span className="text-brand-text">
                  {surplus.redistributionDeadline ? new Date(surplus.redistributionDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Unspecified"}
                </span>
              </div>
            </div>
          </div>

          {/* Deterministic Recovery Decision Engine */}
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-4">
            <span className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-2 border-b border-brand-border pb-3">
              <PackageCheck className="w-4 h-4 text-brand-primary" />
              <span>Recovery Engine Decision</span>
            </span>

            <div className={`p-4 rounded-xl text-xs font-bold uppercase tracking-wider text-center text-white shadow-2xs ${
              surplus.recoveryDecision.path === "REDISTRIBUTE"
                ? "bg-brand-primary"
                : surplus.recoveryDecision.path === "RECOVERY"
                ? "bg-amber-600"
                : "bg-rose-600"
            }`}>
              {surplus.recoveryDecision.path}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 bg-brand-card rounded-xl border border-brand-border">
                <span className="text-[10px] uppercase font-bold text-brand-muted block mb-1">Engine Summary</span>
                <p className="text-brand-text leading-relaxed font-medium">{surplus.recoveryDecision.summary}</p>
              </div>

              <div className="p-3.5 bg-brand-card rounded-xl border border-brand-primary/30 text-brand-text">
                <span className="text-[10px] uppercase font-bold text-brand-mint block mb-1">Recommended Action</span>
                <p className="font-bold">{surplus.recoveryDecision.actionRecommendation}</p>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md space-y-3">
            <span className="text-xs font-bold text-brand-text uppercase tracking-wider block border-b border-brand-border pb-3">
              Operational Status Control
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isUpdatingStatus || surplus.status === "active"}
                onClick={() => handleUpdateStatus("active")}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-brand-primary/30 bg-brand-primary/20 text-brand-mint hover:bg-brand-primary hover:text-white transition disabled:opacity-40"
              >
                Set Active
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || surplus.status === "recovered"}
                onClick={() => handleUpdateStatus("recovered")}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-amber-600/30 bg-amber-950/30 text-amber-300 hover:bg-amber-600 hover:text-white transition disabled:opacity-40"
              >
                Mark Recovered
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || surplus.status === "expired"}
                onClick={() => handleUpdateStatus("expired")}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-brand-border bg-brand-card text-brand-muted hover:bg-brand-surface hover:text-brand-text transition disabled:opacity-40"
              >
                Mark Expired
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus || surplus.status === "disposed"}
                onClick={() => handleUpdateStatus("disposed")}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-rose-600/30 bg-rose-950/30 text-rose-300 hover:bg-rose-600 hover:text-white transition disabled:opacity-40"
              >
                Mark Disposed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Matching & Map View */}
      <div className="glass-card bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-brand-primary/20 text-brand-mint">
                <Sparkles className="w-5 h-5 text-brand-mint" />
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-brand-text tracking-tight">
                Redistribution Matching &amp; Recommendations
              </h2>
            </div>
            <p className="text-xs text-brand-muted">
              Deterministic multi-factor matching engine (Distance 40%, Quantity 25%, Urgency 20%, Capacity 10%, Priority 5%).
            </p>
          </div>

          <button
            type="button"
            disabled={isGeneratingMatches || surplus.status !== "active"}
            onClick={handleGenerateMatches}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-xs transition disabled:opacity-50 self-start sm:self-auto"
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
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300">
            {matchErrorMsg}
          </div>
        )}

        {matches.length === 0 ? (
          <div className="border-2 border-dashed border-brand-border rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 bg-brand-card/40">
            <Compass className="w-10 h-10 text-brand-muted opacity-40" />
            <h3 className="text-sm font-bold text-brand-text">No active matches generated yet</h3>
            <p className="text-xs text-brand-muted max-w-md">
              Click &ldquo;Run Matching Engine&rdquo; to deterministically score and rank nearby verified receivers for this {surplus.quantity} {surplus.unit} {surplus.foodName} batch.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Recommended Receiver Highlight Banner */}
            {topMatch && (
              <div className="relative rounded-3xl bg-gradient-to-r from-brand-card via-brand-surface to-[#162d22] p-6 sm:p-8 text-brand-text shadow-md overflow-hidden border border-brand-border">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-full bg-brand-mint text-brand-bg text-xs font-black tracking-wide flex items-center gap-1 shadow-xs">
                        <Award className="w-3.5 h-3.5" />
                        <span>Recommended ✓</span>
                      </span>
                      <span className="text-xs text-brand-mint uppercase font-bold tracking-wider">
                        Rank #1 Candidate
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight">
                        {topMatch.receiverName}
                      </h3>
                      <p className="text-xs text-brand-muted mt-1 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-brand-mint" />
                        <span className="capitalize">{topMatch.receiverType.replace("_", " ")}</span> &bull;{" "}
                        <MapPin className="w-3.5 h-3.5 text-brand-mint" />
                        <span>{topMatch.address || "Chennai, Tamil Nadu"}</span>
                      </p>
                    </div>

                    {/* Rationale badges */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {topMatch.explainableReasons.map((r, i) => (
                        <span
                          key={i}
                          className="text-xs font-semibold bg-brand-surface/80 border border-brand-border text-brand-text px-3 py-1 rounded-xl backdrop-blur-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint" />
                          <span>{r}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Score Box */}
                  <div className="bg-brand-surface/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-brand-border text-center shrink-0 min-w-44">
                    <span className="text-[11px] uppercase font-bold text-brand-muted tracking-wider block">
                      Match Compatibility
                    </span>
                    <div className="text-4xl font-black text-brand-mint mt-1">
                      {topMatch.finalScore}
                      <span className="text-base font-semibold text-brand-muted">/100</span>
                    </div>
                    <span className="inline-block text-[11px] text-brand-text font-bold mt-1">
                      {topMatch.distanceKm !== undefined ? `${topMatch.distanceKm} km transit` : "High Proximity"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Ranked Alternatives List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider">
                Ranked Redistribution Candidates ({matches.length})
              </h3>

              <div className="space-y-3">
                {matches.map((m) => (
                  <div
                    key={m.receiverId}
                    className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      m.isTopRecommended
                        ? "bg-brand-card border-brand-primary/40 shadow-xs"
                        : "bg-brand-card/60 border-brand-border hover:border-brand-primary/30"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                          m.isTopRecommended
                            ? "bg-brand-primary text-white"
                            : "bg-brand-surface text-brand-text border border-brand-border"
                        }`}
                      >
                        {m.rank}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-brand-text">{m.receiverName}</h4>
                          {m.isTopRecommended && (
                            <Badge variant="primary" size="sm">
                              Top Recommendation
                            </Badge>
                          )}
                          <span className="text-xs text-brand-muted capitalize">
                            &bull; {m.receiverType.replace("_", " ")}
                          </span>
                        </div>

                        <div className="text-xs text-brand-muted flex flex-wrap items-center gap-3">
                          {m.distanceKm !== undefined && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                              <span>{m.distanceKm} km away</span>
                            </span>
                          )}
                          <span>
                            Capacity: <strong className="text-brand-text">{m.maxCapacity} {surplus.unit}</strong>
                          </span>
                          {m.status && (
                            <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded-full bg-brand-surface text-brand-muted border border-brand-border font-bold">
                              {m.status}
                            </span>
                          )}
                        </div>

                        {/* Explainable snippets */}
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {m.explainableReasons.slice(0, 3).map((r, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-medium text-brand-text bg-brand-surface px-2.5 py-0.5 rounded-lg border border-brand-border"
                            >
                              ✓ {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:border-brand-border sm:pl-6 shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
                      <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Score</span>
                      <span className="text-2xl font-black text-brand-mint">{m.finalScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map Visualization */}
            <div className="space-y-3 pt-6 border-t border-brand-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  <span>Geographic Redistribution Map</span>
                </span>
                <span className="text-xs text-brand-muted font-semibold">MapLibre GL Vector Engine</span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-brand-border shadow-xs">
                <MapView
                  origin={originLocation}
                  destinations={destinationMarkers}
                  height="400px"
                />
              </div>
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
