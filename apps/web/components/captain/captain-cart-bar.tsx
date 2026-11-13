"use client";

import { useMemo, useState } from "react";
import {
  ChefHat,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAddOrderItems,
  useCreateOrder,
  type CreatedOrder,
} from "@/hooks/use-orders";
import { useOfflinePos } from "@/hooks/use-offline-pos";
import { usePrintKot } from "@/hooks/use-print";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CaptainCartLine } from "./captain-types";

export interface CaptainCartBarProps {
  branchId: string | null;
  tableId: string;
  tableNumber: string;
  existingOrderId?: string | null;
  guestCount?: number;
  cartLines: CaptainCartLine[];
  onIncrementLine: (key: string) => void;
  onDecrementLine: (key: string) => void;
  onRemoveLine: (key: string) => void;
  onClearCart: () => void;
  onOrderDispatched?: (order: CreatedOrder) => void;
}

export function CaptainCartBar({
  branchId,
  tableId,
  tableNumber,
  existingOrderId,
  guestCount,
  cartLines,
  onIncrementLine,
  onDecrementLine,
  onRemoveLine,
  onClearCart,
  onOrderDispatched,
}: CaptainCartBarProps) {
  const [reviewOpen, setReviewOpen] = useState(false);

  const createOrder = useCreateOrder(branchId);
  const addOrderItems = useAddOrderItems(branchId);
  const printKot = usePrintKot(branchId);
  const { isOnline, saveOfflineOrder } = useOfflinePos({ branchId });

  const isSubmitting = createOrder.isPending || addOrderItems.isPending;

  // Total items count and subtotal
  const totalCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines],
  );

  const subtotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cartLines],
  );

  if (cartLines.length === 0) {
    return null;
  }

  const handleSendKot = () => {
    if (cartLines.length === 0 || isSubmitting) return;

    // Offline mode fallback: store in IndexedDB and queue for auto-sync
    if ((!isOnline || (typeof navigator !== "undefined" && !navigator.onLine)) && branchId) {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([80, 50, 80]);
        } catch {
          // Ignore vibration failures
        }
      }

      const offlineItems = cartLines.map((l) => ({
        menuItemId: l.menuItemId,
        nameSnapshot: l.name,
        quantity: l.quantity,
        unitPrice: l.customPrice ?? l.unitPrice,
        kitchenNote: l.kitchenNote,
        modifiers: l.modifierLabels.map((label, idx) => ({
          modifierId: l.modifierIds[idx],
          nameSnapshot: label,
          price: 0,
        })),
      }));

      void saveOfflineOrder({
        branchId,
        orderType: "DINE_IN",
        tableId,
        guestCount: guestCount && guestCount > 0 ? guestCount : undefined,
        items: offlineItems,
      }).then(() => {
        onClearCart();
        setReviewOpen(false);
      });
      return;
    }

    const items = cartLines.map((l) => ({
      menuItemId: l.menuItemId,
      quantity: l.quantity,
      modifierIds: l.modifierIds,
      kitchenNote: l.kitchenNote,
      ...(l.portion
        ? {
            portion: l.portion,
            customPrice: l.customPrice,
            ...(l.portion === "CUSTOM" ? { customLabel: l.customLabel } : {}),
          }
        : {}),
    }));

    const triggerHapticsAndPrint = (order: CreatedOrder, message: string) => {
      // 1. Mobile haptic feedback pattern
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([60, 80, 60]);
        } catch {
          // Ignore vibration failures if unsupported
        }
      }

      // 2. Dispatch thermal KOT print
      if (branchId) {
        printKot.mutate(
          { orderId: order.id },
          {
            onSuccess: () => {
              // Thermal printer accepted KOT
            },
            onError: (err) => {
              // Non-blocking: order is created even if thermal printer is offline
              console.warn("Could not print KOT to thermal printer:", err);
            },
          },
        );
      }

      // 3. Clear cart & close review modal
      onClearCart();
      setReviewOpen(false);
      toast.success(message);
      onOrderDispatched?.(order);
    };

    if (existingOrderId) {
      // Existing open order: append items
      addOrderItems.mutate(
        { orderId: existingOrderId, dto: { items } },
        {
          onSuccess: (order) =>
            triggerHapticsAndPrint(
              order,
              `New Round added to Order #${order.orderNumber} for Table ${tableNumber}!`,
            ),
          onError: (err) =>
            toast.error(
              err instanceof ApiError ? err.message : "Could not add items to order",
            ),
        },
      );
    } else {
      // Fresh order for this table
      createOrder.mutate(
        {
          type: "DINE_IN",
          tableId,
          guestCount: guestCount && guestCount > 0 ? guestCount : undefined,
          items,
        },
        {
          onSuccess: (order) =>
            triggerHapticsAndPrint(
              order,
              `Order #${order.orderNumber} created & KOT punched for Table ${tableNumber}!`,
            ),
          onError: (err) =>
            toast.error(
              err instanceof ApiError ? err.message : "Could not create order",
            ),
        },
      );
    }
  };

  return (
    <>
      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          {/* Left: Tap to review cart */}
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="flex items-center gap-2 text-left p-1 rounded-xl hover:bg-secondary/60 active:scale-95 transition-all"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full tabular-nums">
                  {totalCount}
                </span>
                <span className="text-xs font-semibold text-foreground flex items-center gap-0.5">
                  View Staged <ChevronUp className="h-3 w-3 text-muted-foreground" />
                </span>
              </div>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </button>

          {/* Right: Big Thumb-Friendly Primary Button */}
          <Button
            type="button"
            size="lg"
            className="h-12 px-5 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-[0.98] gap-2 transition-all"
            disabled={isSubmitting}
            onClick={handleSendKot}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ChefHat className="h-5 w-5 stroke-[2.2]" />
            )}
            <span>
              {isSubmitting
                ? "Punching KOT..."
                : existingOrderId
                  ? "Send KOT to Kitchen"
                  : "Start Order & Send KOT"}
            </span>
          </Button>
        </div>
      </div>

      {/* Cart Review Sheet / Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl flex flex-col max-h-[85vh]">
          <DialogHeader className="p-4 border-b border-border bg-card/60 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                <span>Staged Dishes for Table {tableNumber}</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Review items before sending ticket to the kitchen
              </p>
            </div>
          </DialogHeader>

          {/* Staged lines list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cartLines.map((line) => (
              <div
                key={line.key}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-3 w-3 rounded-xs border p-0.5 shrink-0",
                        line.isVeg
                          ? "border-emerald-600 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                          : "border-amber-700 bg-amber-50 text-amber-700 dark:bg-amber-950/30",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1 w-1 rounded-full",
                          line.isVeg ? "bg-emerald-600" : "bg-amber-700",
                        )}
                      />
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate">
                      {line.name}
                    </span>
                  </div>

                  {line.portion && (
                    <span className="text-[11px] text-muted-foreground block">
                      Portion: {line.portion}
                    </span>
                  )}

                  {line.modifierLabels.length > 0 && (
                    <span className="text-[11px] text-muted-foreground block">
                      + {line.modifierLabels.join(", ")}
                    </span>
                  )}

                  {line.kitchenNote && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 italic block font-medium">
                      Note: &ldquo;{line.kitchenNote}&rdquo;
                    </span>
                  )}

                  <div className="text-xs font-bold text-foreground tabular-nums mt-1">
                    {formatCurrency(line.unitPrice * line.quantity)}
                  </div>
                </div>

                {/* Right: Stepper and Remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border border-border rounded-xl bg-background p-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => onDecrementLine(line.key)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-xs font-bold tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => onIncrementLine(line.key)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                    onClick={() => onRemoveLine(line.key)}
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Sheet Footer */}
          <DialogFooter className="p-4 border-t border-border bg-card/80 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Staged Subtotal:</span>
              <span className="text-base font-bold text-foreground tabular-nums">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <Button
              type="button"
              className="w-full h-12 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98] gap-2"
              disabled={isSubmitting}
              onClick={handleSendKot}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ChefHat className="h-5 w-5 stroke-[2.2]" />
              )}
              <span>
                {isSubmitting
                  ? "Punching KOT..."
                  : existingOrderId
                    ? "Confirm & Punch KOT"
                    : "Create Order & Punch KOT"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
