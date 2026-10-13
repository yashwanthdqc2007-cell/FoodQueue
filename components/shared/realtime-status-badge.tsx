"use client";

import React, { useState } from "react";
import { RefreshCw, Wifi, WifiOff, Activity } from "lucide-react";
import type { RealtimeSyncStatus } from "@/lib/realtime/use-realtime-sync";

interface RealtimeStatusBadgeProps {
  status: RealtimeSyncStatus;
  lastUpdated?: Date;
  onRefresh?: () => void | Promise<void>;
  className?: string;
}

export function RealtimeStatusBadge({
  status,
  lastUpdated,
  onRefresh,
  className = "",
}: RealtimeStatusBadgeProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case "connected":
        return {
          label: "Channel Subscribed",
          dotColor: "bg-emerald-400",
          textColor: "text-emerald-400 font-medium",
          icon: <Wifi className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case "connecting":
        return {
          label: "Connecting...",
          dotColor: "bg-amber-400",
          textColor: "text-amber-400 font-medium",
          icon: <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
        };
      case "polling":
        return {
          label: "Periodic Sync (Polling)",
          dotColor: "bg-blue-400",
          textColor: "text-blue-400 font-medium",
          icon: <Activity className="w-3.5 h-3.5 text-blue-400" />,
        };
      case "disconnected":
      case "error":
      default:
        return {
          label: "Manual Refresh Only",
          dotColor: "bg-zinc-400",
          textColor: "text-zinc-400 font-medium",
          icon: <WifiOff className="w-3.5 h-3.5 text-zinc-400" />,
        };
    }
  };

  const display = getStatusDisplay();

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur-sm text-xs ${className}`}>
      <span className="flex items-center gap-1.5 font-medium">
        <span className={`w-2 h-2 rounded-full ${display.dotColor}`} />
        <span className={display.textColor}>{display.label}</span>
      </span>

      {formattedTime && (
        <span className="text-muted-foreground text-[11px] hidden sm:inline">
          Updated {formattedTime}
        </span>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          aria-label="Refresh data"
          title="Manual refresh"
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
        </button>
      )}
    </div>
  );
}
