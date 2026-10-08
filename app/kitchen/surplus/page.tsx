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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              AI Surplus Intelligence
            </span>
            <span className="text-xs text-slate-400 font-mono">Automated Visual Analysis &amp; Redistribution</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Surplus &amp; Food Rescue Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage surplus batches, run Gemini Vision classification, and track real-time food rescue clocks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Surplus Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/kitchen/consumption"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Audit &amp; Log Leftovers</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
            <PackageOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Active Surplus Batches</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {activeItems.length}{" "}
              <span className="text-xs font-normal text-slate-500">({totalActiveQuantity.toFixed(1)} kg total)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Urgent Rescue Batches</span>
            <div className="text-2xl font-black text-amber-700 mt-0.5">
              {urgentItems.length}{" "}
              <span className="text-xs font-normal text-slate-500">(&le; 60m remaining)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-100 text-purple-700">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">AI Visual Inspected</span>
            <div className="text-2xl font-black text-purple-900 mt-0.5">
              {items.filter((i) => i.aiConfidence && i.aiConfidence > 0).length} / {items.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by food or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="urgent">Urgent (&le; 60m)</option>
            <option value="expired">Expired</option>
            <option value="recovered">Recovered</option>
            <option value="disposed">Disposed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-xs font-semibold text-slate-600">Loading surplus inventory &amp; rescue clocks...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-700">
          <span>{errorMsg}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-2">
          <PackageOpen className="w-10 h-10 text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">No surplus records found</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
              ? "No items match your active search filters."
              : "No surplus batches recorded yet. When a meal has leftovers, declare them in post-service consumption recording."}
          </p>
        </div>
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
