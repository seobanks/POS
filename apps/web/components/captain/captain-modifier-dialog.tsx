"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Flame, Minus, Plus, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "@/hooks/use-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { generateCaptainCartKey, type CaptainCartLine } from "./captain-types";

const PRESET_NOTES = [
  "Less Spicy",
  "Extra Spicy",
  "Medium Spicy",
  "No Garlic",
  "No Onion",
  "Jain Prep",
  "No Coriander",
  "Serve First",
  "Extra Crispy",
  "Less Oil",
];

export interface CaptainModifierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onConfirm: (line: CaptainCartLine) => void;
}

export function CaptainModifierDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: CaptainModifierDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl flex flex-col max-h-[90vh]">
        <CaptainModifierBody
          key={item.id}
          item={item}
          onClose={() => onOpenChange(false)}
          onConfirm={(line) => {
            onConfirm(line);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CaptainModifierBody({
  item,
  onClose,
  onConfirm,
}: {
  item: MenuItem;
  onClose: () => void;
  onConfirm: (line: CaptainCartLine) => void;
}) {
  const [portion, setPortion] = useState<"FULL" | "HALF">("FULL");
  const [quantity, setQuantity] = useState(1);
  const [cookingNote, setCookingNote] = useState("");

  // Initialize default modifiers
  const initialModifiers = useMemo(() => {
    const defaults = new Set<string>();
    for (const groupRel of item.modifierGroups ?? []) {
      for (const mod of groupRel.modifierGroup?.modifiers ?? []) {
        if (mod.isDefault) {
          defaults.add(mod.id);
        }
      }
    }
    return defaults;
  }, [item]);

  const [selectedMods, setSelectedMods] = useState<Set<string>>(initialModifiers);

  // Toggle modifier with group limit checks
  const handleToggleModifier = (groupId: string, modId: string, maxSelect: number) => {
    const group = item.modifierGroups?.find((g) => g.modifierGroup.id === groupId)?.modifierGroup;
    if (!group) return;

    setSelectedMods((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) {
        next.delete(modId);
      } else {
        if (maxSelect === 1) {
          // Radio-style: clear others in this group
          for (const m of group.modifiers) {
            next.delete(m.id);
          }
          next.add(modId);
        } else {
          // Check maxSelect limit
          const currentInGroup = group.modifiers.filter((m) => next.has(m.id)).length;
          if (maxSelect === 0 || currentInGroup < maxSelect) {
            next.add(modId);
          }
        }
      }
      return next;
    });
  };

  // Toggle quick preset note
  const handleToggleNote = (tag: string) => {
    setCookingNote((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) {
        return trimmed
          .replace(tag, "")
          .replace(/,\s*,/g, ",")
          .replace(/^,\s*|,\s*$/g, "")
          .trim();
      }
      return `${trimmed}, ${tag}`;
    });
  };

  // Base price
  const basePrice = useMemo(() => {
    if (portion === "HALF" && item.halfPrice) {
      return Number(item.halfPrice);
    }
    return Number(item.price);
  }, [portion, item.halfPrice, item.price]);

  // Modifiers price and labels
  const { modTotalPrice, selectedLabels } = useMemo(() => {
    let sum = 0;
    const labels: string[] = [];
    for (const groupRel of item.modifierGroups ?? []) {
      for (const mod of groupRel.modifierGroup?.modifiers ?? []) {
        if (selectedMods.has(mod.id)) {
          sum += Number(mod.priceAdjustment || 0);
          labels.push(mod.name);
        }
      }
    }
    return { modTotalPrice: sum, selectedLabels: labels };
  }, [item.modifierGroups, selectedMods]);

  const unitPrice = basePrice + modTotalPrice;
  const totalPrice = unitPrice * quantity;

  // Validation: are all required modifier groups satisfied?
  const missingRequiredGroup = useMemo(() => {
    for (const groupRel of item.modifierGroups ?? []) {
      const g = groupRel.modifierGroup;
      if (g.isRequired || g.minSelect > 0) {
        const selectedCount = g.modifiers.filter((m) => selectedMods.has(m.id)).length;
        const minNeeded = Math.max(g.minSelect, g.isRequired ? 1 : 0);
        if (selectedCount < minNeeded) {
          return g.name;
        }
      }
    }
    return null;
  }, [item.modifierGroups, selectedMods]);

  const handleAdd = () => {
    if (missingRequiredGroup) return;

    const linePortion = item.halfPrice ? portion : undefined;
    const key = generateCaptainCartKey(
      item.id,
      Array.from(selectedMods),
      linePortion,
      cookingNote,
    );

    const line: CaptainCartLine = {
      key,
      menuItemId: item.id,
      name: item.name,
      unitPrice,
      quantity,
      isVeg: item.isVeg,
      modifierIds: Array.from(selectedMods),
      modifierLabels: selectedLabels,
      kitchenNote: cookingNote.trim() || undefined,
      portion: linePortion,
    };

    onConfirm(line);
  };

  return (
    <>
      {/* Header */}
      <DialogHeader className="p-4 border-b border-border bg-card/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "inline-flex items-center justify-center h-4 w-4 rounded-sm border p-0.5 shrink-0",
                  item.isVeg
                    ? "border-emerald-600 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                    : "border-amber-700 bg-amber-50 text-amber-700 dark:bg-amber-950/30",
                )}
                title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    item.isVeg ? "bg-emerald-600" : "bg-amber-700",
                  )}
                />
              </span>
              <DialogTitle className="text-base font-bold truncate">
                {item.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
              {item.category?.name || "General"}
              {item.description ? ` • ${item.description}` : ""}
            </DialogDescription>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-bold text-foreground">
              {formatCurrency(unitPrice)}
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Portion Selector (if item has halfPrice) */}
        {item.halfPrice && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Portion
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPortion("FULL")}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.98]",
                  portion === "FULL"
                    ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                    : "border-border hover:bg-secondary/60 text-foreground",
                )}
              >
                <span>Full Portion</span>
                <span className="tabular-nums font-semibold">
                  {formatCurrency(item.price)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPortion("HALF")}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.98]",
                  portion === "HALF"
                    ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                    : "border-border hover:bg-secondary/60 text-foreground",
                )}
              >
                <span>Half Portion</span>
                <span className="tabular-nums font-semibold">
                  {formatCurrency(item.halfPrice)}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Modifier Groups */}
        {item.modifierGroups && item.modifierGroups.length > 0 && (
          <div className="space-y-4">
            {item.modifierGroups.map(({ modifierGroup }) => {
              const isSingle = modifierGroup.maxSelect === 1;
              const isReq = modifierGroup.isRequired || modifierGroup.minSelect > 0;
              return (
                <div key={modifierGroup.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {modifierGroup.name}
                    </span>
                    <Badge
                      variant={isReq ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {isReq ? "Required" : "Optional"}
                      {isSingle ? " • Pick 1" : modifierGroup.maxSelect ? ` • Max ${modifierGroup.maxSelect}` : ""}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {modifierGroup.modifiers.map((mod) => {
                      const isSelected = selectedMods.has(mod.id);
                      const priceAdj = Number(mod.priceAdjustment || 0);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() =>
                            handleToggleModifier(
                              modifierGroup.id,
                              mod.id,
                              modifierGroup.maxSelect,
                            )
                          }
                          className={cn(
                            "flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-all active:scale-[0.99]",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border/80 hover:bg-secondary/50 text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex items-center justify-center h-4 w-4 rounded-full border transition-colors",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </span>
                            <span>{mod.name}</span>
                          </div>
                          {priceAdj > 0 ? (
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                              +{formatCurrency(priceAdj)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">
                              Free
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cooking Notes & Instructions */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5" />
              Kitchen Notes / Customization
            </label>
            {cookingNote && (
              <button
                type="button"
                onClick={() => setCookingNote("")}
                className="text-[11px] text-muted-foreground hover:text-foreground underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_NOTES.map((tag) => {
              const active = cookingNote.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleNote(tag)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-all active:scale-95",
                    active
                      ? "border-primary bg-primary text-primary-foreground font-medium shadow-xs"
                      : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Note Input */}
          <Textarea
            value={cookingNote}
            onChange={(e) => setCookingNote(e.target.value)}
            placeholder="E.g. Extra spicy, no garlic, serve with starter..."
            rows={2}
            className="text-sm resize-none rounded-xl"
          />
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <DialogFooter className="p-4 border-t border-border bg-card/90 flex flex-row items-center gap-3">
        {/* Quantity Stepper */}
        <div className="flex items-center border border-border rounded-xl bg-background p-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm font-bold tabular-nums">
            {quantity}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg"
            onClick={() => setQuantity((q) => q + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Add Button */}
        <Button
          type="button"
          className="flex-1 h-11 rounded-xl text-sm font-bold shadow-md active:scale-[0.98]"
          disabled={!!missingRequiredGroup}
          onClick={handleAdd}
        >
          {missingRequiredGroup ? (
            `Select ${missingRequiredGroup}`
          ) : (
            <>
              Add to Table • {formatCurrency(totalPrice)}
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
