"use client";

import React, { useState } from "react";
import {
  ChefHat,
  HeartHandshake,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Building2,
  UtensilsCrossed,
  RotateCcw,
  Loader2,
  Lock,
  Scale,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Truck,
  Camera,
  Leaf,
  DollarSign,
  Activity,
  Info,
  Check,
  Search,
  Timer,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface WorkspaceOnboardingProps {
  initialRequestedWorkspace?: "kitchen" | "receiver" | null;
  userEmail: string;
  userFullName?: string | null;
  assignedRole: string;
}

export function WorkspaceOnboarding({
  initialRequestedWorkspace,
  userEmail,
  userFullName,
  assignedRole,
}: WorkspaceOnboardingProps) {
  const toast = useToast();
  const [selectedChoice, setSelectedChoice] = useState<"kitchen" | "receiver">(
    initialRequestedWorkspace || "kitchen"
  );
  const [confirmedChoice, setConfirmedChoice] = useState<"kitchen" | "receiver" | null>(
    initialRequestedWorkspace || null
  );
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<"kitchen" | "receiver">(
    initialRequestedWorkspace || "kitchen"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(!initialRequestedWorkspace);
  const [showFaqModal, setShowFaqModal] = useState(false);

  async function handleConfirmChoice(choice: "kitchen" | "receiver") {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/request-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: choice }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to record preference");
      }

      setConfirmedChoice(choice);
      setSelectedChoice(choice);
      setActiveShowcaseTab(choice);
      setIsEditing(false);
      toast.success(
        `Workspace request for ${choice === "kitchen" ? "Kitchen / Food Donor" : "Receiver / Community Partner"} saved.`,
        "Request Submitted"
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error saving request",
        "Submission Failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isConfirmed = Boolean(confirmedChoice && !isEditing);
  const activeIntent = isConfirmed ? confirmedChoice! : selectedChoice;

  return (
    <div className="space-y-10 w-full pb-16">
      {/* 1. COMPACT ACCOUNT IDENTITY & REQUESTED WORKSPACE HEADER */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* User Profile Avatar & Metadata */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-forest/40 border border-brand-primary/40 text-brand-mint flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              {userFullName?.[0]?.toUpperCase() || userEmail[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-brand-text tracking-tight">
                  {userFullName || "FoodQueue Member"}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-brand-card text-brand-muted border border-brand-border">
                  Unassigned Account
                </span>
              </div>
              <p className="text-xs text-brand-muted mt-0.5 font-medium">{userEmail}</p>
            </div>
          </div>

          {/* Requested Intent Status Pill & Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 p-2 px-3.5 rounded-2xl bg-brand-card border border-brand-border">
              <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                Requested Intent:
              </span>
              {confirmedChoice === "kitchen" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-mint">
                  <ChefHat className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Kitchen / Food Donor</span>
                </span>
              ) : confirmedChoice === "receiver" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-violet">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Community Receiver</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-brand-amber flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Selecting Workspace...</span>
                </span>
              )}
            </div>

            {isConfirmed && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setSelectedChoice(confirmedChoice!);
                  setActiveShowcaseTab(confirmedChoice!);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-muted hover:text-brand-text text-xs font-bold transition shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Change Request</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFaqModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-muted hover:text-brand-text text-xs font-bold transition shadow-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-brand-primary" />
              <span>Onboarding Help</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ONBOARDING PROGRESS INDICATOR (4 CLEAR STAGES) */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Account Onboarding Journey
            </span>
            <h2 className="text-lg font-extrabold text-brand-text mt-0.5">
              Workspace Activation Progress
            </h2>
          </div>
          <span className="text-xs text-brand-muted font-medium">
            Step {isConfirmed ? "3 of 4" : "2 of 4"}: {isConfirmed ? "Awaiting Assignment" : "Select Workspace"}
          </span>
        </div>

        {/* 4-Step Stepper Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Step 1: Account Created */}
          <div className="p-4 rounded-2xl bg-brand-card border border-brand-border flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/20 text-brand-primary border border-brand-primary/40 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-mint">
                Stage 1 &bull; Complete
              </span>
              <div className="text-xs font-bold text-brand-text mt-0.5">Account Created</div>
              <p className="text-[11px] text-brand-muted mt-0.5">
                Authentication verified &amp; profile enrolled
              </p>
            </div>
          </div>

          {/* Step 2: Workspace Request Submitted */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${
            isConfirmed
              ? "bg-brand-card border-brand-border"
              : "bg-brand-primary/10 border-brand-primary/40 ring-1 ring-brand-primary/30"
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isConfirmed
                ? "bg-brand-primary/20 text-brand-primary border border-brand-primary/40"
                : "bg-brand-primary text-brand-bg font-black"
            }`}>
              {isConfirmed ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                isConfirmed ? "text-brand-mint" : "text-brand-primary animate-pulse"
              }`}>
                Stage 2 &bull; {isConfirmed ? "Submitted" : "Action Required"}
              </span>
              <div className="text-xs font-bold text-brand-text mt-0.5">Workspace Request</div>
              <p className="text-[11px] text-brand-muted mt-0.5">
                {isConfirmed
                  ? `${confirmedChoice === "kitchen" ? "Kitchen Donor" : "Receiver NGO"} choice logged`
                  : "Choose intended operational workspace"}
              </p>
            </div>
          </div>

          {/* Step 3: Administrator Assignment */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isConfirmed
              ? "bg-amber-950/20 border-amber-600/40 ring-1 ring-amber-500/20"
              : "bg-brand-card/50 border-brand-border text-brand-muted/70"
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isConfirmed
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-brand-surface text-brand-muted border border-brand-border"
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                isConfirmed ? "text-amber-400" : "text-brand-muted"
              }`}>
                Stage 3 &bull; {isConfirmed ? "Pending Approval" : "Next"}
              </span>
              <div className="text-xs font-bold text-brand-text mt-0.5">Admin Role Linkage</div>
              <p className="text-[11px] text-brand-muted mt-0.5">
                Administrator assigns authorized facility
              </p>
            </div>
          </div>

          {/* Step 4: Operational Workspace Accessible */}
          <div className="p-4 rounded-2xl bg-brand-card/40 border border-brand-border flex items-start gap-3 text-brand-muted">
            <div className="w-8 h-8 rounded-xl bg-brand-surface text-brand-muted border border-brand-border flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-muted">
                Stage 4 &bull; Locked
              </span>
              <div className="text-xs font-bold text-brand-text mt-0.5">Workspace Activated</div>
              <p className="text-[11px] text-brand-muted mt-0.5">
                Operational dashboards become available
              </p>
            </div>
          </div>
        </div>

        {/* Clear Status Message Banner */}
        <div className="p-4 rounded-2xl bg-brand-card border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-brand-primary shrink-0" />
            <p className="text-brand-text font-medium leading-relaxed">
              {isConfirmed
                ? "Your workspace request has been saved. An administrator must approve your access and assign your organization before operational features become available."
                : "Select an operational workspace below to log your request. Platform administrators review and link verified institutional facilities."}
            </p>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE SELECTION INTERFACE (CHOICE A vs CHOICE B) */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-brand-text tracking-tight">
              {isConfirmed ? "Requested Workspace" : "Select Your Operational Workspace"}
            </h2>
            <p className="text-xs text-brand-muted mt-0.5">
              {isConfirmed
                ? "Your intent has been logged. You can review the preview showcase below or change your selection."
                : "Choose how you intend to participate in the surplus food rescue and redistribution network."}
            </p>
          </div>
        </div>

        {/* Two Selectable Workspace Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* CHOICE A: Kitchen / Food Donor */}
          <div
            onClick={() => {
              setSelectedChoice("kitchen");
              setActiveShowcaseTab("kitchen");
            }}
            className={`cursor-pointer rounded-3xl p-6 sm:p-7 border transition-all duration-200 relative flex flex-col justify-between group ${
              selectedChoice === "kitchen"
                ? "bg-brand-surface border-brand-primary ring-2 ring-brand-primary/30 shadow-xl"
                : "bg-brand-surface/70 hover:bg-brand-surface border-brand-border hover:border-brand-primary/40 shadow-sm"
            }`}
          >
            {selectedChoice === "kitchen" && (
              <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-brand-primary text-brand-bg flex items-center justify-center font-bold text-xs shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-forest/40 text-brand-mint border border-brand-primary/40 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ChefHat className="w-7 h-7 text-brand-primary" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                  Choice A &bull; Food Donor
                </span>
                <h3 className="text-xl font-extrabold text-brand-text mt-1">
                  Kitchen / Food Donor
                </h3>
                <p className="text-xs text-brand-muted mt-2 leading-relaxed">
                  I manage an institutional kitchen and want to plan meals, track leftovers and share eligible surplus food.
                </p>
              </div>

              {/* Key Highlights */}
              <div className="space-y-2 pt-3 border-t border-brand-border text-xs text-brand-muted">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span>Meal demand forecasting with preparation buffers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span>Post-service consumption mass-balance audit logging</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span>AI surplus photo classification &amp; rescue clock</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedChoice("kitchen");
                  setActiveShowcaseTab("kitchen");
                  handleConfirmChoice("kitchen");
                }}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  confirmedChoice === "kitchen" && !isEditing
                    ? "bg-brand-forest text-brand-mint border border-brand-primary/40 cursor-default"
                    : selectedChoice === "kitchen"
                    ? "bg-brand-primary hover:bg-brand-primary-hover text-brand-bg font-extrabold shadow-md"
                    : "bg-brand-card hover:bg-brand-surface border border-brand-border text-brand-text"
                }`}
              >
                {isSubmitting && selectedChoice === "kitchen" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : confirmedChoice === "kitchen" && !isEditing ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                ) : (
                  <UtensilsCrossed className="w-4 h-4" />
                )}
                <span>
                  {confirmedChoice === "kitchen" && !isEditing
                    ? "Current Request (Kitchen)"
                    : "I manage a kitchen"}
                </span>
              </button>
            </div>
          </div>

          {/* CHOICE B: Receiver / Community Organization */}
          <div
            onClick={() => {
              setSelectedChoice("receiver");
              setActiveShowcaseTab("receiver");
            }}
            className={`cursor-pointer rounded-3xl p-6 sm:p-7 border transition-all duration-200 relative flex flex-col justify-between group ${
              selectedChoice === "receiver"
                ? "bg-brand-surface border-brand-violet ring-2 ring-brand-violet/30 shadow-xl"
                : "bg-brand-surface/70 hover:bg-brand-surface border-brand-border hover:border-brand-violet/40 shadow-sm"
            }`}
          >
            {selectedChoice === "receiver" && (
              <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-brand-violet text-brand-bg flex items-center justify-center font-bold text-xs shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-violet/15 text-brand-violet border border-brand-violet/30 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-7 h-7 text-brand-violet" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-violet">
                  Choice B &bull; Community Receiver
                </span>
                <h3 className="text-xl font-extrabold text-brand-text mt-1">
                  Receiver / Community Organization
                </h3>
                <p className="text-xs text-brand-muted mt-2 leading-relaxed">
                  I represent an NGO, shelter or community organization and want to discover eligible food-rescue opportunities.
                </p>
              </div>

              {/* Key Highlights */}
              <div className="space-y-2 pt-3 border-t border-brand-border text-xs text-brand-muted">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-violet" />
                  <span>Real-time proximity surplus food marketplace feed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-violet" />
                  <span>Explainable compatibility score &amp; intake capacity matching</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-violet" />
                  <span>Digital collection tokens &amp; verified handover proof</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedChoice("receiver");
                  setActiveShowcaseTab("receiver");
                  handleConfirmChoice("receiver");
                }}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  confirmedChoice === "receiver" && !isEditing
                    ? "bg-brand-violet/20 text-brand-violet border border-brand-violet/40 cursor-default"
                    : selectedChoice === "receiver"
                    ? "bg-brand-violet hover:bg-brand-violet/90 text-brand-bg font-extrabold shadow-md"
                    : "bg-brand-card hover:bg-brand-surface border border-brand-border text-brand-text"
                }`}
              >
                {isSubmitting && selectedChoice === "receiver" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : confirmedChoice === "receiver" && !isEditing ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-violet" />
                ) : (
                  <HeartHandshake className="w-4 h-4" />
                )}
                <span>
                  {confirmedChoice === "receiver" && !isEditing
                    ? "Current Request (Receiver)"
                    : "I receive food donations"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. WORKSPACE-SPECIFIC FEATURE SHOWCASE */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                Product Showcase
              </span>
              <span className="text-brand-border">&bull;</span>
              <span className="text-xs font-medium text-brand-muted">
                Available After Facility Assignment
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-brand-text tracking-tight">
              {activeShowcaseTab === "kitchen"
                ? "Kitchen Operational Suite & Redistribution Engine"
                : "Community Receiver Discovery Marketplace"}
            </h2>
          </div>

          {/* Toggle Showcase Tab Buttons */}
          <div className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-2xl border border-brand-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveShowcaseTab("kitchen")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeShowcaseTab === "kitchen"
                  ? "bg-brand-primary text-brand-bg shadow-xs"
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen Donor Preview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveShowcaseTab("receiver")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeShowcaseTab === "receiver"
                  ? "bg-brand-violet text-brand-bg shadow-xs"
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Receiver Preview</span>
            </button>
          </div>
        </div>

        {/* Dynamic Showcase Grid */}
        {activeShowcaseTab === "kitchen" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Capability K1: Smart Meal Planning */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-forest/40 border border-brand-primary/40 text-brand-mint flex items-center justify-center shadow-xs">
                    <Calendar className="w-5 h-5 text-brand-primary" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-card text-brand-mint border border-brand-border">
                    Available After Approval
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">
                    Smart Meal Planning &amp; Demand Forecasting
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    Forecast diner turnout using our deterministic baseline model (<code className="text-brand-mint">mvp-baseline-v1</code>) combining 7-day trends, weekday history, and period averages.
                  </p>
                </div>
              </div>

              {/* Mini-Interface Preview */}
              <div className="p-4 rounded-2xl bg-brand-card border border-brand-border space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                  <span className="text-[11px] font-bold text-brand-text flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Deterministic Forecast Engine</span>
                  </span>
                  <span className="text-[10px] text-brand-mint font-semibold bg-brand-forest/30 px-2 py-0.5 rounded-full border border-brand-forest/60">
                    Confidence: 88%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-brand-surface border border-brand-border">
                    <span className="text-[10px] text-brand-muted block font-semibold">Predicted</span>
                    <strong className="text-sm font-black text-brand-text">320 pax</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-brand-surface border border-brand-border">
                    <span className="text-[10px] text-brand-muted block font-semibold">Portion Ratio</span>
                    <strong className="text-sm font-black text-brand-text">0.40 kg</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-brand-surface border border-brand-border">
                    <span className="text-[10px] text-brand-muted block font-semibold">Prep Target</span>
                    <strong className="text-sm font-black text-brand-primary">140.8 kg</strong>
                  </div>
                </div>
                <div className="text-[10px] text-brand-muted italic text-center">
                  Illustrative preview — not live data &bull; Includes 10% cold-start safety buffer
                </div>
              </div>
            </div>

            {/* Capability K2: Consumption Mass-Balance Auditing */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-forest/40 border border-brand-primary/40 text-brand-mint flex items-center justify-center shadow-xs">
                    <Scale className="w-5 h-5 text-brand-primary" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-card text-brand-mint border border-brand-border">
                    Available After Approval
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">
                    Post-Service Consumption Mass-Balance
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    Verify physical conservation of mass after every dining shift: <code className="text-brand-mint font-semibold">Prepared = Consumed + Leftovers</code>. Trains forecasting models automatically.
                  </p>
                </div>
              </div>

              {/* Mini-Interface Preview */}
              <div className="p-4 rounded-2xl bg-brand-card border border-brand-border space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                  <span className="text-[11px] font-bold text-brand-text flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Mass-Balance Verification</span>
                  </span>
                  <span className="text-[10px] text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded-full border border-brand-primary/20">
                    Balanced &bull; 0.00 Residual
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-brand-surface border border-brand-border text-center">
                  <div>
                    <span className="text-[10px] text-brand-muted block">Prepared</span>
                    <strong className="text-xs font-bold text-brand-text">140 kg</strong>
                  </div>
                  <span className="text-brand-muted font-bold">=</span>
                  <div>
                    <span className="text-[10px] text-brand-muted block">Consumed</span>
                    <strong className="text-xs font-bold text-brand-text">122 kg</strong>
                  </div>
                  <span className="text-brand-muted font-bold">+</span>
                  <div>
                    <span className="text-[10px] text-brand-amber block">Leftovers</span>
                    <strong className="text-xs font-black text-brand-amber">18 kg</strong>
                  </div>
                </div>
                <div className="text-[10px] text-brand-muted italic text-center">
                  Illustrative preview — not live data &bull; Auto-triggers surplus handoff flow
                </div>
              </div>
            </div>

            {/* Capability K3: Surplus Batch Declaration & AI Vision */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-forest/40 border border-brand-primary/40 text-brand-mint flex items-center justify-center shadow-xs">
                    <Camera className="w-5 h-5 text-brand-primary" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-card text-brand-mint border border-brand-border">
                    Available After Approval
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">
                    Surplus Declaration &amp; Advisory AI Vision
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    Declare surplus batches with food photos, category classification, dynamic countdown rescue clocks, and advisory AI inspection.
                  </p>
                </div>
              </div>

              {/* Mini-Interface Preview */}
              <div className="p-4 rounded-2xl bg-brand-card border border-brand-border space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2 border-b border-brand-border/60 pb-2">
                  <div>
                    <strong className="text-brand-text font-bold text-xs block">
                      Steamed Basmati Rice &amp; Mixed Dal
                    </strong>
                    <span className="text-[10px] text-brand-muted">
                      Batch ID: #SR-8492 &bull; 18.0 kg &bull; Cooked Meals
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-amber text-brand-bg flex items-center gap-1 shadow-xs">
                    <Timer className="w-3 h-3" />
                    <span>42m Rescue Window</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-between text-[11px]">
                  <span className="text-brand-violet font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Advisory Tag: Cooked Meals (94% conf.)</span>
                  </span>
                  <span className="text-brand-muted text-[10px]">Ready for Match</span>
                </div>
                <div className="text-[10px] text-brand-muted italic text-center">
                  Illustrative preview — not live data &bull; Advisory only; human safety checks enforced
                </div>
              </div>
            </div>

            {/* Capability K4: Receiver Matching & ESG Impact */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-forest/40 border border-brand-primary/40 text-brand-mint flex items-center justify-center shadow-xs">
                    <Activity className="w-5 h-5 text-brand-primary" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-card text-brand-mint border border-brand-border">
                    Available After Approval
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">
                    Smart Receiver Matching &amp; Impact
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    Dispatch surplus recommendations to verified local shelters based on proximity and intake capacity, tracking real ESG impact metrics.
                  </p>
                </div>
              </div>

              {/* Mini-Interface Preview */}
              <div className="p-4 rounded-2xl bg-brand-card border border-brand-border space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                  <span className="text-[11px] font-bold text-brand-text flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Top Match: Hope Shelter Foundation</span>
                  </span>
                  <span className="text-[10px] text-brand-mint font-bold bg-brand-forest/30 px-2 py-0.5 rounded-full border border-brand-forest/60">
                    94/100 Score &bull; 1.8 km
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-brand-surface border border-brand-border">
                    <span className="text-[10px] text-brand-muted block font-semibold">Estimated Meals</span>
                    <strong className="text-xs font-black text-brand-primary">45 Meals</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-brand-surface border border-brand-border">
                    <span className="text-[10px] text-brand-muted block font-semibold">Estimated CO₂e Saved</span>
                    <strong className="text-xs font-black text-brand-mint">28.0 kg CO₂e</strong>
                  </div>
                </div>
                <div className="text-[10px] text-brand-muted italic text-center">
                  Illustrative preview — not live data &bull; Standard 0.4 kg/meal conversion applied
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Capability R1: Discover Food to Rescue */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-violet/15 border border-brand-violet/30 text-brand-violet flex items-center justify-center shadow-xs">
                    <Search className="w-5 h-5 text-brand-violet" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-card text-brand-violet border border-brand-violet/30">
                    Available After Approval
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">
                    Discover Food to Rescue
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    Browse active surplus listings from verified institutional kitchens with real-time urgency countdowns, category filters, and proximity details.
                  </p>
                </div>
              </div>

              {/* Mini-Interface Preview */}
              <div className="p-4 rounded-2xl bg-brand-card border border-brand-border space-y-3 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-brand-violet text-brand-bg font-bold">All</span>
                  <span className="px-2 py-0.5 rounded-lg bg-brand-surface text-brand-text font-semibold border border-brand-border">Cooked Meals</span>
                  <span className="px-2 py-0.5 rounded-lg bg-brand-surface text-brand-text font-semibold border border-brand-border">Bakery</span>
                  <span className="px-2 py-0.5 rounded-lg bg-brand-surface text-brand-text font-semibold border border-brand-border">Urgent (&lt;60m)</span>
                </div>
                <div className="p-3 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-brand-text font-bold text-xs block">
                      Fresh Vegetable Biryani &amp; Raita
                    </strong>
                    <span className="text-[10px] text-brand-muted">
                      Central Campus Mess &bull; 42 kg &bull; 2.1 km away
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-amber text-brand-bg flex items-center gap-1 shrink-0">
                    <Timer className="w-3 h-3" />
                    <span>54m left</span>
                  </span>
                </div>
                <div className="text-[10px] text-brand-muted italic text-center">
                  Illustrative preview — not live data &bull; Filterable by distance and intake limit
                </div>
              </div>
            </div>

            {/* Capability R2: Smart Match Recommendations */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-violet/15 border border-brand-violet/30 text-brand-violet flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5 text-brand-violet" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-card text-brand-violet border border-brand-violet/30">
                    Available After Approval
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">
                    Smart Match Recommendations
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    Explainable compatibility scoring balances your shelter&apos;s batch intake limit, geographical proximity, accepted food categories, and rescue urgency.
                  </p>
                </div>
              </div>

              {/* Mini-Interface Preview */}
              <div className="p-4 rounded-2xl bg-brand-card border border-brand-border space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                  <span className="text-[11px] font-bold text-brand-text flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-violet" />
                    <span>Match Suitability Score</span>
                  </span>
                  <span className="text-[10px] text-brand-violet font-black bg-brand-violet/15 px-2.5 py-0.5 rounded-full border border-brand-violet/30">
                    96% Compatibility
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] text-brand-muted">
                  <div className="flex justify-between items-center">
                    <span>Proximity Score:</span>
                    <strong className="text-brand-text">2.1 km (Top Radius)</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Intake Fit:</span>
                    <strong className="text-brand-text">42 kg batch fits 100 kg capacity</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Priority Level:</span>
                    <strong className="text-brand-violet">Tier 1 Community Partner</strong>
                  </div>
                </div>
                <div className="text-[10px] text-brand-muted italic text-center">
                  Illustrative preview — not live data &bull; Fully explainable deterministic scoring
                </div>
              </div>
            </div>

            {/* Capability R3: Pickup Coordination & Handover Proof */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-violet/15 border border-brand-violet/30 text-brand-violet flex items-center justify-center shadow-xs">
                    <Truck className="w-5 h-5 text-brand-violet" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-card text-brand-violet border border-brand-violet/30">
                    Available After Approval
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">
                    Pickup Coordination &amp; Handover Proof
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    Coordinate collections through an audited state machine (<code className="text-brand-violet font-semibold">requested &rarr; scheduled &rarr; picked_up</code>) with private photo proof uploads.
                  </p>
                </div>
              </div>

              {/* Mini-Interface Preview */}
              <div className="p-4 rounded-2xl bg-brand-card border border-brand-border space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                  <span className="text-[11px] font-bold text-brand-text">
                    Collection Task #PK-4921
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary text-brand-bg">
                    Scheduled (Ready)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-brand-surface border border-brand-border text-[11px]">
                  <div>
                    <span className="text-brand-muted block text-[10px]">Target Handover</span>
                    <strong className="text-brand-text font-bold">Today, 15:30</strong>
                  </div>
                  <div>
                    <span className="text-brand-muted block text-[10px]">Verification Token</span>
                    <strong className="text-brand-mint font-mono font-bold">#FQ-8492</strong>
                  </div>
                  <div>
                    <span className="text-brand-muted block text-[10px]">Proof Upload</span>
                    <span className="text-brand-primary font-semibold">Camera Ready</span>
                  </div>
                </div>
                <div className="text-[10px] text-brand-muted italic text-center">
                  Illustrative preview — not live data &bull; Stored securely in private bucket
                </div>
              </div>
            </div>

            {/* Capability R4: Food Rescue Impact & ESG Analytics */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-violet/15 border border-brand-violet/30 text-brand-violet flex items-center justify-center shadow-xs">
                    <Leaf className="w-5 h-5 text-brand-violet" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-card text-brand-violet border border-brand-violet/30">
                    Available After Approval
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-brand-text">
                    Audited Food Rescue Impact
                  </h3>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    Quantify recovered nutrition, avoided landfill emissions, and economic community value using canonical conversions (0.4 kg/meal, 2.5 kg CO₂e/kg).
                  </p>
                </div>
              </div>

              {/* Mini-Interface Preview */}
              <div className="p-4 rounded-2xl bg-brand-card border border-brand-border space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-brand-surface border border-brand-border">
                    <span className="text-[10px] text-brand-muted block font-semibold">Meals Supported</span>
                    <strong className="text-sm font-black text-brand-primary">210</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-brand-surface border border-brand-border">
                    <span className="text-[10px] text-brand-muted block font-semibold">CO₂e Avoided</span>
                    <strong className="text-sm font-black text-brand-mint">210 kg</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-brand-surface border border-brand-border">
                    <span className="text-[10px] text-brand-muted block font-semibold">Value Saved</span>
                    <strong className="text-sm font-black text-brand-violet">₹12,600</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-brand-surface border border-brand-border text-center text-[10px] text-brand-muted">
                  Audited from 84.0 kg qualifying food collections &bull; ESG reporting ready
                </div>
                <div className="text-[10px] text-brand-muted italic text-center">
                  Illustrative preview — not live data &bull; Zero fabricated numbers
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. VISUAL END-TO-END WORKFLOW SECTION */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
            End-to-End Redistribution Architecture
          </span>
          <h2 className="text-xl font-extrabold text-brand-text mt-1">
            How FoodQueue Rescues Surplus Food
          </h2>
          <p className="text-xs text-brand-muted mt-1 max-w-2xl leading-relaxed">
            From deterministic prep planning to certified community handover, FoodQueue integrates commercial kitchens and community organizations into one continuous recovery cycle.
          </p>
        </div>

        {/* 6-Step Workflow Chain */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Workflow Step 1 */}
          <div className="p-4 rounded-2xl bg-brand-card border border-brand-border flex flex-col justify-between space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-primary bg-brand-forest/40 w-5 h-5 rounded-md flex items-center justify-center">1</span>
              <Calendar className="w-4 h-4 text-brand-muted group-hover:text-brand-primary transition-colors" />
            </div>
            <div>
              <strong className="text-xs font-bold text-brand-text block">Meal Planning</strong>
              <p className="text-[11px] text-brand-muted mt-1 leading-snug">
                Forecast demand &amp; calculate preparation buffers
              </p>
            </div>
          </div>

          {/* Workflow Step 2 */}
          <div className="p-4 rounded-2xl bg-brand-card border border-brand-border flex flex-col justify-between space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-primary bg-brand-forest/40 w-5 h-5 rounded-md flex items-center justify-center">2</span>
              <Scale className="w-4 h-4 text-brand-muted group-hover:text-brand-primary transition-colors" />
            </div>
            <div>
              <strong className="text-xs font-bold text-brand-text block">Consumption Audit</strong>
              <p className="text-[11px] text-brand-muted mt-1 leading-snug">
                Log diner counts &amp; mass-balance leftovers
              </p>
            </div>
          </div>

          {/* Workflow Step 3 */}
          <div className="p-4 rounded-2xl bg-brand-card border border-brand-border flex flex-col justify-between space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-primary bg-brand-forest/40 w-5 h-5 rounded-md flex items-center justify-center">3</span>
              <Camera className="w-4 h-4 text-brand-muted group-hover:text-brand-primary transition-colors" />
            </div>
            <div>
              <strong className="text-xs font-bold text-brand-text block">Surplus Declaration</strong>
              <p className="text-[11px] text-brand-muted mt-1 leading-snug">
                Photo classification &amp; rescue deadline countdown
              </p>
            </div>
          </div>

          {/* Workflow Step 4 */}
          <div className="p-4 rounded-2xl bg-brand-card border border-brand-border flex flex-col justify-between space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-primary bg-brand-forest/40 w-5 h-5 rounded-md flex items-center justify-center">4</span>
              <Sparkles className="w-4 h-4 text-brand-muted group-hover:text-brand-primary transition-colors" />
            </div>
            <div>
              <strong className="text-xs font-bold text-brand-text block">Receiver Match</strong>
              <p className="text-[11px] text-brand-muted mt-1 leading-snug">
                Proximity, capacity &amp; urgency matching engine
              </p>
            </div>
          </div>

          {/* Workflow Step 5 */}
          <div className="p-4 rounded-2xl bg-brand-card border border-brand-border flex flex-col justify-between space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-primary bg-brand-forest/40 w-5 h-5 rounded-md flex items-center justify-center">5</span>
              <Truck className="w-4 h-4 text-brand-muted group-hover:text-brand-primary transition-colors" />
            </div>
            <div>
              <strong className="text-xs font-bold text-brand-text block">Pickup Handover</strong>
              <p className="text-[11px] text-brand-muted mt-1 leading-snug">
                Scheduled collection &amp; signed photo evidence
              </p>
            </div>
          </div>

          {/* Workflow Step 6 */}
          <div className="p-4 rounded-2xl bg-brand-card border border-brand-border flex flex-col justify-between space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-primary bg-brand-forest/40 w-5 h-5 rounded-md flex items-center justify-center">6</span>
              <Activity className="w-4 h-4 text-brand-muted group-hover:text-brand-primary transition-colors" />
            </div>
            <div>
              <strong className="text-xs font-bold text-brand-text block">Impact Reporting</strong>
              <p className="text-[11px] text-brand-muted mt-1 leading-snug">
                Canonical ESG metrics: meals &amp; CO₂e footprint
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-brand-card border border-brand-border text-center text-xs text-brand-muted">
          <span className="text-brand-text font-semibold">Security Boundary:</span> Users will gain access to the relevant operational capabilities after the required role and organization assignment is completed by an authorized administrator.
        </div>
      </div>

      {/* 6. WHAT HAPPENS NEXT? SECTION */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
            Next Action Guide
          </span>
          <h2 className="text-xl font-extrabold text-brand-text mt-1">
            What Happens Next?
          </h2>
          <p className="text-xs text-brand-muted mt-1">
            Understand the onboarding verification procedure while your workspace access is pending.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-brand-card border border-brand-border space-y-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/20 text-brand-primary border border-brand-primary/40 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <strong className="text-xs font-bold text-brand-text block">
              Administrator Reviews Request
            </strong>
            <p className="text-xs text-brand-muted leading-relaxed">
              A designated institution or community administrator reviews your registered identity and requested workspace intent in the secure governance console.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-brand-card border border-brand-border space-y-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/20 text-brand-primary border border-brand-primary/40 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <strong className="text-xs font-bold text-brand-text block">
              Facility Linkage &amp; Role Grant
            </strong>
            <p className="text-xs text-brand-muted leading-relaxed">
              The administrator binds your account to an authorized operating facility (institutional mess or verified receiver NGO) and grants operational credentials.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-brand-card border border-brand-border space-y-2">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/20 text-brand-primary border border-brand-primary/40 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <strong className="text-xs font-bold text-brand-text block">
              Operational Workspace Unlocks
            </strong>
            <p className="text-xs text-brand-muted leading-relaxed">
              Once provisioned, your next visit to FoodQueue automatically routes to your dedicated kitchen or receiver portal with real-time operations enabled.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-brand-border/60 text-xs">
          <div className="text-brand-muted">
            Need faster provisioning? Contact your campus facility manager or NGO program director to approve your account.
          </div>
          <button
            type="button"
            onClick={() => setShowFaqModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-card hover:bg-brand-surface border border-brand-border text-brand-text text-xs font-bold transition shadow-xs self-start sm:self-auto"
          >
            <HelpCircle className="w-4 h-4 text-brand-primary" />
            <span>Read Onboarding FAQ</span>
          </button>
        </div>
      </div>

      {/* 7. FAQ MODAL */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-brand-border pb-3.5">
              <h3 className="text-base font-extrabold text-brand-text flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-primary" />
                <span>FoodQueue Onboarding FAQ</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="text-brand-muted hover:text-brand-text p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-brand-muted">
              <div className="p-3.5 rounded-2xl bg-brand-card border border-brand-border space-y-1">
                <strong className="text-brand-text block">Why is administrative verification required?</strong>
                <p className="leading-relaxed">
                  FoodQueue handles perishable institutional surplus for community consumption. Strict chain-of-custody, liability compliance, and verified receiver capacity require authorized facility linkage.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-card border border-brand-border space-y-1">
                <strong className="text-brand-text block">Can I change my requested workspace?</strong>
                <p className="leading-relaxed">
                  Yes! Click &quot;Change Request&quot; on your onboarding dashboard at any time before an administrator assigns your final role.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-card border border-brand-border space-y-1">
                <strong className="text-brand-text block">Does selecting a choice grant permissions?</strong>
                <p className="leading-relaxed">
                  No. Selecting a workspace only expresses your request intent. Roles and organization bindings remain strictly administrator-controlled under Supabase Row Level Security.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-card border border-brand-border space-y-1">
                <strong className="text-brand-text block">What if I am already an administrator?</strong>
                <p className="leading-relaxed">
                  Platform administrators automatically gain access to the global administrative console (<code className="text-brand-mint">/admin</code>) upon sign-in.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-brand-border">
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg text-xs font-bold transition shadow-xs"
              >
                Close FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
