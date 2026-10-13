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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-brand-surface rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-brand-border relative animate-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-brand-muted hover:text-brand-text p-1.5 rounded-xl hover:bg-brand-card transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-3 rounded-2xl bg-brand-primary/20 text-brand-mint shadow-2xs">
            <PackagePlus className="w-6 h-6 text-brand-mint" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-brand-text">Declare Food Surplus</h3>
            <p className="text-xs text-brand-muted font-medium mt-0.5">
              Hand off leftover food to the smart redistribution network
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-text mb-1.5">Food Item Name</label>
            <input
              type="text"
              required
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-card text-xs text-brand-text placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-brand-text mb-1.5">Surplus Quantity</label>
              <div className="flex rounded-xl border border-brand-border overflow-hidden focus-within:ring-2 focus-within:ring-brand-primary">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs text-brand-text bg-brand-card focus:outline-none font-bold"
                />
                <span className="bg-brand-surface px-3.5 py-2.5 text-xs font-bold text-brand-muted border-l border-brand-border">
                  {unit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text mb-1.5">Rescue Window (Hours)</label>
              <select
                value={hoursValid}
                onChange={(e) => setHoursValid(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border text-xs text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary bg-brand-card font-medium"
              >
                <option value="2">2 Hours (Hot Food)</option>
                <option value="4">4 Hours (Standard Safe Window)</option>
                <option value="8">8 Hours (Chilled / Dry)</option>
                <option value="24">24 Hours (Packaged)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-text mb-1.5">Preparation / Storage Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Cooked at 1:00 PM, stored in stainless steel insulated container."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-card text-xs text-brand-text placeholder-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            ></textarea>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-text hover:bg-brand-card transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold transition disabled:opacity-50 shadow-xs"
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
