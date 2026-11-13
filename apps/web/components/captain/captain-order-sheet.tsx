"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Clock,
  Receipt,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBranch } from "@/hooks/use-branch";
import { useFloors } from "@/hooks/use-tables";
import { useOpenOrdersForTable } from "@/hooks/use-orders";
import type { MenuItem } from "@/hooks/use-menu";
import { cn } from "@/lib/utils";
import { CaptainMenuBrowser } from "./captain-menu-browser";
import { CaptainModifierDialog } from "./captain-modifier-dialog";
import { CaptainRunningOrder } from "./captain-running-order";
import { CaptainCartBar } from "./captain-cart-bar";
import type { CaptainCartLine } from "./captain-types";

export interface CaptainOrderSheetProps {
  tableId: string;
  onBack: () => void;
}

export function CaptainOrderSheet({ tableId, onBack }: CaptainOrderSheetProps) {
  const { branchId } = useBranch();
  const { data: floors = [] } = useFloors(branchId);
  const { data: openOrders = [], isLoading: ordersLoading } = useOpenOrdersForTable(
    branchId,
    tableId,
  );

  // Locate table metadata and floor name
  const { table, floorName } = useMemo(() => {
    for (const floor of floors) {
      const found = floor.tables.find((t) => t.id === tableId);
      if (found) {
        return { table: found, floorName: floor.name };
      }
    }
    return { table: null, floorName: "" };
  }, [floors, tableId]);

  const activeOrder = openOrders[0] ?? null;

  // Staged cart lines for current punching session
  const [cartLines, setCartLines] = useState<CaptainCartLine[]>([]);
  const [guestCount, setGuestCount] = useState<number>(table?.capacity || 2);

  // Active view tab: if running order exists, allow switching between "menu" and "running"
  const [activeTab, setActiveTab] = useState<"menu" | "running">("menu");

  // Modifier dialog state
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [modifierOpen, setModifierOpen] = useState(false);

  // Cart operations
  const handleAddLine = (line: CaptainCartLine) => {
    setCartLines((prev) => {
      const index = prev.findIndex((l) => l.key === line.key);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          quantity: copy[index].quantity + line.quantity,
        };
        return copy;
      }
      return [...prev, line];
    });
  };

  const handleIncrementLine = (key: string) => {
    setCartLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l)),
    );
  };

  const handleDecrementLine = (key: string) => {
    setCartLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    );
  };

  const handleRemoveLine = (key: string) => {
    setCartLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleClearCart = () => {
    setCartLines([]);
  };

  const openModifierForItem = (item: MenuItem) => {
    setModifierItem(item);
    setModifierOpen(true);
  };

  const tableNumberDisplay = table?.number || "—";

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Top Header */}
      <header className="px-3 py-2.5 border-b border-border/80 bg-background/95 backdrop-blur-sm flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0 -ml-1 text-foreground"
            onClick={onBack}
            title="Back to Table Grid"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold truncate">
                Table {tableNumberDisplay}
              </h2>
              {floorName && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  • {floorName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activeOrder ? (
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Order #{activeOrder.orderNumber}
                </span>
              ) : (
                <span>Vacant Table</span>
              )}
              {table?.capacity && (
                <span className="flex items-center gap-0.5">
                  <Users className="h-3 w-3" />
                  {table.capacity} seats
                </span>
              )}
            </div>
          </div>
        </div>

        {/* View Switcher if running order is present */}
        {activeOrder && (
          <div className="flex items-center rounded-xl bg-secondary p-1 border border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("menu")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === "menu"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              <span>Menu</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("running")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === "running"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Running</span>
            </button>
          </div>
        )}
      </header>

      {/* Guest count quick picker (if creating a new order) */}
      {!activeOrder && (
        <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center justify-between text-xs shrink-0">
          <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Guests:
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 6, 8].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setGuestCount(num)}
                className={cn(
                  "h-7 w-7 rounded-lg text-xs font-bold transition-all",
                  guestCount === num
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body View */}
      <main className="flex-1 min-h-0 relative">
        {activeTab === "running" && activeOrder ? (
          <CaptainRunningOrder
            branchId={branchId}
            orderId={activeOrder.id}
            tableNumber={tableNumberDisplay}
            onAddMoreItems={() => setActiveTab("menu")}
          />
        ) : (
          <div className={cn("h-full", cartLines.length > 0 && "pb-20")}>
            <CaptainMenuBrowser
              branchId={branchId}
              cartLines={cartLines}
              onAddLine={handleAddLine}
              onIncrementLine={handleIncrementLine}
              onDecrementLine={handleDecrementLine}
              onOpenModifierDialog={openModifierForItem}
            />
          </div>
        )}
      </main>

      {/* Sticky Bottom Cart Bar */}
      <CaptainCartBar
        branchId={branchId}
        tableId={tableId}
        tableNumber={tableNumberDisplay}
        existingOrderId={activeOrder?.id}
        guestCount={guestCount}
        cartLines={cartLines}
        onIncrementLine={handleIncrementLine}
        onDecrementLine={handleDecrementLine}
        onRemoveLine={handleRemoveLine}
        onClearCart={handleClearCart}
        onOrderDispatched={(order) => {
          // Switch to running order view after KOT punch
          setActiveTab("running");
        }}
      />

      {/* Modifier & Notes Dialog */}
      <CaptainModifierDialog
        open={modifierOpen}
        onOpenChange={setModifierOpen}
        item={modifierItem}
        onConfirm={handleAddLine}
      />
    </div>
  );
}
