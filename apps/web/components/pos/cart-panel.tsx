"use client";

import {
  ChefHat,
  CreditCard,
  Minus,
  PauseCircle,
  Plus,
  Printer,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Truck,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CartLine } from "@/components/pos/cart-line";
import type { RestaurantTable } from "@/hooks/use-tables";
import { formatCurrency } from "@/lib/format";
import { subtotalOf } from "@/lib/pricing-preview";
import { cn } from "@/lib/utils";

export type PosOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export interface DeliveryDetails {
  address: string;
  pincode: string;
  phone: string;
}

export function CartPanel({
  lines,
  orderType,
  onOrderTypeChange,
  tables,
  tableId,
  onTableChange,
  onIncrement,
  onDecrement,
  onRemove,
  onSubmit,
  onPrintBill,
  onQuickPay,
  onHold,
  isSubmitting,
  existingOrderNumber,
  onViewExistingOrder,
  openBills,
  selectedBillId,
  onSelectBill,
  checkingTable = false,
  delivery,
  onDeliveryChange,
  scheduledFor,
  onScheduledForChange,
}: {
  lines: CartLine[];
  orderType: PosOrderType;
  onOrderTypeChange: (type: PosOrderType) => void;
  tables: RestaurantTable[];
  tableId: string;
  onTableChange: (id: string) => void;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onRemove: (key: string) => void;
  onSubmit: () => void;
  onPrintBill?: () => void;
  onQuickPay?: () => void;
  onHold?: () => void;
  isSubmitting: boolean;
  existingOrderNumber?: string;
  onViewExistingOrder?: () => void;
  /** All unpaid bills on the selected table (more than one is possible). */
  openBills?: { id: string; orderNumber: string }[];
  selectedBillId?: string | null;
  onSelectBill?: (id: string) => void;
  /** The table's open bills are still loading - sending now could start a duplicate bill. */
  checkingTable?: boolean;
  delivery: DeliveryDetails;
  onDeliveryChange: (d: DeliveryDetails) => void;
  scheduledFor: string;
  onScheduledForChange: (v: string) => void;
}) {
  const subtotal = subtotalOf(lines.map((l) => l.unitPrice * l.quantity));
  const deliveryReady =
    orderType !== "DELIVERY" ||
    (delivery.address.trim().length >= 5 &&
      delivery.pincode.trim().length >= 3 &&
      delivery.phone.trim().length >= 6);

  const canSubmit =
    lines.length > 0 &&
    (orderType !== "DINE_IN" || !!tableId) &&
    deliveryReady &&
    !isSubmitting &&
    !checkingTable;

  const currentTable = tables.find((t) => t.id === tableId);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Order Type Switcher Tabs with Keyboard Shortcuts */}
      <Tabs value={orderType} onValueChange={(v) => onOrderTypeChange(v as PosOrderType)}>
        <TabsList className="w-full h-11 p-1 rounded-xl bg-muted/60 border border-border gap-1">
          <TabsTrigger
            value="DINE_IN"
            className="flex-1 h-full rounded-lg text-xs font-bold gap-1.5 data-active:bg-background data-active:text-foreground data-active:shadow-2xs transition-all"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" />
            <span>Dine-in</span>
            <kbd className="hidden sm:inline font-mono text-[9px] text-muted-foreground opacity-70">
              F1
            </kbd>
          </TabsTrigger>
          <TabsTrigger
            value="TAKEAWAY"
            className="flex-1 h-full rounded-lg text-xs font-bold gap-1.5 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-2xs transition-all"
          >
            <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
            <span>Takeaway</span>
            <kbd className="hidden sm:inline font-mono text-[9px] opacity-80">F2</kbd>
          </TabsTrigger>
          <TabsTrigger
            value="DELIVERY"
            className="flex-1 h-full rounded-lg text-xs font-bold gap-1.5 data-active:bg-background data-active:text-foreground data-active:shadow-2xs transition-all"
          >
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span>Delivery</span>
            <kbd className="hidden sm:inline font-mono text-[9px] text-muted-foreground opacity-70">
              F3
            </kbd>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Dine-in Table Selector */}
      {orderType === "DINE_IN" && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select value={tableId} onValueChange={(v) => onTableChange(v ?? "")}>
              <SelectTrigger className="w-full h-10 rounded-xl text-xs font-semibold bg-card border-border">
                <SelectValue placeholder="Select Table (Required for Dine-in)">
                  {(value: string | null) => {
                    const t = tables.find((table) => table.id === value);
                    if (!t) return "Select Table";
                    return `${t.name ?? `Table ${t.number}`} (${t.capacity} seats)${t.status === "OCCUPIED" ? " · Occupied" : " · Free"}`;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name ?? `Table ${t.number}`} ({t.capacity} seats){" "}
                    {t.status === "OCCUPIED" ? "· Occupied" : "· Free"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {currentTable && (
            <div
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border tabular-nums shrink-0",
                currentTable.status === "OCCUPIED"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
              )}
            >
              {currentTable.status === "OCCUPIED" ? "Occupied" : "Available"}
            </div>
          )}
        </div>
      )}

      {/* Delivery Form */}
      {orderType === "DELIVERY" && (
        <div className="flex flex-col gap-2 bg-muted/20 p-2.5 rounded-xl border border-border">
          <Input
            placeholder="Delivery Address *"
            value={delivery.address}
            onChange={(e) => onDeliveryChange({ ...delivery, address: e.target.value })}
            className="h-9 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Pincode *"
              inputMode="numeric"
              value={delivery.pincode}
              onChange={(e) => onDeliveryChange({ ...delivery, pincode: e.target.value })}
              className="h-9 text-xs"
            />
            <Input
              placeholder="Customer Phone *"
              inputMode="tel"
              value={delivery.phone}
              onChange={(e) => onDeliveryChange({ ...delivery, phone: e.target.value })}
              className="h-9 text-xs"
            />
          </div>
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => onScheduledForChange(e.target.value)}
            className="h-8 text-xs text-muted-foreground"
          />
        </div>
      )}

      {/* Table status alerts & multiple open bills switcher */}
      {checkingTable && (
        <p
          role="status"
          className="rounded-lg bg-secondary/80 px-3 py-1.5 text-xs text-muted-foreground animate-pulse"
        >
          Checking open orders on this table…
        </p>
      )}

      {openBills && openBills.length > 1 && (
        <div
          className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-muted/40 border border-border text-xs"
          role="group"
          aria-label="Open bills on this table"
        >
          <span className="text-muted-foreground font-medium">Add to Bill:</span>
          {openBills.map((b) => (
            <Button
              key={b.id}
              type="button"
              size="sm"
              variant={b.id === selectedBillId ? "default" : "outline"}
              className="h-6 px-2 text-[11px] font-bold"
              onClick={() => onSelectBill?.(b.id)}
            >
              #{b.orderNumber}
            </Button>
          ))}
        </div>
      )}

      {existingOrderNumber && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <span>
            Open Order <strong className="font-bold">#{existingOrderNumber}</strong> active on table
          </span>
          {onViewExistingOrder && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 shrink-0 px-2 text-[11px] font-bold border-amber-500/30 text-amber-700 dark:text-amber-300"
              onClick={onViewExistingOrder}
            >
              View & Settle
            </Button>
          )}
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground py-10">
            <ShoppingCart className="h-10 w-10 opacity-30 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Current Ticket Empty</p>
            <p className="text-[11px] text-muted-foreground max-w-[200px]">
              Tap products from the menu or press <kbd className="font-mono text-foreground font-bold">/</kbd> to search.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {lines.map((line) => (
              <div key={line.key} className="flex items-start justify-between gap-2.5 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs sm:text-[13px] font-bold text-foreground leading-snug truncate">
                      {line.name}
                    </p>
                    <span className="text-xs font-extrabold tabular-nums text-foreground shrink-0">
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </span>
                  </div>

                  {line.portion && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1 py-0.2 rounded mt-0.5 inline-block">
                      {line.portion.kind === "HALF" ? "Half Portion" : "Full Portion"}
                    </span>
                  )}

                  {line.modifierLabel && (
                    <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                      {line.modifierLabel}
                    </p>
                  )}

                  <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                    {formatCurrency(line.unitPrice)} × {line.quantity}
                  </div>
                </div>

                {/* Tactile Stepper Buttons */}
                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-md border-border active:scale-95"
                    onClick={() => onDecrement(line.key)}
                    aria-label={`Decrease ${line.name}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-5 text-center text-xs font-bold tabular-nums text-foreground">
                    {line.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-md border-border active:scale-95"
                    onClick={() => onIncrement(line.key)}
                    aria-label={`Increase ${line.name}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-md ml-0.5"
                    onClick={() => onRemove(line.key)}
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial Summary & Total */}
      <div className="flex flex-col gap-2.5 border-t border-border pt-3 mt-auto shrink-0 bg-muted/10">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Items ({lines.reduce((acc, l) => acc + l.quantity, 0)})</span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(subtotal)}
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1 border-t border-border/60">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total Payable
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground tracking-tight">
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Operational Action Buttons Bar */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Action 1: Print Bill (Guest Slip) */}
          <Button
            type="button"
            variant="outline"
            className="h-11 text-xs font-bold border-border gap-1.5 active:scale-[0.98] shadow-2xs"
            disabled={!canSubmit}
            onClick={onPrintBill ?? onSubmit}
            title="Print bill receipt for customer check (F8)"
          >
            <Printer className="h-4 w-4" />
            <span>Print Bill</span>
            <kbd className="hidden sm:inline font-mono text-[9px] text-muted-foreground opacity-70">
              F8
            </kbd>
          </Button>

          {/* Action 2: Send to Kitchen / KOT */}
          <Button
            type="button"
            variant="outline"
            className="h-11 text-xs font-bold border-border gap-1.5 active:scale-[0.98] shadow-2xs"
            disabled={!canSubmit}
            onClick={onSubmit}
            title="Dispatch order tickets to kitchen display & KOT printers (F7)"
          >
            <ChefHat className="h-4 w-4 text-amber-500" />
            <span>{isSubmitting ? "Sending…" : "KOT Kitchen"}</span>
            <kbd className="hidden sm:inline font-mono text-[9px] text-muted-foreground opacity-70">
              F7
            </kbd>
          </Button>
        </div>

        {/* Action 3: Primary Fast Settle & Pay Button (Space / F9) */}
        <Button
          type="button"
          className="h-13 w-full text-sm font-extrabold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98] gap-2 transition-all flex items-center justify-between px-4"
          disabled={!canSubmit}
          onClick={onQuickPay ?? (onPrintBill ?? onSubmit)}
          title="Instant Payment Settlement (Space or F9)"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
            <span>Settle & Pay</span>
            <kbd className="hidden sm:inline font-mono text-[10px] bg-primary-foreground/20 text-primary-foreground px-1.5 py-0.5 rounded font-bold">
              Space
            </kbd>
          </div>
          <span className="tabular-nums text-base font-black">
            {formatCurrency(subtotal)}
          </span>
        </Button>
      </div>
    </div>
  );
}
