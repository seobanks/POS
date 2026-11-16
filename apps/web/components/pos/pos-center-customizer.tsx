"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ChefHat,
  Check,
  Flame,
  Info,
  Layers,
  Minus,
  Plus,
  Sparkles,
  UtensilsCrossed,
  X,
  Keyboard,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { MenuItem } from "@/hooks/use-menu";
import type { Portion } from "@/components/pos/cart-line";
import type { RestaurantTable } from "@/hooks/use-tables";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const QUICK_INSTRUCTION_PRESETS = [
  "Less Spicy",
  "Extra Spicy",
  "No Onion / Garlic",
  "Jain Prep",
  "Extra Crispy",
  "Sauce on Side",
  "Gluten Free",
  "Pack Separately",
];

interface PosCenterCustomizerProps {
  item: MenuItem | null;
  onConfirm: (
    item: MenuItem,
    portion: Portion | undefined,
    modifierIds: string[],
    modifierLabel: string,
    notes: string,
    quantity: number,
  ) => void;
  onCancel: () => void;
  activeTable?: RestaurantTable | null;
  onOpenTablePicker?: () => void;
  orderType: string;
  cartCount: number;
}

export function PosCenterCustomizer({
  item,
  onConfirm,
  onCancel,
  activeTable,
  onOpenTablePicker,
  orderType,
  cartCount,
}: PosCenterCustomizerProps) {
  const [portionKind, setPortionKind] = useState<"FULL" | "HALF">("FULL");
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Reset when item changes
  useEffect(() => {
    setPortionKind("FULL");
    setSelectedModifierIds([]);
    setNotes("");
    setQuantity(1);
  }, [item?.id]);

  // Compute live price
  const baseUnitPrice = useMemo(() => {
    if (!item) return 0;
    if (portionKind === "HALF" && item.halfPrice != null) {
      return Number(item.halfPrice);
    }
    return Number(item.price);
  }, [item, portionKind]);

  // Compute modifier add-on price
  const modifierPriceDelta = useMemo(() => {
    if (!item) return 0;
    let sum = 0;
    for (const group of item.modifierGroups) {
      const modifiers = (group.modifierGroup as any).modifiers || (group.modifierGroup as any).options || [];
      for (const opt of modifiers) {
        if (selectedModifierIds.includes(opt.id)) {
          sum += Number(opt.priceAdjustment || opt.priceDelta || 0);
        }
      }
    }
    return sum;
  }, [item, selectedModifierIds]);

  const unitPrice = baseUnitPrice + modifierPriceDelta;
  const lineTotal = unitPrice * quantity;

  // Toggle modifier
  const toggleModifier = (groupId: string, optionId: string, min = 0, max = 1) => {
    const group = item?.modifierGroups.find((g) => g.modifierGroup.id === groupId);
    const modifiers = ((group?.modifierGroup as any)?.modifiers || (group?.modifierGroup as any)?.options || []) as any[];
    const groupOptionIds = modifiers.map((o) => o.id);

    if (max === 1) {
      // Radio single-choice
      setSelectedModifierIds((prev) => [
        ...prev.filter((id) => !groupOptionIds.includes(id)),
        optionId,
      ]);
    } else {
      // Checkbox multi-choice
      setSelectedModifierIds((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId],
      );
    }
  };

  const addPresetNote = (preset: string) => {
    setNotes((prev) => (prev ? `${prev}, ${preset}` : preset));
  };

  const handleAdd = () => {
    if (!item) return;

    let portion: Portion | undefined;
    if (item.halfPrice != null) {
      portion = { kind: portionKind };
    }

    // Build modifier label summary
    const labels: string[] = [];
    if (item.halfPrice != null) {
      labels.push(portionKind === "HALF" ? "Half" : "Full");
    }
    for (const group of item.modifierGroups) {
      const modifiers = ((group.modifierGroup as any).modifiers || (group.modifierGroup as any).options || []) as any[];
      for (const opt of modifiers) {
        if (selectedModifierIds.includes(opt.id)) {
          labels.push(opt.name);
        }
      }
    }
    if (notes.trim()) {
      labels.push(notes.trim());
    }

    onConfirm(
      item,
      portion,
      selectedModifierIds,
      labels.join(", "),
      notes.trim(),
      quantity,
    );
  };

  // Keyboard shortcut listener for Enter to Add
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        e.preventDefault();
        handleAdd();
      } else if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, handleAdd, onCancel]);

  // EMPTY STATE: No item actively selected for customization
  if (!item) {
    return (
      <div className="flex h-full flex-col justify-between p-4 bg-card/60">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Station Overview
              </span>
            </div>
            <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
              {orderType.replace("_", " ")}
            </Badge>
          </div>

          {/* Active Table / Order Context Card */}
          {orderType === "DINE_IN" ? (
            <div
              onClick={onOpenTablePicker}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 cursor-pointer transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {activeTable ? activeTable.number : "—"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {activeTable ? activeTable.name || `Table ${activeTable.number}` : "Select Table"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeTable ? `${activeTable.capacity} Seats · Tap to switch` : "Assign table to order"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-xs font-medium">
                Change
              </Button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-border bg-card">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fast Counter Mode
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {orderType === "TAKEAWAY" ? "Direct Over-the-Counter Takeaway" : "Home Delivery Dispatch"}
              </p>
            </div>
          )}

          {/* Key Quick Tips / Shortcode Cheatsheet */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Keyboard className="h-4 w-4 text-primary" />
              <span>Keyboard Accelerators</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between bg-card p-2 rounded-md border border-border">
                <span>Search Menu</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] font-bold text-foreground">
                  /
                </kbd>
              </div>
              <div className="flex items-center justify-between bg-card p-2 rounded-md border border-border">
                <span>Complete Pay</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] font-bold text-foreground">
                  Space
                </kbd>
              </div>
              <div className="flex items-center justify-between bg-card p-2 rounded-md border border-border">
                <span>Hold Bill</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] font-bold text-foreground">
                  F4
                </kbd>
              </div>
              <div className="flex items-center justify-between bg-card p-2 rounded-md border border-border">
                <span>Print KOT</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] font-bold text-foreground">
                  F7
                </kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <UtensilsCrossed className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs font-medium text-muted-foreground">
            Tap any menu item to customize portions, spice levels, and cooking instructions.
          </p>
        </div>
      </div>
    );
  }

  // ACTIVE ITEM CUSTOMIZATION PANEL
  return (
    <div className="flex h-full flex-col justify-between overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border p-4 shrink-0 bg-muted/20">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className={cn(
              "h-3 w-3 rounded-full mt-1 shrink-0",
              item.isVeg ? "bg-emerald-600" : "bg-red-600",
            )}
          />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground leading-snug truncate">
              {item.name}
            </h3>
            {item.shortCode && (
              <span className="text-[11px] font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                #{item.shortCode}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Cancel customization"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Customization Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Portion Selector (if item has half price) */}
        {item.halfPrice != null && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Select Portion
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPortionKind("FULL")}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all",
                  portionKind === "FULL"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border bg-card text-foreground hover:bg-muted font-medium",
                )}
              >
                <div className="flex justify-between items-center text-xs">
                  <span>Full Portion</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(item.price)}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPortionKind("HALF")}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all",
                  portionKind === "HALF"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border bg-card text-foreground hover:bg-muted font-medium",
                )}
              >
                <div className="flex justify-between items-center text-xs">
                  <span>Half Portion</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(item.halfPrice)}</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Modifier Groups */}
        {item.modifierGroups.map((mg) => {
          const group = mg.modifierGroup;
          const modifiers = ((group as any).modifiers || (group as any).options || []) as any[];
          const minSelect = (group as any).minSelect || (group as any).minSelections || 0;
          const maxSelect = (group as any).maxSelect || (group as any).maxSelections || 1;

          return (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>{group.name}</span>
                  {minSelect > 0 && (
                    <span className="text-[10px] text-red-500 font-bold">*Required</span>
                  )}
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {maxSelect === 1 ? "Choose 1" : `Up to ${maxSelect}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {modifiers.map((opt) => {
                  const isSelected = selectedModifierIds.includes(opt.id);
                  const priceDelta = Number(opt.priceAdjustment || opt.priceDelta || 0);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        toggleModifier(group.id, opt.id, minSelect, maxSelect)
                      }
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg border text-xs transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      <span className="truncate pr-1">{opt.name}</span>
                      {priceDelta > 0 && (
                        <span className="tabular-nums font-semibold shrink-0">
                          +{formatCurrency(priceDelta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Special Instructions & Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Cooking Instructions
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_INSTRUCTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addPresetNote(preset)}
                className="px-2 py-1 rounded-md text-[11px] font-medium border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                + {preset}
              </button>
            ))}
          </div>
          <Input
            placeholder="Type special note (e.g. less oil, extra crispy)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        {/* Quantity Stepper */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quantity
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-8 text-center text-sm font-bold tabular-nums text-foreground">
              {quantity}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-border p-4 bg-muted/20 shrink-0">
        <Button
          type="button"
          onClick={handleAdd}
          className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 flex items-center justify-between px-4 active:scale-[0.98] transition-all"
        >
          <span>Add to Ticket</span>
          <span className="tabular-nums font-extrabold text-base">
            {formatCurrency(lineTotal)}
          </span>
        </Button>
      </div>
    </div>
  );
}
