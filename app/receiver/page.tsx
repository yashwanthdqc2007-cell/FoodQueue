"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
  Package,
  HeartHandshake,
  Building2,
  Calendar,
  AlertCircle,
  Truck,
  Info,
  MapPin,
  Map,
  Grid3X3,
  UtensilsCrossed,
  Croissant,
  Flame,
} from "lucide-react";
import { OpportunityCard, type OpportunityItem } from "@/components/receiver/opportunity-card";
import { EmptyState } from "@/components/ui/empty-state";
import { MapView, type MapMarkerLocation } from "@/components/shared/map-view";

interface ReceiverMeta {
  id: string;
  verified: boolean;
  maxCapacity: number;
  receiverType: string;
  organizationName: string;
  coordinates?: { latitude: number; longitude: number } | null;
}

export default function ReceiverDashboardPage() {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [receiverMeta, setReceiverMeta] = useState<ReceiverMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"recommended" | "all">("recommended");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function fetchOpportunities() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/receiver/opportunities?status=${filterTab}`);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load opportunities");
          }
          setOpportunities(json.data.opportunities || []);
          if (json.data.receiver) {
            setReceiverMeta(json.data.receiver);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching opportunities");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchOpportunities();

    return () => {
      ignore = true;
    };
  }, [filterTab, refreshKey]);

  // Filtered opportunities by search and category
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((item) => {
      // Category filter
      if (categoryFilter === "urgent") {
        if (item.rescueClock.status !== "URGENT" || item.rescueClock.isExpired) return false;
      } else if (categoryFilter === "high_match") {
        if (item.matchScore < 80) return false;
      } else if (categoryFilter !== "all") {
        if (item.category !== categoryFilter) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.foodName.toLowerCase().includes(q);
        const matchesKitchen = item.kitchen.name.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        if (!matchesName && !matchesKitchen && !matchesCategory) return false;
      }

      return true;
    });
  }, [opportunities, categoryFilter, searchQuery]);

  const activeCount = opportunities.filter(
    (o) => o.status === "recommended" && !o.rescueClock.isExpired
  ).length;

  const urgentCount = opportunities.filter(
    (o) => o.status === "recommended" && o.rescueClock.status === "URGENT" && !o.rescueClock.isExpired
  ).length;

  // Prepare map coordinates for candidate kitchens
  const mapOrigin = useMemo(() => {
    if (receiverMeta?.coordinates?.latitude && receiverMeta?.coordinates?.longitude) {
      return {
        name: receiverMeta.organizationName,
        latitude: receiverMeta.coordinates.latitude,
        longitude: receiverMeta.coordinates.longitude,
      };
    }
    // Fallback if receiver coordinates are missing: use first opportunity kitchen or default
    const firstWithCoords = opportunities.find(
      (o) => o.kitchen.coordinates?.latitude && o.kitchen.coordinates?.longitude
    );
    if (firstWithCoords?.kitchen.coordinates) {
      return {
        name: firstWithCoords.kitchen.name,
        latitude: firstWithCoords.kitchen.coordinates.latitude,
        longitude: firstWithCoords.kitchen.coordinates.longitude,
      };
    }
    return { name: "City Center Hub", latitude: 12.9716, longitude: 77.5946 };
  }, [receiverMeta, opportunities]);

  const mapDestinations: MapMarkerLocation[] = useMemo(() => {
    return opportunities
      .filter((o) => o.kitchen.coordinates?.latitude && o.kitchen.coordinates?.longitude)
      .map((o) => ({
        id: o.surplusId,
        name: `${o.foodName} (${o.kitchen.name})`,
        latitude: o.kitchen.coordinates!.latitude,
        longitude: o.kitchen.coordinates!.longitude,
        type: "kitchen",
        score: o.matchScore,
        isTopRecommended: o.matchScore >= 85,
      }));
  }, [opportunities]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-brand-text">
      {/* Food Discovery Header */}
      <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-violet/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-violet-light text-brand-violet border border-brand-violet/30 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Surplus Discovery</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-brand-text">
              Discover Food to Rescue
            </h1>
            <p className="text-brand-muted text-xs sm:text-sm max-w-xl leading-relaxed">
              Explore eligible surplus batches from nearby institutional kitchens, screened for quality, capacity limits, and safe rescue windows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/receiver/pickups"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-violet text-brand-forest-dark hover:bg-brand-violet/90 text-xs font-extrabold shadow-md transition"
            >
              <Calendar className="w-4 h-4" />
              <span>Scheduled Pickups</span>
            </Link>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand-surface hover:bg-brand-card border border-brand-border text-brand-text text-xs font-bold transition shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-brand-border/60">
          <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border">
            <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider block">
              Available Matches
            </span>
            <span className="text-2xl sm:text-3xl font-black text-brand-text mt-1 block">{activeCount}</span>
          </div>

          <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border">
            <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider block">
              Urgent Rescues
            </span>
            <span className="text-2xl sm:text-3xl font-black text-brand-amber mt-1 block">{urgentCount}</span>
          </div>

          <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border col-span-2 sm:col-span-1">
            <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider block">
              Redistribution Engine
            </span>
            <span className="text-xs font-bold text-brand-primary mt-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Factor Proximity Match</span>
            </span>
          </div>
        </div>
      </div>

      {/* Receiver Readiness & Organization Context Bar */}
      {receiverMeta && (
        <div className="glass-card bg-brand-card border border-brand-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-brand-violet-light text-brand-violet border border-brand-violet/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-brand-text">{receiverMeta.organizationName}</h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-surface text-brand-muted capitalize border border-brand-border">
                  {receiverMeta.receiverType}
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-3">
                <span>Intake Capacity: <strong className="text-brand-text font-bold">{receiverMeta.maxCapacity} kg/batch</strong></span>
              </p>
            </div>
          </div>

          <div>
            {receiverMeta.verified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Partner Organization</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/70 text-amber-300 border border-amber-700/50 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Pending Admin Verification</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unverified Warning if applicable */}
      {!receiverMeta?.verified && receiverMeta && (
        <div className="bg-amber-950/50 border border-amber-800/60 rounded-2xl p-4 text-xs text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Account Verification in Progress</span>
          </div>
          <p className="leading-relaxed text-amber-300/90">
            Your intake capacity and organization credentials are under review by system administrators. You can browse surplus feeds, but match acceptance unlocks immediately upon administrator approval.
          </p>
        </div>
      )}

      {/* Search, Category Filters & View Toggle Bar */}
      <div className="glass-card bg-brand-card border border-brand-border rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search food name, kitchen, or meal type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-violet text-xs font-medium text-brand-text placeholder:text-brand-muted/60"
            />
          </div>

          {/* View Mode Toggle: Grid vs Map */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="p-1 rounded-xl bg-brand-surface border border-brand-border flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "grid"
                    ? "bg-brand-violet text-brand-forest-dark shadow-xs"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "map"
                    ? "bg-brand-violet text-brand-forest-dark shadow-xs"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills & Scope Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-brand-border/60">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              categoryFilter === "all"
                ? "bg-brand-violet text-brand-forest-dark shadow-xs"
                : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            All Categories ({opportunities.length})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("edible_surplus")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              categoryFilter === "edible_surplus"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Cooked Meals</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("reusable")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              categoryFilter === "reusable"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            <Croissant className="w-3.5 h-3.5" />
            <span>Bakery &amp; Pantry</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("urgent")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              categoryFilter === "urgent"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-brand-amber" />
            <span>Urgent ({urgentCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter("high_match")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              categoryFilter === "high_match"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>High Score (80+)</span>
          </button>
        </div>
      </div>

      {/* Map View Rendering */}
      {viewMode === "map" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-brand-muted">
            <span className="font-bold flex items-center gap-1.5 text-brand-text">
              <MapPin className="w-4 h-4 text-brand-violet" />
              <span>Kitchen Proximity Radar</span>
            </span>
            <span>{mapDestinations.length} mapped kitchen sources</span>
          </div>
          <MapView
            origin={mapOrigin}
            destinations={mapDestinations}
            height="420px"
          />
        </div>
      )}

      {/* Main Feed Content */}
      {isLoading ? (
        <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3 shadow-md">
          <Loader2 className="w-8 h-8 animate-spin text-brand-violet" />
          <span className="text-xs font-bold text-brand-muted">
            Querying real-time institutional surplus food marketplace...
          </span>
        </div>
      ) : errorMsg ? (
        <div className="bg-brand-red-light border border-brand-red/30 rounded-2xl p-6 text-center text-xs text-brand-red">
          {errorMsg}
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title={searchQuery ? "No matches found" : "No food available to rescue right now"}
          description={
            searchQuery
              ? `No surplus batches match your search for "${searchQuery}". Try clearing filters.`
              : "When partner institutional kitchens declare edible surplus food compatible with your intake criteria, matched batches will appear here automatically."
          }
          action={{
            label: searchQuery ? "Clear Search Filters" : "View Accepted Matches",
            onClick: searchQuery
              ? () => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }
              : undefined,
            href: searchQuery ? undefined : "/receiver/matches",
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredOpportunities.map((item) => (
            <OpportunityCard
              key={item.matchId}
              opportunity={item}
              onActionComplete={() => setRefreshKey((k) => k + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
