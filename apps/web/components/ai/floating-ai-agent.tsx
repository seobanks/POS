"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  ChefHat,
  Clock,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBranch } from "@/hooks/use-branch";
import { useDashboardSummary } from "@/hooks/use-dashboard";
import { useOpenOrders } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FloatingAiAgent() {
  const { branchId } = useBranch();
  const [isOpen, setIsOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  const { data: summary } = useDashboardSummary(branchId);
  const { data: openOrders = [] } = useOpenOrders(branchId);

  // Compute answers based on live branch state
  const longestTables = useMemo(() => {
    return openOrders
      .filter((o) => o.type === "DINE_IN" && !!o.table)
      .map((o) => {
        const createdAt = o.createdAt ? new Date(o.createdAt).getTime() : Date.now();
        const mins = Math.max(1, Math.floor((Date.now() - createdAt) / 60000));
        const name = o.table?.name || (o.table ? `Table ${o.table.number}` : "Table");
        return { name, mins, total: Number(o.totalAmount || 0) };
      })
      .sort((a, b) => b.mins - a.mins)
      .slice(0, 5);
  }, [openOrders]);

  const kitchenQueues = useMemo(() => {
    return summary?.kitchenQueue || { new: 0, accepted: 0, preparing: 0, ready: 0 };
  }, [summary]);

  const channelBreakup = useMemo(() => {
    let dineIn = 0;
    let takeaway = 0;
    let delivery = 0;
    for (const o of openOrders) {
      if (o.type === "DINE_IN") dineIn += 1;
      else if (o.type === "TAKEAWAY") takeaway += 1;
      else if (o.type === "DELIVERY") delivery += 1;
    }
    return { dineIn, takeaway, delivery };
  }, [openOrders]);

  const quickPrompts = [
    {
      id: "sales",
      title: "Today's sales & order count",
      icon: TrendingUp,
    },
    {
      id: "slow-tables",
      title: "Which tables are occupied longest?",
      icon: Clock,
    },
    {
      id: "kitchen-queue",
      title: "Kitchen orders in progress",
      icon: ChefHat,
    },
    {
      id: "channels",
      title: "Running order channels breakdown",
      icon: UtensilsCrossed,
    },
  ];

  return (
    <>
      {/* Floating Pill on bottom right (Matches Petpooja Images 1-5) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-1.5 select-none print:hidden">
        {/* Tooltip greeting */}
        <div className="bg-background/95 backdrop-blur-md text-foreground border border-border px-3 py-1.5 rounded-2xl shadow-lg text-[11px] font-semibold flex items-center gap-1.5 animate-bounce">
          <span>You can ask me anything!</span>
          <span className="text-amber-500">👋</span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            if (!activeQuery) setActiveQuery("sales");
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
        >
          <Sparkles className="h-4 w-4 animate-spin text-amber-300" />
          <span>AI Agent</span>
        </button>
      </div>

      {/* AI Assistant Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg w-[92vw] sm:w-full rounded-2xl border-border bg-card text-foreground shadow-2xl p-6">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  POS Operations AI Assistant
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Real-time operational intelligence powered by live restaurant POS telemetry
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Prompt Selector Pills */}
          <div className="flex flex-wrap gap-1.5 my-3">
            {quickPrompts.map((p) => {
              const Icon = p.icon;
              const isActive = activeQuery === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveQuery(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-secondary/60 text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{p.title}</span>
                </button>
              );
            })}
          </div>

          {/* AI Response Card */}
          <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 space-y-3">
            {activeQuery === "sales" && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>Today&apos;s Financial Summary</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <span className="text-[11px] text-muted-foreground block">
                      Revenue Collected
                    </span>
                    <span className="text-lg font-bold text-foreground tabular-nums">
                      {formatCurrency(summary?.todayRevenue || 0)}
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <span className="text-[11px] text-muted-foreground block">
                      Total Orders Handled
                    </span>
                    <span className="text-lg font-bold text-foreground tabular-nums">
                      {summary?.todayOrders || 0}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  💡 Tip: Peak dining hours show highest ticket sizes. Ensure dine-in table turns remain under 40 minutes.
                </p>
              </div>
            )}

            {activeQuery === "slow-tables" && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>Tables Occupied Longest Right Now</span>
                </h4>
                {longestTables.length === 0 ? (
                  <p className="text-muted-foreground py-2">
                    No active dine-in tables at this moment.
                  </p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {longestTables.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {t.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({formatCurrency(t.total)})
                          </span>
                        </div>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold tabular-nums",
                            t.mins > 40
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {t.mins} min elapsed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeQuery === "kitchen-queue" && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <ChefHat className="h-4 w-4 text-blue-500" />
                  <span>Kitchen Station Pipeline</span>
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="p-2 bg-card rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      New
                    </span>
                    <span className="text-base font-bold text-foreground tabular-nums">
                      {kitchenQueues.new}
                    </span>
                  </div>
                  <div className="p-2 bg-card rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      Accepted
                    </span>
                    <span className="text-base font-bold text-foreground tabular-nums">
                      {kitchenQueues.accepted}
                    </span>
                  </div>
                  <div className="p-2 bg-card rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      Preparing
                    </span>
                    <span className="text-base font-bold text-foreground tabular-nums">
                      {kitchenQueues.preparing}
                    </span>
                  </div>
                  <div className="p-2 bg-card rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      Ready
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {kitchenQueues.ready}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeQuery === "channels" && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <UtensilsCrossed className="h-4 w-4 text-purple-500" />
                  <span>Active Channel Distribution</span>
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      Dine In
                    </span>
                    <span className="text-base font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                      {channelBreakup.dineIn}
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      Takeaway
                    </span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      {channelBreakup.takeaway}
                    </span>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      Delivery
                    </span>
                    <span className="text-base font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                      {channelBreakup.delivery}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
