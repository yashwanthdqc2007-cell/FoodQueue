"use client";

import { useState } from "react";
import { PackagePlus, AlertCircle, CheckCircle2, Clock, X, Loader2 } from "lucide-react";

interface SurplusHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (surplusId: string) => void;
  kitchenId: string;
  sourceMealId: string;
  mealName: string;
  leftoverQuantity: number;
  unit: string;
}

export function SurplusHandoffModal({
  isOpen,
  onClose,
  onSuccess,
  kitchenId,
  sourceMealId,
  mealName,
  leftoverQuantity,
  unit,
}: SurplusHandoffModalProps) {
  const [foodName, setFoodName] = useState(mealName);
  const [quantity, setQuantity] = useState(leftoverQuantity);
  const [hoursValid, setHoursValid] = useState("4");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const deadline = new Date(Date.now() + Number(hoursValid) * 60 * 60 * 1000).toISOString();

      const response = await fetch("/api/surplus/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchenId,
          sourceMealId,
          foodName,
          quantity: Number(quantity),
          unit,
          preparedAt: new Date().toISOString(),
          redistributionDeadline: deadline,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error?.message || "Failed to initialize surplus handoff");
      }

      onSuccess(json.data.id);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Surplus handoff failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Declare Food Surplus</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hand off leftover food to the redistribution pipeline
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Food Item Name</label>
            <input
              type="text"
              required
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Surplus Quantity</label>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
                <span className="bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 border-l border-slate-300">
                  {unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rescue Window (Hours)</label>
              <select
                value={hoursValid}
                onChange={(e) => setHoursValid(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="2">2 Hours (Hot Food)</option>
                <option value="4">4 Hours (Standard Safe Window)</option>
                <option value="8">8 Hours (Chilled / Dry)</option>
                <option value="24">24 Hours (Packaged)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preparation / Storage Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Cooked at 1:00 PM, stored in stainless steel insulated container."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            ></textarea>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Create Surplus Handoff</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
