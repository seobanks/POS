"use client";

import { useState } from "react";
import {
  BellRing,
  ChefHat,
  ClipboardList,
  Clock,
  Layers,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { ScanOrderInput } from "@/components/orders/scan-order-input";
import { DeleteOrdersDialog } from "@/components/orders/delete-orders-dialog";
import { ChannelBadge, TypeBadge } from "@/components/orders/channel-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import {
  useManagedOrders,
  type ManagedOrder,
  type OrderChannel,
} from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/format";
import { openEntity } from "@/lib/entity-events";
import { cn } from "@/lib/utils";
import { LiveOrdersView } from "@/components/orders/live-orders-view";
import { AllOrdersView } from "@/components/orders/all-orders-view";
import { KotAuditView } from "@/components/orders/kot-audit-view";
import { FloatingAiAgent } from "@/components/ai/floating-ai-agent";

type PrimaryTab = "live" | "all" | "kot" | "pending";

const FILTERS: { key: string; label: string; channel?: OrderChannel; type?: string }[] = [
  { key: "all", label: "All" },
  { key: "online", label: "Online", channel: "ONLINE" },
  { key: "offline", label: "Offline", channel: "STAFF" },
  { key: "takeaway", label: "Takeaway", type: "TAKEAWAY" },
  { key: "delivery", label: "Delivery", type: "DELIVERY" },
  { key: "dinein", label: "Dine-in", type: "DINE_IN" },
];

const chip = (on: boolean) =>
  cn(
    "rounded-xl border px-4 py-2 text-xs font-bold transition-all",
    on
      ? "border-primary bg-primary text-primary-foreground shadow-xs"
      : "border-border/80 bg-background text-muted-foreground hover:bg-secondary",
  );

function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export default function OrdersPage() {
  const { branchId } = useBranch();
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("live");

  // Filter state for pending online orders
  const [filterKey, setFilterKey] = useState("all");
  const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0];
  const { data: pendingOrders = [], isLoading: pendingLoading } = useManagedOrders(
    branchId,
    "pending",
    filter.channel,
    filter.type,
  );
  const pendingCount = pendingOrders.length;

  // Multi-select for delete if needed
  const { data: me } = useCurrentUser();
  const canDelete =
    hasPermission(me?.user, "orders.delete") &&
    ["OWNER", "ADMINISTRATOR"].includes(me?.user.roleName ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const visibleSelected = pendingOrders
    .filter((o) => selected.has(o.id))
    .map((o) => o.id);

  return (
    <div className="flex flex-col gap-6 relative min-h-[calc(100vh-80px)]">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Daily Operations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Live orders dashboard, running tables, 15-day revenue trend & KOT audit trail
          </p>
        </div>
      </div>

      {/* Primary Tab Switcher (Matches Petpooja Daily Operations layout) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        {/* Tab 1: Live Orders */}
        <button
          type="button"
          onClick={() => setPrimaryTab("live")}
          className={chip(primaryTab === "live")}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            Live Orders
          </span>
        </button>

        {/* Tab 2: All Orders */}
        <button
          type="button"
          onClick={() => setPrimaryTab("all")}
          className={chip(primaryTab === "all")}
        >
          <span className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            All Orders
          </span>
        </button>

        {/* Tab 3: KOT Audit */}
        <button
          type="button"
          onClick={() => setPrimaryTab("kot")}
          className={chip(primaryTab === "kot")}
        >
          <span className="flex items-center gap-1.5">
            <ChefHat className="h-3.5 w-3.5" />
            KOT Master Log
          </span>
        </button>

        {/* Tab 4: New / Pending Online Acceptance Gate */}
        <button
          type="button"
          onClick={() => setPrimaryTab("pending")}
          className={chip(primaryTab === "pending")}
        >
          <span className="flex items-center gap-1.5">
            <BellRing className="h-3.5 w-3.5" />
            New Online Orders
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.2 text-[10px] text-destructive-foreground font-bold animate-pulse">
                {pendingCount}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      {primaryTab === "live" && <LiveOrdersView branchId={branchId} />}

      {primaryTab === "all" && <AllOrdersView branchId={branchId} />}

      {primaryTab === "kot" && <KotAuditView branchId={branchId} />}

      {primaryTab === "pending" && (
        <div className="space-y-4">
          <ScanOrderInput branchId={branchId} />

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterKey(f.key)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                  filterKey === f.key
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Card className="flex flex-col divide-y divide-border/60 p-2 rounded-2xl border border-border shadow-xs bg-card">
            {pendingLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : pendingOrders.length > 0 ? (
              pendingOrders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  selectable={false}
                  selected={false}
                  onToggle={() => {}}
                />
              ))
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <BellRing className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-bold text-foreground">
                  No online orders waiting for acceptance
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  New orders submitted by customers or online portals will appear
                  here with immediate audio alerts.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Floating AI Agent Widget (Matches Petpooja Images 1-5) */}
      <FloatingAiAgent />
    </div>
  );
}

function OrderRow({
  order,
  selectable,
  selected,
  onToggle,
}: {
  order: ManagedOrder;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const name = order.guestName ?? order.customer?.name ?? "Walk-in guest";
  const summary = order.items
    .map((i) => `${i.quantity}× ${i.nameSnapshot}`)
    .join(", ");
  const rejected = order.acceptance === "REJECTED";

  return (
    <div
      className={cn(
        "flex items-start gap-1 rounded-xl transition-colors duration-150",
        selected && "bg-primary/5",
      )}
    >
      {selectable && (
        <div className="flex h-full items-center py-4 pl-4">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`Select transaction #${order.orderNumber}`}
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => openEntity("Order", order.id)}
        className="flex flex-1 items-start justify-between gap-4 rounded-xl px-4 py-3 text-left transition hover:bg-secondary/40"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-foreground tabular-nums">
              #{order.orderNumber}
            </span>
            <span className="text-sm font-medium text-foreground">{name}</span>
            <ChannelBadge channel={order.channel} />
            <TypeBadge type={order.type} />
            {order.acceptance === "PENDING" && (
              <Badge className="font-semibold bg-amber-500 text-white">
                Needs action
              </Badge>
            )}
            {rejected && (
              <Badge variant="secondary" className="font-normal">
                Rejected
              </Badge>
            )}
            {!rejected && order.status === "CANCELLED" && (
              <Badge variant="secondary" className="font-normal">
                Cancelled
              </Badge>
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {summary}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {formatCurrency(order.totalAmount)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {timeAgo(order.createdAt)}
          </span>
        </div>
      </button>
    </div>
  );
}
