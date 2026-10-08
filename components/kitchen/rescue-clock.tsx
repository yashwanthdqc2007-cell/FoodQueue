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
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <Clock className="w-3 h-3 text-emerald-600" />
          <span>{formattedRemaining}</span>
        </span>
      );
    }
    if (status === "URGENT") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>{formattedRemaining}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-500" />
        <span>Expired</span>
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl p-3 border transition ${
        status === "ACTIVE"
          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
          : status === "URGENT"
          ? "bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs ring-1 ring-amber-400/50"
          : "bg-rose-50/80 border-rose-200 text-rose-950"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {status === "ACTIVE" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {status === "URGENT" && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />}
          {status === "EXPIRED" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span className="text-xs font-bold tracking-tight uppercase">
            Rescue Clock: {status}
          </span>
        </div>

        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            status === "ACTIVE"
              ? "bg-emerald-200 text-emerald-900"
              : status === "URGENT"
              ? "bg-amber-200 text-amber-900 font-extrabold"
              : "bg-rose-200 text-rose-900"
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
          <div className="text-[10px] text-slate-500">
            Deadline: {new Date(deadlineIso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
}
