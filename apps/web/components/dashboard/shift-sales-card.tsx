"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock,
  CreditCard,
  Plus,
  QrCode,
  Receipt,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHrActions } from "@/hooks/use-hr";
import type { ShiftBusinessSummary, ShiftsOverview } from "@/hooks/use-dashboard";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CreateShiftDialog } from "./create-shift-dialog";

export function ShiftSalesCard({
  branchId,
  shiftsOverview,
  totalTodayRevenue,
}: {
  branchId: string | null;
  shiftsOverview?: ShiftsOverview;
  totalTodayRevenue: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const { deleteShift } = useHrActions(branchId);

  const shifts = shiftsOverview?.shifts ?? [];
  const count = shifts.length;
  const activeShift = shifts.find((s) => s.status === "ACTIVE");

  const handleDeleteShift = (shift: ShiftBusinessSummary) => {
    if (
      !confirm(
        `Are you sure you want to remove ${shift.name}? Existing orders will remain safe.`,
      )
    ) {
      return;
    }
    deleteShift.mutate(shift.id, {
      onSuccess: () => toast.success(`${shift.name} removed`),
      onError: () => toast.error("Failed to delete shift"),
    });
  };

  // Determine grid columns dynamically based on number of shifts (2 shifts, 3 shifts, 5 shifts, etc.)
  const getGridColsClass = (n: number) => {
    if (n === 1) return "grid-cols-1";
    if (n === 2) return "grid-cols-1 md:grid-cols-2";
    if (n === 3) return "grid-cols-1 md:grid-cols-3";
    if (n === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
  };

  return (
    <Card className="flex flex-col gap-5 p-6 border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
              Shift-wise Total Business
            </h2>
            {count > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {count} {count === 1 ? "Shift" : "Shifts"}
              </Badge>
            )}
            {activeShift && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-medium flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeShift.name} Active Now
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Breakdown of daily revenue, customer orders, and tender collection per shift
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/team"
            className="hidden text-xs text-muted-foreground hover:text-foreground hover:underline sm:inline-block mr-1"
          >
            Staff Schedule &rarr;
          </Link>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* When No Shifts Configured */}
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-secondary/15">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            No Shifts Configured for Today
          </h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
            Configure 2, 3, or 5 operational shifts (e.g. Lunch Shift, Evening Rush,
            Night Shift) to see shift-wise sales, payment collections, and order volume
            tracked in real-time.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-8 text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create First Shift
            </Button>
            <Link
              href="/team"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
            >
              Open Team Schedule
            </Link>
          </div>
        </div>
      ) : (
        /* Dynamic Shift Grid: Supports 2, 3, 4, 5+ shifts */
        <div className={cn("grid gap-3.5", getGridColsClass(count))}>
          {shifts.map((shift, idx) => {
            const isCompleted = shift.status === "COMPLETED";
            const isActive = shift.status === "ACTIVE";
            const isUpcoming = shift.status === "UPCOMING";

            return (
              <div
                key={shift.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-xl border p-4.5 transition-all shadow-xs",
                  isActive
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                    : "border-border/70 bg-card hover:border-border",
                )}
              >
                {/* Top Row: Shift Title & Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                        {shift.name}
                      </h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{shift.formattedTime}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isActive && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live
                        </span>
                      )}
                      {isCompleted && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Ended
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                          Upcoming
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteShift(shift)}
                        title="Delete shift"
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Staff Info */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="font-medium text-foreground/90">
                      {shift.userName}
                    </span>
                    {shift.userRole && (
                      <span className="text-[10px] text-muted-foreground/80">
                        &middot; {shift.userRole}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Big Revenue & Orders */}
                <div className="my-3.5 space-y-1">
                  <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                    {formatCurrency(shift.totalRevenue)}
                  </span>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      {shift.orderCount} {shift.orderCount === 1 ? "order" : "orders"}
                    </span>
                    {shift.orderCount > 0 && (
                      <span className="tabular-nums">
                        Avg {formatCurrency(shift.averageOrderValue)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar: % of today's total business */}
                <div className="space-y-1 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Share of total</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {shift.percentageOfTotal}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full transition-all",
                        isActive ? "bg-primary" : "bg-primary/70",
                      )}
                      style={{ width: `${Math.min(shift.percentageOfTotal, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Bottom: Tender / Payment Mode breakdown pills */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                  {shift.paymentBreakdown.cash > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5">
                      <Wallet className="h-2.5 w-2.5 text-amber-500" />
                      Cash: {formatCurrency(shift.paymentBreakdown.cash)}
                    </span>
                  )}
                  {shift.paymentBreakdown.upi > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5">
                      <QrCode className="h-2.5 w-2.5 text-blue-500" />
                      UPI: {formatCurrency(shift.paymentBreakdown.upi)}
                    </span>
                  )}
                  {shift.paymentBreakdown.card > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5">
                      <CreditCard className="h-2.5 w-2.5 text-emerald-500" />
                      Card: {formatCurrency(shift.paymentBreakdown.card)}
                    </span>
                  )}
                  {shift.paymentBreakdown.cash === 0 &&
                    shift.paymentBreakdown.upi === 0 &&
                    shift.paymentBreakdown.card === 0 && (
                      <span className="text-[10px] text-muted-foreground/70 italic">
                        No payments recorded yet
                      </span>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned orders note if orders exist outside created shifts */}
      {shiftsOverview && shiftsOverview.unassignedOrders > 0 && count > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs text-muted-foreground border border-border/40">
          <span className="flex items-center gap-1.5">
            <span className="text-amber-500">💡</span>
            <span>
              Orders outside shifts:{" "}
              <strong className="text-foreground">
                {formatCurrency(shiftsOverview.unassignedRevenue)}
              </strong>{" "}
              across {shiftsOverview.unassignedOrders} orders
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground/80">
            Shift total: {formatCurrency(shiftsOverview.totalShiftRevenue)}
          </span>
        </div>
      )}

      {/* Create Shift Modal */}
      <CreateShiftDialog
        branchId={branchId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingShiftCount={count}
      />
    </Card>
  );
}
