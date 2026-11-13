"use client";

import { RefreshCw, Zap } from "lucide-react";
import { useOfflinePos } from "@/hooks/use-offline-pos";
import { cn } from "@/lib/utils";

export interface OfflineIndicatorProps {
  branchId?: string | null;
  className?: string;
  showWhenOnline?: boolean;
}

export function OfflineIndicator({
  branchId,
  className,
  showWhenOnline = false,
}: OfflineIndicatorProps) {
  const { isOnline, pendingCount, isSyncing, syncPendingOrders } = useOfflinePos({
    branchId,
  });

  // 1. Offline Mode: Bright amber pill
  if (!isOnline) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs animate-pulse select-none",
          className,
        )}
        title="POS is offline. All orders are safely queued locally."
      >
        <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
        <span>⚡ Offline Mode — Saving locally</span>
        {pendingCount > 0 && (
          <span className="ml-0.5 rounded-full bg-amber-500/25 px-1.5 py-0.2 text-[11px] font-bold tabular-nums">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // 2. Online with pending orders to sync
  if (pendingCount > 0) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-500/25 shadow-xs select-none",
          className,
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        <span className="tabular-nums font-semibold">
          🟠 {pendingCount} {pendingCount === 1 ? "order" : "orders"} pending sync
        </span>
        <button
          type="button"
          onClick={() => void syncPendingOrders()}
          disabled={isSyncing}
          className="ml-1 inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
        </button>
      </div>
    );
  }

  // 3. Online and 0 pending: small subtle indicator or hidden
  if (showWhenOnline) {
    return (
      <div
        className={cn(
          "hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 select-none",
          className,
        )}
        title="POS is online and synced"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>Online</span>
      </div>
    );
  }

  return null;
}
