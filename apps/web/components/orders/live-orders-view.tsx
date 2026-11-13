"use client";

import { useMemo, useState } from "react";
import {
  ChefHat,
  Clock,
  LayoutGrid,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpenOrders, type OpenOrder } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RunningTableDrawer } from "./running-table-drawer";

export interface LiveOrdersViewProps {
  branchId: string | null;
}

export function LiveOrdersView({ branchId }: LiveOrdersViewProps) {
  const [subTab, setSubTab] = useState<"running-orders" | "running-tables">(
    "running-orders",
  );
  const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data: openOrders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useOpenOrders(branchId);

  // Group open orders by channel & fulfillment status
  const {
    runningOrdersCount,
    runningOrdersAmount,
    dineInCount,
    dineInAmount,
    pickupCount,
    pickupAmount,
    deliveryCount,
    deliveryAmount,
    inPrepCount,
    inPrepAmount,
    waitingPickupCount,
    waitingPickupAmount,
    outDeliveryCount,
    outDeliveryAmount,
    pendingTotalCount,
    pendingTotalAmount,
    runningTables,
    runningTablesRevenue,
  } = useMemo(() => {
    let runningOrdersCount = 0;
    let runningOrdersAmount = 0;

    let dineInCount = 0;
    let dineInAmount = 0;
    let pickupCount = 0;
    let pickupAmount = 0;
    let deliveryCount = 0;
    let deliveryAmount = 0;

    let inPrepCount = 0;
    let inPrepAmount = 0;
    let waitingPickupCount = 0;
    let waitingPickupAmount = 0;
    let outDeliveryCount = 0;
    let outDeliveryAmount = 0;

    const tableMap = new Map<string, OpenOrder>();

    for (const order of openOrders) {
      const amt = Number(order.totalAmount || 0);
      runningOrdersCount += 1;
      runningOrdersAmount += amt;

      if (order.type === "DINE_IN") {
        dineInCount += 1;
        dineInAmount += amt;
        if (order.tableId) {
          tableMap.set(order.tableId, order);
        }
      } else if (order.type === "TAKEAWAY") {
        pickupCount += 1;
        pickupAmount += amt;
      } else if (order.type === "DELIVERY") {
        deliveryCount += 1;
        deliveryAmount += amt;
      }

      // Check kitchen / fulfillment state
      const hasCooking = order.items.some(
        (i) => (i as any).status === "NEW" || (i as any).status === "PREPARING",
      );
      const allReady =
        order.items.length > 0 &&
        order.items.every((i) => (i as any).status === "READY");

      if (hasCooking) {
        inPrepCount += 1;
        inPrepAmount += amt;
      }

      if (order.type === "TAKEAWAY" && allReady) {
        waitingPickupCount += 1;
        waitingPickupAmount += amt;
      } else if (order.type === "DELIVERY" && (order as any).deliveryStatus === "PICKED_UP") {
        outDeliveryCount += 1;
        outDeliveryAmount += amt;
      }
    }

    const pendingTotalCount = inPrepCount + waitingPickupCount + outDeliveryCount;
    const pendingTotalAmount = inPrepAmount + waitingPickupAmount + outDeliveryAmount;

    const runningTables = Array.from(tableMap.values());
    const runningTablesRevenue = dineInAmount;

    return {
      runningOrdersCount,
      runningOrdersAmount,
      dineInCount,
      dineInAmount,
      pickupCount,
      pickupAmount,
      deliveryCount,
      deliveryAmount,
      inPrepCount,
      inPrepAmount,
      waitingPickupCount,
      waitingPickupAmount,
      outDeliveryCount,
      outDeliveryAmount,
      pendingTotalCount,
      pendingTotalAmount,
      runningTables,
      runningTablesRevenue,
    };
  }, [openOrders]);

  const handleTableClick = (order: OpenOrder) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Sub-header Navigation (Matches Petpooja Images 1 & 2) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("running-orders")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              subTab === "running-orders"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border/80 hover:bg-secondary",
            )}
          >
            Running Orders
          </button>
          <button
            type="button"
            onClick={() => setSubTab("running-tables")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              subTab === "running-tables"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-background text-muted-foreground border-border/80 hover:bg-secondary",
            )}
          >
            Running Tables
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-xl text-xs font-semibold gap-2 border-border/80 hover:bg-secondary"
          onClick={() => void refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")}
          />
          <span>Refresh</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : subTab === "running-orders" ? (
        /* ========================================================
           TAB 1: RUNNING ORDERS SUMMARY (Matches Petpooja Image 1)
           ======================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Running Orders */}
          <Card className="p-6 rounded-2xl border border-border shadow-xs bg-card space-y-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-base font-bold text-foreground">
                Running Orders
              </h3>
            </div>

            {/* Total Orders & Amount Header Banner */}
            <div className="grid grid-cols-2 gap-4 bg-secondary/40 rounded-xl p-4 text-center border border-border/50">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Total Orders
                </span>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                  {runningOrdersCount}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Total Amount
                </span>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                  {formatCurrency(runningOrdersAmount)}
                </p>
              </div>
            </div>

            {/* Breakdown Rows */}
            <div className="space-y-2.5 divide-y divide-border/40">
              {/* Dine-in Row */}
              <div className="flex items-center justify-between pt-2.5 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <UtensilsCrossed className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Dine in
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {dineInCount} order{dineInCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatCurrency(dineInAmount)}
                </span>
              </div>

              {/* Pick up / Takeaway Row */}
              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Pick up
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {pickupCount} order{pickupCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatCurrency(pickupAmount)}
                </span>
              </div>

              {/* Delivery Row */}
              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Delivery
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {deliveryCount} order{deliveryCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatCurrency(deliveryAmount)}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Pending Orders / Kitchen Fulfillment */}
          <Card className="p-6 rounded-2xl border border-border shadow-xs bg-card space-y-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-base font-bold text-foreground">
                Pending Orders
              </h3>
            </div>

            {/* Total Orders & Amount Header Banner */}
            <div className="grid grid-cols-2 gap-4 bg-secondary/40 rounded-xl p-4 text-center border border-border/50">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Total Orders
                </span>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                  {pendingTotalCount}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Total Amount
                </span>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                  {formatCurrency(pendingTotalAmount)}
                </p>
              </div>
            </div>

            {/* Kitchen Status Rows */}
            <div className="space-y-2.5 divide-y divide-border/40">
              {/* In Preparation */}
              <div className="flex items-center justify-between pt-2.5 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      In Preparation
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {inPrepCount} order{inPrepCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatCurrency(inPrepAmount)}
                </span>
              </div>

              {/* Waiting For Pickup */}
              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Waiting For Pickup
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {waitingPickupCount} order{waitingPickupCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatCurrency(waitingPickupAmount)}
                </span>
              </div>

              {/* Out For Delivery */}
              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Out For Delivery
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {outDeliveryCount} order{outDeliveryCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatCurrency(outDeliveryAmount)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* ========================================================
           TAB 2: RUNNING TABLES GRID (Matches Petpooja Image 2)
           ======================================================== */
        <div className="space-y-5">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 rounded-2xl border border-border bg-card flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground tabular-nums block">
                  {runningTables.length}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Active Tables
                </span>
              </div>
            </Card>

            <Card className="p-4 rounded-2xl border border-border bg-card flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground tabular-nums block">
                  {formatCurrency(runningTablesRevenue)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Revenue (Estimated)
                </span>
              </div>
            </Card>
          </div>

          {/* Running Tables Grid */}
          {runningTables.length === 0 ? (
            <Card className="p-12 text-center rounded-2xl border border-dashed border-border bg-secondary/20">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground">
                No Running Tables
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                All dine-in tables are currently vacant. Punch a table in POS or
                Captain PWA to start a session.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {runningTables.map((order) => {
                const tableName =
                  order.table?.name ||
                  (order.table ? `Table ${order.table.number}` : "Table");
                const totalAmt = Number(order.totalAmount || 0);

                // Elapsed dining minutes
                const createdAt = order.createdAt
                  ? new Date(order.createdAt).getTime()
                  : Date.now();
                const elapsedMins = Math.max(
                  1,
                  Math.floor((Date.now() - createdAt) / 60000),
                );

                const isSlow = elapsedMins > 45;
                const isModerate = elapsedMins > 25;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => handleTableClick(order)}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/60 hover:shadow-md transition-all text-center flex flex-col items-center justify-between gap-3 group active:scale-95"
                  >
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {tableName}
                    </span>

                    <span className="text-xs font-bold bg-secondary/80 text-foreground px-3 py-1 rounded-lg tabular-nums border border-border/60">
                      {formatCurrency(totalAmt)}
                    </span>

                    <div
                      className={cn(
                        "text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md",
                        isSlow
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : isModerate
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      <span>{elapsedMins} Min Time Lapsed</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Slide-over Table Detail Drawer */}
      <RunningTableDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        order={selectedOrder}
        branchId={branchId}
      />
    </div>
  );
}
