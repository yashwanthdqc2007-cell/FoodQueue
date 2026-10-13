"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PackageOpen,
  Sparkles,
  AlertTriangle,
  Filter,
  PlusCircle,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { SurplusCard, SurplusCardItem } from "@/components/kitchen/surplus-card";
import { AiClassifyModal } from "@/components/kitchen/ai-classify-modal";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";

export default function KitchenSurplusHubPage() {
  const [items, setItems] = useState<SurplusCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeModalItem, setActiveModalItem] = useState<SurplusCardItem | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        let url = "/api/surplus?limit=100";
        if (statusFilter !== "all" && statusFilter !== "urgent") {
          url += `&status=${statusFilter}`;
        }
        if (categoryFilter !== "all") {
          url += `&category=${categoryFilter}`;
        }

        const res = await fetch(url);
        const json = await res.json();

        if (!ignore) {
          if (!res.ok || json.error) {
            throw new Error(json.error?.message || "Failed to load surplus items");
          }
          setItems(json.data.surplusItems || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Error fetching surplus records");
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
  }, [statusFilter, categoryFilter, refreshKey]);

  // Client-side filtering for urgency and text search
  const filteredItems = items.filter((item) => {
    if (statusFilter === "urgent") {
      if (item.rescueClock?.status !== "URGENT") return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.foodName.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      if (!matchName && !matchCategory) return false;
    }
    return true;
  });

  // KPI calculations
  const activeItems = items.filter((i) => i.status === "active");
  const urgentItems = activeItems.filter((i) => i.rescueClock?.status === "URGENT");
  const totalActiveQuantity = activeItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-mint">
              AI Surplus Intelligence
            </span>
            <span className="text-brand-border">&bull;</span>
            <span className="text-xs text-brand-muted font-medium">Multimodal Visual Safety &amp; Redistribution</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight">Surplus &amp; Food Rescue Hub</h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-0.5">
            Manage surplus batches, run multimodal food safety scans, and monitor live temperature-aware rescue clocks.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-muted hover:text-brand-text transition shadow-2xs"
            title="Refresh Surplus Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/kitchen/consumption"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Audit &amp; Log Leftovers</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Active Surplus Batches"
          value={activeItems.length}
          unit="batches"
          subtitle={`${totalActiveQuantity.toFixed(1)} kg available for rescue`}
          icon={PackageOpen}
          variant="forest"
        />

        <KpiCard
          title="Urgent Rescue Window"
          value={urgentItems.length}
          unit="urgent"
          subtitle="≤ 60 minutes remaining before expiry"
          icon={AlertTriangle}
          variant="amber"
        />

        <KpiCard
          title="AI Visually Verified"
          value={items.filter((i) => i.aiConfidence && i.aiConfidence > 0).length}
          unit={`/ ${items.length} total`}
          subtitle="Multimodal safety classification executed"
          icon={Sparkles}
          variant="violet"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            placeholder="Search by food or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-brand-border text-xs font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card placeholder:text-brand-muted/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-brand-muted font-bold">
            <Filter className="w-3.5 h-3.5 text-brand-muted" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-brand-border text-xs font-bold text-brand-text bg-brand-card focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="urgent">Urgent (≤ 60m)</option>
            <option value="expired">Expired</option>
            <option value="recovered">Recovered</option>
            <option value="disposed">Disposed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-brand-border text-xs font-bold text-brand-text bg-brand-card focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="all">All Categories</option>
            <option value="edible_surplus">Edible Surplus</option>
            <option value="reusable">Reusable</option>
            <option value="organic">Organic</option>
            <option value="unsafe">Unsafe</option>
            <option value="unknown">Unclassified</option>
          </select>
        </div>
      </div>

      {/* Grid of Surplus Cards */}
      {isLoading ? (
        <div className="bg-brand-surface border border-brand-border rounded-3xl p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          <span className="text-xs font-semibold text-brand-muted">Loading surplus inventory &amp; rescue clocks...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-6 text-center text-xs text-rose-300">
          <span>{errorMsg}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No Surplus Batches Found"
          description={
            searchQuery || statusFilter !== "all" || categoryFilter !== "all"
              ? "No items match your active search filters."
              : "No surplus batches recorded yet. When a meal has leftovers, declare them in post-service consumption recording."
          }
          action={{
            label: "Audit Past Meal",
            href: "/kitchen/consumption",
            icon: PlusCircle,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <SurplusCard
              key={item.id}
              item={item}
              onOpenAiScan={(selected) => setActiveModalItem(selected)}
            />
          ))}
        </div>
      )}

      {/* AI Visual Classification Modal */}
      {activeModalItem && (
        <AiClassifyModal
          surplusId={activeModalItem.id}
          foodName={activeModalItem.foodName}
          existingImagePath={activeModalItem.imagePath}
          existingSignedUrl={activeModalItem.signedImageUrl}
          existingCategory={activeModalItem.category}
          existingConfidence={activeModalItem.aiConfidence}
          onClose={() => setActiveModalItem(null)}
          onSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
