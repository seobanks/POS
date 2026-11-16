"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function formatElapsed(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Live "how long has this table been in its current state" badge — counts
 * up from `statusSince` (set server-side the moment a table's status last
 * changed).
 * Includes intelligent Table Timer Alerts:
 * - >= 45 min occupied: amber warning alert
 * - >= 60 min occupied: red overdue pulse alert
 */
export function ElapsedTimer({
  since,
  status,
  className,
}: {
  since: string;
  status?: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = now - new Date(since).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60_000));
  const isOccupied = status === "OCCUPIED";
  const isOverdue = isOccupied && elapsedMinutes >= 60;
  const isWarning = isOccupied && elapsedMinutes >= 45 && elapsedMinutes < 60;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-mono",
        isOverdue && "text-rose-500 font-bold",
        isWarning && "text-amber-500 font-semibold",
        !isOverdue && !isWarning && "text-muted-foreground",
        className,
      )}
      title={
        isOverdue
          ? `Overdue: Occupied for ${elapsedMinutes}m (>60m turnaround limit)`
          : isWarning
            ? `Attention: Occupied for ${elapsedMinutes}m (>45m turnaround limit)`
            : undefined
      }
    >
      <Clock className={cn("h-3 w-3", isOverdue && "text-rose-500 animate-pulse", isWarning && "text-amber-500")} />
      <span>{formatElapsed(elapsedMs)}</span>
      {isOverdue && (
        <span className="text-[9px] uppercase tracking-wider bg-rose-500/15 text-rose-500 px-1 py-0.5 rounded font-sans font-bold animate-pulse">
          Overdue
        </span>
      )}
      {isWarning && (
        <span className="text-[9px] uppercase tracking-wider bg-amber-500/15 text-amber-500 px-1 py-0.5 rounded font-sans font-semibold">
          Alert
        </span>
      )}
    </span>
  );
}
