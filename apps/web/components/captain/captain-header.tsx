"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock,
  Receipt,
  RotateCw,
  User,
  Utensils,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { useSettings } from "@/hooks/use-settings";
import {
  useResolveTableRequest,
  useTableRequests,
  type Floor,
  type TableRequestRow,
} from "@/hooks/use-tables";
import { useRealtimeState } from "@/lib/realtime-status";
import { cn } from "@/lib/utils";

export interface CaptainHeaderProps {
  selectedFloorId: string | null;
  onSelectFloor: (floorId: string | null) => void;
  floors?: Floor[];
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 1000));
    if (diff < 60) return "Just now";
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  } catch {
    return "";
  }
}

export function CaptainHeader({
  selectedFloorId,
  onSelectFloor,
  floors = [],
  className,
}: CaptainHeaderProps) {
  const queryClient = useQueryClient();
  const { branchId, branches } = useBranch();
  const { data: userData } = useCurrentUser();
  const { data: settings } = useSettings(branchId);
  const realtimeState = useRealtimeState();

  const { data: tableRequests = [] } = useTableRequests(branchId);
  const resolveRequest = useResolveTableRequest(branchId);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const activeBranch = branches.find((b) => b.id === branchId);
  const restaurantName = settings?.restaurant?.name || "Hanva POS";
  const branchName = activeBranch?.name || settings?.branch?.name || "Main Branch";
  const staffName = userData?.user.name || "Staff";
  const staffRole = userData?.user.roleName || "Captain";

  const totalTableCount = floors.reduce((acc, f) => acc + (f.tables?.length || 0), 0);
  const pendingRequestsCount = tableRequests.length;

  const handleQuickRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["floors", branchId] }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["table-requests", branchId] }),
        queryClient.invalidateQueries({ queryKey: ["settings", branchId] }),
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleResolveAll = async () => {
    for (const req of tableRequests) {
      await resolveRequest.mutateAsync(req.id);
    }
  };

  return (
    <header className={cn("sticky top-0 z-40 flex flex-col bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 shadow-md", className)}>
      {/* Top Bar: Restaurant Info, Staff Info, Connection, Alerts, Refresh */}
      <div className="flex h-14 items-center justify-between px-3.5 sm:px-4">
        {/* Left: Brand / Restaurant & Branch */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-sm">
            <Utensils className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="truncate text-xs font-semibold text-zinc-100 sm:text-sm tracking-tight">
              {restaurantName}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{branchName}</span>
              <span className="text-zinc-600">·</span>
              {/* Live Connection Status */}
              {realtimeState === "live" && (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
              )}
              {realtimeState === "connecting" && (
                <span className="inline-flex items-center gap-1 font-medium text-amber-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  Syncing
                </span>
              )}
              {realtimeState === "offline" && (
                <span className="inline-flex items-center gap-1 font-medium text-zinc-400">
                  <WifiOff className="h-3 w-3 text-zinc-500" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Waiter Profile, Alerts, Quick Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Table Requests Alert Button (Flashing if pending) */}
          <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
            <SheetTrigger
              render={
                <Button
                  variant={pendingRequestsCount > 0 ? "destructive" : "ghost"}
                  size="sm"
                  className={cn(
                    "relative h-9 px-2.5 rounded-xl font-medium transition-all",
                    pendingRequestsCount > 0
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/60 ring-2 ring-rose-500/40 animate-pulse"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800/80",
                  )}
                  aria-label={
                    pendingRequestsCount > 0
                      ? `${pendingRequestsCount} active table requests`
                      : "No table requests"
                  }
                >
                  {pendingRequestsCount > 0 ? (
                    <>
                      <BellRing className="h-4 w-4 animate-bounce" />
                      <span className="ml-1 text-xs font-semibold tabular-nums">
                        {pendingRequestsCount}
                      </span>
                    </>
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                </Button>
              }
            />

            <SheetContent
              side="bottom"
              className="max-h-[85vh] rounded-t-2xl border-t border-zinc-800 bg-zinc-950 p-4 text-zinc-100"
            >
              <SheetHeader className="pb-3 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                      <BellRing className="h-4 w-4" />
                    </div>
                    <div>
                      <SheetTitle className="text-base text-zinc-100">
                        Table Requests ({pendingRequestsCount})
                      </SheetTitle>
                      <SheetDescription className="text-xs text-zinc-400">
                        Guest taps from table QR self-service
                      </SheetDescription>
                    </div>
                  </div>
                  {pendingRequestsCount > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
                      disabled={resolveRequest.isPending}
                      onClick={handleResolveAll}
                    >
                      <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                      Resolve All
                    </Button>
                  )}
                </div>
              </SheetHeader>

              {/* Request List */}
              <div className="mt-3 flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {tableRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Check className="h-8 w-8 text-emerald-400 mb-2 opacity-80" />
                    <p className="text-sm font-medium text-zinc-300">All caught up!</p>
                    <p className="text-xs text-zinc-500">No pending waiter calls or bill requests.</p>
                  </div>
                ) : (
                  tableRequests.map((req: TableRequestRow) => (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl p-3 border transition-colors",
                        req.type === "BILL"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-200",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            req.type === "BILL"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-rose-500/20 text-rose-400",
                          )}
                        >
                          {req.type === "BILL" ? (
                            <Receipt className="h-4 w-4" />
                          ) : (
                            <BellRing className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-zinc-100 truncate">
                            {req.table.name ?? `Table ${req.table.number}`}
                          </p>
                          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <span>{req.type === "BILL" ? "Requested Bill" : "Called Waiter"}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(req.createdAt)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className={cn(
                          "h-9 px-3 shrink-0 rounded-lg font-medium",
                          req.type === "BILL"
                            ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
                            : "bg-rose-500 text-white hover:bg-rose-400",
                        )}
                        disabled={resolveRequest.isPending}
                        onClick={() => resolveRequest.mutate(req.id)}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Acknowledge
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Quick Manual Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleQuickRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800/80"
            title="Refresh floor & orders"
            aria-label="Refresh floor & orders"
          >
            <RotateCw className={cn("h-4 w-4 transition-transform", isRefreshing && "animate-spin")} />
          </Button>

          {/* Waiter / Staff Avatar Badge */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-zinc-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-medium text-zinc-200 truncate max-w-[90px]">
                {staffName}
              </span>
              <span className="text-[10px] text-zinc-500 leading-none">{staffRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Selector Horizontal Scrolling Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-3.5 py-2 no-scrollbar border-t border-zinc-800/60 bg-zinc-900/40">
        {/* "All Tables" Tab */}
        <button
          type="button"
          onClick={() => onSelectFloor(null)}
          className={cn(
            "flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-medium transition-all active:scale-95",
            selectedFloorId === null
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800/90 hover:text-zinc-100 border border-zinc-800/80",
          )}
        >
          <span>All Tables</span>
          <span
            className={cn(
              "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              selectedFloorId === null
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-zinc-800 text-zinc-400",
            )}
          >
            {totalTableCount}
          </span>
        </button>

        {/* Dynamic Floor Tabs */}
        {floors.map((floor) => {
          const count = floor.tables?.length || 0;
          const isSelected = selectedFloorId === floor.id;
          return (
            <button
              key={floor.id}
              type="button"
              onClick={() => onSelectFloor(floor.id)}
              className={cn(
                "flex h-11 min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-medium transition-all active:scale-95",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800/90 hover:text-zinc-100 border border-zinc-800/80",
              )}
            >
              <span className="truncate max-w-[120px]">{floor.name}</span>
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-zinc-800 text-zinc-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
