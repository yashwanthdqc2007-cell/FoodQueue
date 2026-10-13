import Link from "next/link";
import { FoodQueueLogo } from "@/components/brand/foodqueue-logo";
import {
  ChefHat,
  HeartHandshake,
  Shield,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
  TrendingDown,
  Scale,
  MapPin,
  Leaf,
  Clock,
  CheckCircle2,
  PackageCheck,
  Eye,
  Activity,
  Layers,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col text-brand-text selection:bg-brand-primary selection:text-brand-forest-dark">
      {/* Top Brand Navigation */}
      <header className="border-b border-brand-border bg-brand-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FoodQueueLogo href="/" variant="full" width={185} height={48} priority />
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-brand-primary-light text-brand-primary border border-brand-primary/30 hidden sm:inline-block">
              Surplus Food Rescue
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-brand-text hover:bg-brand-card transition border border-transparent hover:border-brand-border"
            >
              <LogIn className="w-4 h-4 text-brand-muted" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-forest-dark text-xs sm:text-sm font-extrabold shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Get Started</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-brand-primary-light text-brand-primary border border-brand-primary/30 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Institutional Surplus Identification &amp; Redistribution</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-brand-text leading-[1.08]">
            Good food deserves a{" "}
            <span className="bg-gradient-to-r from-brand-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              second chance.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-brand-muted max-w-2xl mx-auto leading-relaxed">
            Connect institutional kitchens with community organizations to identify, match and coordinate surplus-food recovery in real time.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-brand-primary hover:bg-brand-primary-hover text-brand-forest-dark font-extrabold text-sm transition shadow-lg hover:shadow-xl"
            >
              <span>Join Food Rescue Network</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-brand-border bg-brand-card hover:bg-brand-surface text-brand-text font-bold text-sm transition shadow-sm"
            >
              <LogIn className="w-4 h-4 text-brand-muted" />
              <span>Portal Sign In</span>
            </Link>
          </div>
        </div>

        {/* 2 Entry Pathways: Kitchens & Community Receivers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 sm:mt-20 max-w-5xl mx-auto w-full">
          {/* Pathway 1: Kitchens */}
          <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-7 sm:p-8 relative overflow-hidden group hover:border-brand-primary/40 transition">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-brand-primary-light text-brand-primary border border-brand-primary/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <ChefHat className="w-7 h-7" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
              For Food Donors
            </span>
            <h2 className="text-2xl font-black text-brand-text mt-1">
              Institutional Kitchens
            </h2>
            <p className="text-sm text-brand-muted mt-2.5 leading-relaxed">
              Plan meals with deterministic demand forecasts, log leftover consumption mass balance, and publish verified surplus food before it spoils.
            </p>

            <ul className="mt-5 space-y-2 text-xs text-brand-muted">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                <span>Deterministic meal forecasting &amp; attendance trends</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                <span>Consumption audit &amp; mass-balance tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                <span>AI category &amp; freshness quality screening</span>
              </li>
            </ul>

            <div className="mt-6 pt-5 border-t border-brand-border/60">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary group-hover:text-emerald-300 transition"
              >
                <span>Register a Kitchen Facility</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Pathway 2: Community Receivers */}
          <div className="glass-card bg-brand-card border border-brand-border rounded-3xl p-7 sm:p-8 relative overflow-hidden group hover:border-brand-violet/40 transition">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-violet/5 rounded-full blur-3xl pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-brand-violet-light text-brand-violet border border-brand-violet/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-7 h-7" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-violet">
              For Redistribution Partners
            </span>
            <h2 className="text-2xl font-black text-brand-text mt-1">
              Community Receivers
            </h2>
            <p className="text-sm text-brand-muted mt-2.5 leading-relaxed">
              Discover eligible surplus food from nearby university canteens and commercial kitchens. Review intake capacity, match scores, and coordinate pickups.
            </p>

            <ul className="mt-5 space-y-2 text-xs text-brand-muted">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-violet shrink-0" />
                <span>Real-time surplus opportunity feed &amp; category filters</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-violet shrink-0" />
                <span>Proximity-ranked matching scores &amp; urgency timers</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-violet shrink-0" />
                <span>Audited handoffs with photographic proof verification</span>
              </li>
            </ul>

            <div className="mt-6 pt-5 border-t border-brand-border/60">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 text-xs font-bold text-brand-violet group-hover:text-purple-300 transition"
              >
                <span>Register a Community Organization</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Visual Rescue Workflow: 4 Structured Steps */}
        <div className="mt-20 sm:mt-24 space-y-8 max-w-5xl mx-auto w-full">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Operational Workflow
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight">
              From Kitchen Pot to Community Plate
            </h3>
            <p className="text-xs sm:text-sm text-brand-muted max-w-xl mx-auto">
              How FoodQueue coordinates safe, verifiable food rescue across institutional stakeholders.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary-light text-brand-primary border border-brand-primary/30 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h4 className="text-sm font-bold text-brand-text">Demand Baseline</h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Deterministic demand prediction calculates optimal prep quantities from weighted historical service data.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary-light text-brand-primary border border-brand-primary/30 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h4 className="text-sm font-bold text-brand-text">Surplus Logging</h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Kitchen logs leftover batches with temperature, preparation time, and optional vision-based classification.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-violet-light text-brand-violet border border-brand-violet/30 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h4 className="text-sm font-bold text-brand-text">Smart Matching</h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Proximity algorithm scores nearby verified receivers based on capacity, distance, and safe rescue clock windows.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-violet-light text-brand-violet border border-brand-violet/30 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h4 className="text-sm font-bold text-brand-text">Audited Pickup</h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Receiver collects surplus batch with proof upload, closing chain-of-custody and logging estimated ESG impact.
              </p>
            </div>
          </div>
        </div>

        {/* Real Capability Summaries */}
        <div className="mt-16 sm:mt-20 p-8 sm:p-10 rounded-3xl bg-brand-card border border-brand-border max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-surface text-brand-primary border border-brand-border flex items-center justify-center mx-auto sm:mx-0">
                <Scale className="w-5 h-5" />
              </div>
              <h5 className="font-extrabold text-brand-text text-sm">Mass-Balance Accounting</h5>
              <p className="text-xs text-brand-muted leading-relaxed">
                Every meal service is audited against actual consumers to prevent unreported waste leakage.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-surface text-brand-amber border border-brand-border flex items-center justify-center mx-auto sm:mx-0">
                <Clock className="w-5 h-5" />
              </div>
              <h5 className="font-extrabold text-brand-text text-sm">Strict Rescue Clocks</h5>
              <p className="text-xs text-brand-muted leading-relaxed">
                Live countdown timers enforce safety thresholds so expired or unsafe food is never redistributed.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-brand-surface text-brand-mint border border-brand-border flex items-center justify-center mx-auto sm:mx-0">
                <Shield className="w-5 h-5" />
              </div>
              <h5 className="font-extrabold text-brand-text text-sm">Verified Receiver Registry</h5>
              <p className="text-xs text-brand-muted leading-relaxed">
                Only administrator-vetted community organizations receive donation matches and dispatch pickup teams.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-brand-surface py-8 text-center text-xs text-brand-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FoodQueueLogo href="/" variant="mark" width={24} height={24} priority={false} />
            <span className="font-bold text-brand-text">FoodQueue</span>
            <span>&bull;</span>
            <span>AI Food Waste Intelligence &amp; Redistribution Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="hover:text-brand-text transition">Sign In</Link>
            <Link href="/auth/register" className="hover:text-brand-text transition">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
