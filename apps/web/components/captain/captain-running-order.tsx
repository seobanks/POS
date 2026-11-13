"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrder, type OrderDetail } from "@/hooks/use-orders";
import { usePrintOrderUsb } from "@/hooks/use-print";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CaptainRunningOrderProps {
  branchId: string | null;
  orderId: string;
  tableNumber?: string;
  onAddMoreItems?: () => void;
}

export function CaptainRunningOrder({
  branchId,
  orderId,
  tableNumber,
  onAddMoreItems,
}: CaptainRunningOrderProps) {
  const { data: order, isLoading, refetch, isRefetching } = useOrder(
    branchId,
    orderId,
  );
  const printUsb = usePrintOrderUsb(branchId);
  const [isPrinting, setIsPrinting] = useState(false);

  // Calculate elapsed dining time in minutes
  const elapsedMinutes = useMemo(() => {
    if (!order?.createdAt) return 0;
    const diff = Date.now() - new Date(order.createdAt).getTime();
    return Math.max(1, Math.floor(diff / 60000));
  }, [order?.createdAt]);

  const handlePrintBill = () => {
    if (!order) return;
    setIsPrinting(true);
    printUsb.mutate(
      { orderId: order.id, drawer: false },
      {
        onSuccess: () => {
          setIsPrinting(false);
          toast.success(
            `Bill for Table ${tableNumber || order.table?.number || ""} printed at counter!`,
          );
        },
        onError: (err) => {
          setIsPrinting(false);
          toast.error(
            err instanceof ApiError ? err.message : "Could not print bill",
          );
        },
      },
    );
  };

  // Group items by KOT rounds if KOTs exist
  const rounds = useMemo(() => {
    if (!order) return [];

    const itemMap = new Map<string, OrderDetail["items"][0]>();
    for (const item of order.items) {
      itemMap.set(item.id, item);
    }

    if (order.kots && order.kots.length > 0) {
      return order.kots.map((kot, idx) => {
        const roundItems = kot.items
          .map((ki) => {
            const rawItem = itemMap.get(ki.orderItemId);
            return rawItem ? { ...rawItem, itemStatus: ki.status || kot.status } : null;
          })
          .filter((i): i is NonNullable<typeof i> => i !== null);

        return {
          roundNumber: idx + 1,
          kotId: kot.id,
          status: kot.status,
          printedCount: kot.printedCount,
          items: roundItems,
        };
      });
    }

    // Fallback if no KOT records
    return [
      {
        roundNumber: 1,
        kotId: "single-round",
        status: order.status,
        printedCount: 1,
        items: order.items.map((i) => ({ ...i, itemStatus: order.status })),
      },
    ];
  }, [order]);

  // Check if any items are ready to serve (alert for waiter!)
  const readyItemsCount = useMemo(() => {
    if (!rounds) return 0;
    let count = 0;
    for (const r of rounds) {
      for (const item of r.items) {
        if (item.itemStatus === "READY") count += item.quantity;
      }
    }
    return count;
  }, [rounds]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm font-semibold">Order details not available</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Notification Banner if food is READY for pickup */}
      {readyItemsCount > 0 && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold animate-pulse shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 stroke-[2.5]" />
            <span>
              {readyItemsCount} dish{readyItemsCount > 1 ? "es" : ""} READY at Kitchen Counter!
            </span>
          </div>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px]">
            Pick up now
          </span>
        </div>
      )}

      {/* Order Summary Header Card */}
      <div className="p-3 bg-muted/30 border-b border-border/80 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
              Order #{order.orderNumber}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{elapsedMinutes}m elapsed</span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => void refetch()}
            disabled={isRefetching}
            title="Refresh order"
          >
            <RotateCcw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
          </Button>
        </div>

        {/* Financial Overview & Guest info */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-3 text-muted-foreground">
            {order.guestCount ? (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {order.guestCount} guests
              </span>
            ) : null}
            <span>{order.items.reduce((s, i) => s + i.quantity, 0)} items running</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground mr-1.5">Running Total:</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Rounds & Tickets List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {rounds.map((round) => {
          const isReady = round.status === "READY" || round.items.some((i) => i.itemStatus === "READY");
          const isCooking = round.status === "PREPARING";

          return (
            <div
              key={round.kotId}
              className={cn(
                "rounded-2xl border p-3 bg-card space-y-2.5 transition-all shadow-2xs",
                isReady
                  ? "border-emerald-500/60 bg-emerald-500/[0.03] ring-1 ring-emerald-500/30"
                  : isCooking
                    ? "border-blue-500/40 bg-blue-500/[0.02]"
                    : "border-border/80",
              )}
            >
              {/* Round Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    Round {round.roundNumber}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    ({round.items.reduce((sum, item) => sum + item.quantity, 0)} items)
                  </span>
                </div>

                <Badge
                  variant={
                    round.status === "READY"
                      ? "default"
                      : round.status === "PREPARING"
                        ? "secondary"
                        : "outline"
                  }
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 capitalize",
                    round.status === "READY" && "bg-emerald-600 text-white hover:bg-emerald-600",
                    round.status === "PREPARING" && "bg-blue-600/10 text-blue-600 border-blue-200",
                    round.status === "ACCEPTED" && "bg-amber-500/10 text-amber-700 border-amber-200",
                  )}
                >
                  {round.status === "READY"
                    ? "Ready to Serve"
                    : round.status === "PREPARING"
                      ? "Cooking"
                      : round.status === "ACCEPTED"
                        ? "Kitchen Accepted"
                        : round.status.toLowerCase()}
                </Badge>
              </div>

              {/* Items in this round */}
              <div className="space-y-2 divide-y divide-border/40">
                {round.items.map((item) => {
                  const itemIsReady = item.itemStatus === "READY";
                  const itemIsCooking = item.itemStatus === "PREPARING";

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "pt-2 first:pt-0 flex items-start justify-between gap-2 text-xs",
                        itemIsReady && "bg-emerald-50/50 dark:bg-emerald-950/20 p-1.5 rounded-lg",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold tabular-nums text-foreground">
                            {item.quantity}x
                          </span>
                          <span className="font-semibold text-foreground truncate">
                            {item.nameSnapshot}
                          </span>
                        </div>

                        {/* Modifiers Snapshot */}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="text-[11px] text-muted-foreground pl-4">
                            + {item.modifiers.map((m) => m.nameSnapshot).join(", ")}
                          </div>
                        )}

                        {/* Cooking Note */}
                        {item.kitchenNote && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 italic pl-4 font-medium">
                            &ldquo;{item.kitchenNote}&rdquo;
                          </div>
                        )}
                      </div>

                      {/* Right: Item Status Pill & Line Total */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatCurrency(item.lineTotal)}
                        </span>
                        {itemIsReady ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </span>
                        ) : itemIsCooking ? (
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                            Cooking
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Action Bar: Print Bill & Add More Dishes */}
      <div className="p-3 border-t border-border/80 bg-background/95 backdrop-blur-sm space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Print Bill Button */}
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 rounded-xl text-xs font-bold border-border hover:bg-secondary active:scale-[0.98] gap-2 shadow-xs"
            onClick={handlePrintBill}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Printer className="h-4 w-4 text-primary" />
            )}
            <span>Print Bill at Counter</span>
          </Button>

          {/* Add Dishes Button (switches tab or triggers parent callback) */}
          {onAddMoreItems && (
            <Button
              type="button"
              className="flex-1 h-12 rounded-xl text-xs font-bold gap-2 shadow-sm active:scale-[0.98]"
              onClick={onAddMoreItems}
            >
              <Plus className="h-4 w-4" />
              <span>Add More Dishes</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
