"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeSyncStatus = "connected" | "connecting" | "polling" | "disconnected" | "error";

export interface UseRealtimeSyncOptions {
  channelName: string;
  tables: string[];
  onUpdate: () => void | Promise<void>;
  filter?: string;
  pollingIntervalMs?: number;
  enabled?: boolean;
}

export interface UseRealtimeSyncResult {
  status: RealtimeSyncStatus;
  lastUpdated: Date;
  refresh: () => void;
  isPollingFallback: boolean;
}

export function useRealtimeSync({
  channelName,
  tables,
  onUpdate,
  filter,
  pollingIntervalMs = 20000, // 20s fallback polling
  enabled = true,
}: UseRealtimeSyncOptions): UseRealtimeSyncResult {
  const [status, setStatus] = useState<RealtimeSyncStatus>(() =>
    enabled ? "connecting" : "disconnected"
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const triggerDebouncedUpdate = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    // Debounce rapid bursts of events within 400ms
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        await onUpdateRef.current();
        setLastUpdated(new Date());
      } catch (err) {
        console.warn("[RealtimeSync] Error during onUpdate execution:", err);
      }
    }, 400);
  }, []);

  const manualRefresh = useCallback(async () => {
    try {
      await onUpdateRef.current();
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("[RealtimeSync] Error during manual refresh:", err);
    }
  }, []);

  const tablesKey = tables.join(",");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    const supabase = createClient();

    // Setup fallback polling interval
    if (pollingIntervalMs > 0) {
      pollingIntervalRef.current = setInterval(() => {
        if (isMounted) {
          triggerDebouncedUpdate();
        }
      }, pollingIntervalMs);
    }

    try {
      let channel = supabase.channel(channelName);
      const tableArray = tablesKey ? tablesKey.split(",") : [];

      tableArray.forEach((table) => {
        const eventConfig: any = {
          event: "*",
          schema: "public",
          table,
        };
        if (filter) {
          eventConfig.filter = filter;
        }

        channel = channel.on(
          "postgres_changes" as any,
          eventConfig,
          () => {
            if (isMounted) {
              triggerDebouncedUpdate();
            }
          }
        );
      });

      channel.subscribe((channelStatus, error) => {
        if (!isMounted) return;

        if (channelStatus === "SUBSCRIBED") {
          setStatus("connected");
        } else if (channelStatus === "CLOSED" || channelStatus === "TIMED_OUT") {
          setStatus("polling");
        } else if (channelStatus === "CHANNEL_ERROR") {
          setStatus("polling");
          if (error) {
            console.warn("[RealtimeSync] Channel subscription error, falling back to polling:", error);
          }
        }
      });

      channelRef.current = channel;
    } catch (err) {
      setTimeout(() => {
        if (isMounted) {
          setStatus("polling");
          console.warn("[RealtimeSync] Realtime subscription init failed, using polling fallback:", err);
        }
      }, 0);
    }

    return () => {
      isMounted = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, tablesKey, filter, enabled, pollingIntervalMs, triggerDebouncedUpdate]);

  return {
    status,
    lastUpdated,
    refresh: manualRefresh,
    isPollingFallback: status === "polling" || status === "error",
  };
}
