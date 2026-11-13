"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Flame,
  Loader2,
  Printer,
  Receipt,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type OpenOrder } from "@/hooks/use-orders";
import { usePrintOrderUsb } from "@/hooks/use-print";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface RunningTableDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OpenOrder | null;
  branchId: string | null;
}

export function RunningTableDrawer({
  open,
  onOpenChange,
  order,
  branchId,
}: RunningTableDrawerProps) {
  const router = useRouter();
  const printUsb = usePrintOrderUsb(branchId);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!order) return null;

  const tableName =
    order.table?.name || (order.table ? `Table ${order.table.number}` : "Table");
  const estimatedTotal = Number(order.totalAmount || 0);
  const kotsCount = order.kots?.length || (order.items.length > 0 ? 1 : 0);
  const noOfPeople = order.guestCount || 1;
  const assignedTo = order.createdBy?.name || "Staff";

  const handlePrintThermalBill = () => {
    setIsPrinting(true);
    printUsb.mutate(
      { orderId: order.id, drawer: false },
      {
        onSuccess: () => {
          setIsPrinting(false);
          toast.success(`Thermal bill printed for ${tableName}!`);
        },
        onError: (err: any) => {
          setIsPrinting(false);
          toast.error(err?.message || "Could not print bill");
        },
      },
    );
  };

  const handleOpenInPos = () => {
    onOpenChange(false);
    if (order.tableId) {
      router.push(`/pos?tableId=${encodeURIComponent(order.tableId)}`);
    } else {
      router.push("/pos");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background text-foreground border-l border-border"
      >
        {/* Drawer Header */}
        <SheetHeader className="px-5 py-4 border-b border-border/80 flex flex-row items-center justify-between shrink-0">
          <div>
            <SheetTitle className="text-lg font-bold text-foreground">
              {tableName}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Running Order #{order.orderNumber}
            </SheetDescription>
          </div>
        </SheetHeader>

        {/* 4 Summary Metric Tiles (Matches Petpooja Image 3) */}
        <div className="p-5 pb-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Tile 1: Estimated Total */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground">
                Estimated Total
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                {formatCurrency(estimatedTotal)}
              </span>
            </div>

            {/* Tile 2: KOTs */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground">
                KOTs
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                {kotsCount}
              </span>
            </div>

            {/* Tile 3: No. of People */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground">
                No. of People
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                {noOfPeople}
              </span>
            </div>

            {/* Tile 4: Assigned To */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-medium text-muted-foreground">
                Assigned To
              </span>
              <span className="text-sm font-bold text-foreground truncate max-w-[130px] mt-1">
                {assignedTo}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Table (Matches Petpooja Image 3) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2">
          <div className="rounded-xl border border-border/70 overflow-hidden">
            <div className="grid grid-cols-12 bg-secondary/60 px-3.5 py-2 text-xs font-semibold text-muted-foreground border-b border-border/70">
              <span className="col-span-7">Item Name</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-3 text-right">Price</span>
            </div>
            <div className="divide-y divide-border/40 max-h-[360px] overflow-y-auto">
              {order.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No items staged for this table.
                </div>
              ) : (
                order.items.map((item) => {
                  const lineTotal = Number(item.lineTotal || 0);
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 px-3.5 py-2.5 text-xs items-center hover:bg-secondary/20 transition-colors"
                    >
                      <div className="col-span-7 min-w-0 pr-2">
                        <span className="font-medium text-foreground truncate block">
                          {item.nameSnapshot}
                        </span>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            +{item.modifiers.map((m) => m.nameSnapshot).join(", ")}
                          </span>
                        )}
                        {typeof item.kitchenNote === "string" && item.kitchenNote.length > 0 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 italic block">
                            &ldquo;{String(item.kitchenNote)}&rdquo;
                          </span>
                        )}
                      </div>
                      <span className="col-span-2 text-center font-bold tabular-nums text-foreground">
                        {item.quantity}
                      </span>
                      <span className="col-span-3 text-right font-semibold tabular-nums text-foreground">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border/80 bg-background/95 flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            className="flex-1 h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            onClick={handlePrintThermalBill}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>Print Bill (Thermal)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 rounded-xl text-xs font-bold gap-2 border-border hover:bg-secondary"
            onClick={handleOpenInPos}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <span>Open in POS</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
