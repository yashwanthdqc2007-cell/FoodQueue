import { ShieldCheck, Server, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Phase 0B Application Foundation</span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
        FoodQueue
      </h1>

      <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mb-8 leading-relaxed">
        AI Food Waste Intelligence &amp; Redistribution Platform
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md text-left">
        <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm flex items-start gap-3">
          <Server className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Next.js App Router</h2>
            <p className="text-xs text-slate-500 mt-0.5">TypeScript &amp; Tailwind CSS configured</p>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-sm flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Supabase Integration</h2>
            <p className="text-xs text-slate-500 mt-0.5">SSR client &amp; Admin secret isolation</p>
          </div>
        </div>
      </div>
    </main>
  );
}
