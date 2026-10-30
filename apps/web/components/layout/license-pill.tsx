"use client";

import Link from "next/link";
import { AlertCircle, Clock, ShieldCheck } from "lucide-react";
import { useLicenseStatus } from "@/hooks/use-subscriptions";
import { cn } from "@/lib/utils";

export function LicensePill() {
  const { data: license } = useLicenseStatus();

  if (!license) return null;

  if (license.status === "GRACE_PERIOD" || license.offlineGrace?.inGracePeriod) {
    return (
      <Link
        href="/settings/subscription"
        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
      >
        <Clock className="size-3 text-amber-500 animate-pulse" />
        <span>Grace: {license.offlineGrace?.daysRemaining ?? license.daysRemaining}d</span>
      </Link>
    );
  }

  if (license.status === "EXPIRED" || license.status === "UNLICENSED") {
    return (
      <Link
        href="/settings/subscription"
        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
      >
        <AlertCircle className="size-3 text-destructive" />
        <span>Renew POS</span>
      </Link>
    );
  }

  return (
    <Link
      href="/settings/subscription"
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={`${license.plan ?? "Active"} Plan (${license.daysRemaining} days left)`}
    >
      <span className="size-1.5 rounded-full bg-emerald-500" />
      <span>{license.plan ?? "Starter"}</span>
      <span className="text-[10px] text-muted-foreground/80">({license.daysRemaining}d)</span>
    </Link>
  );
}
