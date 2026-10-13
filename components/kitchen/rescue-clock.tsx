"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { computeRescueClock, RescueClockResult } from "@/lib/rules/rescue-clock";

interface RescueClockProps {
  deadlineIso: string | null | undefined;
  initialClock?: RescueClockResult;
  compact?: boolean;
}

export function RescueClock({ deadlineIso, compact = false }: RescueClockProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setNow(Date.now());
    });

    if (!deadlineIso) {
      return () => cancelAnimationFrame(handle);
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      cancelAnimationFrame(handle);
      clearInterval(interval);
    };
  }, [deadlineIso]);

  const clock = computeRescueClock(deadlineIso, now || undefined);
  const { status, formattedRemaining } = clock;

  if (compact) {
    if (status === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-700/50">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{formattedRemaining}</span>
        </span>
      );
    }
    if (status === "URGENT") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-700/50 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>{formattedRemaining}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-950/70 px-2 py-0.5 rounded-md border border-rose-700/50">
        <AlertCircle className="w-3 h-3 text-rose-400" />
        <span>Expired</span>
      </span>
    );
  }

  return (
    <div
      className={`rounded-2xl p-3 border transition ${
        status === "ACTIVE"
          ? "bg-emerald-950/60 border-emerald-700/50 text-emerald-200"
          : status === "URGENT"
          ? "bg-amber-950/60 border-amber-700/50 text-amber-200 shadow-xs ring-1 ring-amber-400/40"
          : "bg-rose-950/60 border-rose-700/50 text-rose-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {status === "ACTIVE" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {status === "URGENT" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />}
          {status === "EXPIRED" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="text-xs font-bold tracking-tight uppercase">
            Rescue Clock: {status}
          </span>
        </div>

        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            status === "ACTIVE"
              ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700/40"
              : status === "URGENT"
              ? "bg-amber-900/60 text-amber-300 border border-amber-700/40 font-extrabold"
              : "bg-rose-900/60 text-rose-300 border border-rose-700/40"
          }`}
        >
          {status === "ACTIVE" ? "> 60m remaining" : status === "URGENT" ? "≤ 60m urgent" : "Deadline passed"}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-base font-black font-mono tracking-tight">
          {formattedRemaining}
        </div>
        {deadlineIso && (
          <div className="text-[10px] text-brand-muted">
            Deadline: {new Date(deadlineIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
