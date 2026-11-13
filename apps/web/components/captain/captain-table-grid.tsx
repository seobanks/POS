"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  Check,
  Clock,
  Receipt,
  Search,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ElapsedTimer } from "@/components/tables/elapsed-timer";
import { TableShapeIcon } from "@/components/tables/table-shape-icon";
import { useBranch } from "@/hooks/use-branch";
import { useOpenOrders, type OpenOrder } from "@/hooks/use-orders";
import {
  useFloors,
  useResolveTableRequest,
  useTableRequests,
  type Floor,
  type RestaurantTable,
  type TableRequestRow,
} from "@/hooks/use-tables";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CaptainTableGridProps {
  onSelectTable: (table: RestaurantTable, existingOrder?: OpenOrder | null) => void;
  selectedFloorId?: string | null;
  className?: string;
}

export function CaptainTableGrid({
  onSelectTable,
  selectedFloorId,
  className,
}: CaptainTableGridProps) {
  const { branchId } = useBranch();
  const floorsQuery = useFloors(branchId);
  const ordersQuery = useOpenOrders(branchId);
  const { data: tableRequests = [] } = useTableRequests(branchId);
  const resolveRequest = useResolveTableRequest(branchId);

  const [searchQuery, setSearchQuery] = useState("");

  const floors: Floor[] = floorsQuery.data || [];
  const openOrders: OpenOrder[] = ordersQuery.data || [];

  // Map open orders by tableId for instant O(1) lookup
  const ordersByTableId = useMemo(() => {
    const map = new Map<string, OpenOrder>();
    for (const order of openOrders) {
      if (order.tableId) {
        // If multiple orders on one table, keep the latest
        if (!map.has(order.tableId)) {
          map.set(order.tableId, order);
        }
      }
    }
    return map;
  }, [openOrders]);

  // Map active table requests by tableId
  const requestsByTableId = useMemo(() => {
    const map = new Map<string, TableRequestRow[]>();
    for (const req of tableRequests) {
      const existing = map.get(req.table.id) || [];
      existing.push(req);
      map.set(req.table.id, existing);
    }
    return map;
  }, [tableRequests]);

  // Filter tables according to selected floor
  const displayedTables = useMemo(() => {
    let list: (RestaurantTable & { floorName: string })[] = [];
    for (const floor of floors) {
      if (!selectedFloorId || floor.id === selectedFloorId) {
        const withFloor = (floor.tables || []).map((t) => ({
          ...t,
          floorName: floor.name,
        }));
        list = list.concat(withFloor);
      }
    }

    // Apply quick search query (matches table number or name)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.number.toLowerCase().includes(q) ||
          (t.name && t.name.toLowerCase().includes(q)),
      );
    }

    // Natural sort tables by table number (T1, T2, T10, etc.)
    return list.sort((a, b) => {
      const numA = parseInt(a.number.replace(/\D/g, ""), 10);
      const numB = parseInt(b.number.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });
  }, [floors, selectedFloorId, searchQuery]);

  const isLoading = floorsQuery.isLoading || ordersQuery.isLoading;

  return (
    <div className={cn("flex flex-1 flex-col h-full overflow-y-auto p-3.5 sm:p-4 space-y-3.5", className)}>
      {/* Search Bar for Quick Table Filtering */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-zinc-400 pointer-events-none" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Quick search table # (e.g. 4, T2)..."
          className="h-11 pl-9 pr-9 bg-zinc-100 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-xl text-sm focus-visible:ring-primary focus-visible:border-primary shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/50 p-3.5 flex flex-col justify-between animate-pulse"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                <Skeleton className="h-5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
                <Skeleton className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <Skeleton className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayedTables.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-800 mb-3">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">No tables found</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
            {searchQuery
              ? `No tables match "${searchQuery}". Check the table number or clear search.`
              : "No tables assigned to this floor yet."}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-4 h-9 rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200"
            >
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Table Cards Grid */}
      {!isLoading && displayedTables.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayedTables.map((table) => {
            const order = ordersByTableId.get(table.id) || null;
            const requests = requestsByTableId.get(table.id) || [];
            const waiterRequest = requests.find((r) => r.type === "WAITER");
            const billRequest = requests.find((r) => r.type === "BILL");

            // Determine status category
            const hasWaiterCall = !!waiterRequest;
            const isBillRequested = !!billRequest || !!order?.billedAt;
            const isOccupied = table.status === "OCCUPIED" || !!order;
            const isAvailable = table.status === "AVAILABLE" && !order;
            const isReserved = table.status === "RESERVED";
            const isCleaning = table.status === "CLEANING";

            // Elapsed time calculation
            const elapsedSince = order?.createdAt || table.statusSince;

            return (
              <div
                key={table.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTable(table, order)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectTable(table, order);
                  }
                }}
                className={cn(
                  "relative flex min-h-[136px] flex-col justify-between rounded-2xl border-2 p-3.5 transition-all text-left select-none cursor-pointer active:scale-[0.97] shadow-xs",
                  // 1. Call Waiter alert (Priority styling)
                  hasWaiterCall
                    ? "border-rose-500 bg-rose-500/15 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/40 animate-pulse"
                    // 2. Bill Requested / Printed
                    : isBillRequested
                      ? "border-amber-500/80 bg-amber-500/15 dark:bg-amber-500/10 text-amber-950 dark:text-amber-100 shadow-amber-950/10"
                      // 3. Occupied / Active Order
                      : isOccupied
                        ? "border-blue-400 dark:border-blue-500/70 bg-blue-50/80 dark:bg-blue-950/25 text-blue-950 dark:text-blue-100 hover:border-blue-500"
                        // 4. Available / Vacant
                        : isAvailable
                          ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 text-zinc-800 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                          // 5. Reserved
                          : isReserved
                            ? "border-yellow-500/60 bg-yellow-50/80 dark:bg-yellow-950/20 text-yellow-950 dark:text-yellow-200"
                            // 6. Cleaning / Other
                            : isCleaning
                              ? "border-zinc-300 dark:border-zinc-700/60 bg-zinc-100/70 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 opacity-80"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400",
                )}
              >
                {/* Top Row: Table Name/Number & Status Badge */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                        {table.name ? table.name : `T${table.number}`}
                      </span>
                      {table.name && (
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          #{table.number}
                        </span>
                      )}
                    </div>
                    {/* Floor name when All Tables are shown */}
                    {!selectedFloorId && (
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                        {table.floorName}
                      </span>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="shrink-0 flex items-center gap-1">
                    {hasWaiterCall ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        <BellRing className="h-3 w-3 animate-bounce" />
                        Call
                      </span>
                    ) : isBillRequested ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-zinc-950 shadow-xs">
                        <Receipt className="h-3 w-3" />
                        Bill
                      </span>
                    ) : isOccupied ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-500/30">
                        {order?.orderNumber ? `#${order.orderNumber}` : "Active"}
                      </span>
                    ) : isReserved ? (
                      <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 dark:text-yellow-300 border border-yellow-500/30">
                        Reserved
                      </span>
                    ) : isCleaning ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:text-zinc-400">
                        <Sparkles className="h-2.5 w-2.5" />
                        Cleaning
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        Vacant
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Capacity / Guest Count & Elapsed Timer */}
                <div className="my-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    <TableShapeIcon
                      shape={table.shape}
                      capacity={table.capacity}
                      className="h-4 w-4 shrink-0 opacity-70"
                    />
                    <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      <Users className="h-3 w-3 text-zinc-400 dark:text-zinc-400" />
                      {isOccupied && order?.guestCount
                        ? `${order.guestCount} guests`
                        : `${table.capacity} seats`}
                    </span>
                  </div>

                  {/* Dining elapsed timer for active tables */}
                  {(isOccupied || isBillRequested) && elapsedSince && (
                    <ElapsedTimer
                      since={elapsedSince}
                      className="flex items-center gap-1 text-[11px] font-semibold text-zinc-800 dark:text-zinc-300 tabular-nums bg-zinc-200/80 dark:bg-black/30 px-1.5 py-0.5 rounded-md"
                    />
                  )}
                </div>

                {/* Bottom Row: Running Total / Action prompt / Call Waiter quick resolve */}
                <div className="pt-2 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between text-xs">
                  {hasWaiterCall && waiterRequest ? (
                    <div className="flex w-full items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-200">
                        Needs Waiter
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveRequest.mutate(waiterRequest.id);
                        }}
                        disabled={resolveRequest.isPending}
                        className="h-6 px-2 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-md shadow-xs"
                      >
                        <Check className="mr-0.5 h-3 w-3" />
                        Done
                      </Button>
                    </div>
                  ) : isBillRequested && order ? (
                    <>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">Bill Printed</span>
                      <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-200">
                        {formatCurrency(order.totalAmount || "0")}
                      </span>
                    </>
                  ) : isOccupied && order ? (
                    <>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Total:</span>
                      <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                        {formatCurrency(order.totalAmount || order.subtotal || "0")}
                      </span>
                    </>
                  ) : (
                    <div className="flex w-full items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>Available</span>
                      <span className="text-primary font-medium">Tap to order →</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
