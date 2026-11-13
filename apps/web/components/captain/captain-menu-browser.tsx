"use client";

import { useMemo, useState } from "react";
import {
  Flame,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useMenuItems, type MenuItem } from "@/hooks/use-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  generateCaptainCartKey,
  type CaptainCartLine,
} from "./captain-types";

export interface CaptainMenuBrowserProps {
  branchId: string | null;
  cartLines: CaptainCartLine[];
  onAddLine: (line: CaptainCartLine) => void;
  onIncrementLine: (key: string) => void;
  onDecrementLine: (key: string) => void;
  onOpenModifierDialog: (item: MenuItem) => void;
}

type VegFilter = "ALL" | "VEG" | "NON_VEG";

export function CaptainMenuBrowser({
  branchId,
  cartLines,
  onAddLine,
  onIncrementLine,
  onDecrementLine,
  onOpenModifierDialog,
}: CaptainMenuBrowserProps) {
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories(branchId);
  const { data: menuItems = [], isLoading: itemsLoading } =
    useMenuItems(branchId);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [vegFilter, setVegFilter] = useState<VegFilter>("ALL");

  // Filter items in-memory for instant 60fps search
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.isActive) return false;

      // Category filter
      if (selectedCategoryId !== "ALL" && item.categoryId !== selectedCategoryId) {
        return false;
      }

      // Veg filter
      if (vegFilter === "VEG" && !item.isVeg) return false;
      if (vegFilter === "NON_VEG" && item.isVeg) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q) ?? false;
        const skuMatch = item.sku?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !descMatch && !skuMatch) return false;
      }

      return true;
    });
  }, [menuItems, selectedCategoryId, vegFilter, searchQuery]);

  // Aggregate staged quantity per menuItemId
  const itemQuantities = useMemo(() => {
    const counts = new Map<string, { totalQty: number; defaultKey: string | null }>();
    for (const line of cartLines) {
      const existing = counts.get(line.menuItemId) || { totalQty: 0, defaultKey: null };
      existing.totalQty += line.quantity;
      if (!existing.defaultKey) existing.defaultKey = line.key;
      counts.set(line.menuItemId, existing);
    }
    return counts;
  }, [cartLines]);

  const handleQuickAdd = (item: MenuItem) => {
    // If item has required modifier groups or half-price options, open modifier dialog
    const hasRequiredModifiers = item.modifierGroups?.some(
      (g) => g.modifierGroup.isRequired || g.modifierGroup.minSelect > 0,
    );
    if (hasRequiredModifiers) {
      onOpenModifierDialog(item);
      return;
    }

    // Otherwise add default full portion
    const key = generateCaptainCartKey(item.id, [], undefined, undefined);
    onAddLine({
      key,
      menuItemId: item.id,
      name: item.name,
      unitPrice: Number(item.price),
      quantity: 1,
      isVeg: item.isVeg,
      modifierIds: [],
      modifierLabels: [],
    });
  };

  const handleQuickIncrement = (item: MenuItem) => {
    const staged = itemQuantities.get(item.id);
    if (staged?.defaultKey) {
      onIncrementLine(staged.defaultKey);
    } else {
      handleQuickAdd(item);
    }
  };

  const handleQuickDecrement = (item: MenuItem) => {
    const staged = itemQuantities.get(item.id);
    if (staged?.defaultKey) {
      onDecrementLine(staged.defaultKey);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search Bar & Veg Filter */}
      <div className="p-3 border-b border-border/80 bg-background/95 backdrop-blur-sm sticky top-0 z-10 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dish by name or code..."
            className="pl-9 pr-9 h-11 text-sm bg-secondary/40 rounded-xl border-border/80 focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Veg / Non-Veg Chips + Total Count */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setVegFilter("ALL")}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-semibold border transition-all active:scale-95",
                vegFilter === "ALL"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setVegFilter("VEG")}
              className={cn(
                "h-8 px-2.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all active:scale-95",
                vegFilter === "VEG"
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                  : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900" />
              Veg
            </button>
            <button
              type="button"
              onClick={() => setVegFilter("NON_VEG")}
              className={cn(
                "h-8 px-2.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all active:scale-95",
                vegFilter === "NON_VEG"
                  ? "border-amber-700 bg-amber-700 text-white shadow-xs"
                  : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-amber-600 ring-2 ring-amber-300 dark:ring-amber-900" />
              Non-Veg
            </button>
          </div>

          <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
            {filteredItems.length} dishes
          </span>
        </div>
      </div>

      {/* Horizontal Scrolling Category Chips */}
      <div className="px-3 py-2 border-b border-border/60 bg-muted/20 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setSelectedCategoryId("ALL")}
          className={cn(
            "h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95",
            selectedCategoryId === "ALL"
              ? "bg-foreground text-background shadow-xs"
              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
          )}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategoryId(cat.id)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95",
              selectedCategoryId === cat.id
                ? "bg-foreground text-background shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {itemsLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl border border-border/60 p-3 bg-card flex items-center justify-between"
              >
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-14 text-center space-y-2 text-muted-foreground">
            <UtensilsCrossed className="h-8 w-8 mx-auto stroke-1 opacity-50" />
            <p className="text-sm font-medium">No dishes match your filter</p>
            <p className="text-xs">Try clearing search or selecting All Categories</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const stagedInfo = itemQuantities.get(item.id);
            const stagedCount = stagedInfo?.totalQty || 0;
            const hasCustomOptions =
              (item.modifierGroups && item.modifierGroups.length > 0) ||
              !!item.halfPrice;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-xl border transition-all bg-card active:bg-secondary/40",
                  stagedCount > 0
                    ? "border-primary/50 bg-primary/[0.03] shadow-xs"
                    : "border-border/80 hover:border-border",
                )}
              >
                {/* Item Details */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleQuickAdd(item)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {/* Veg / Non-Veg Indicator */}
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-3.5 w-3.5 rounded-xs border p-0.5 shrink-0",
                        item.isVeg
                          ? "border-emerald-600 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                          : "border-amber-700 bg-amber-50 text-amber-700 dark:bg-amber-950/30",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          item.isVeg ? "bg-emerald-600" : "bg-amber-700",
                        )}
                      />
                    </span>

                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {item.name}
                    </h4>

                    {item.spiceLevel && (
                      <span className="inline-flex text-rose-500 shrink-0" title={`Spice: ${item.spiceLevel}`}>
                        <Flame className="h-3 w-3 fill-rose-500" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold tabular-nums text-foreground">
                      {formatCurrency(item.price)}
                    </span>
                    {item.halfPrice && (
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        (Half: {formatCurrency(item.halfPrice)})
                      </span>
                    )}
                    {hasCustomOptions && (
                      <span className="text-[10px] text-muted-foreground/70 bg-secondary/80 px-1.5 py-0.2 rounded">
                        Customisable
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions: Stepper or Add Button + Customize Trigger */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Customize / Notes Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Customize item or add cooking note"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenModifierDialog(item);
                    }}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </Button>

                  {/* Quantity Stepper or + Add Button */}
                  {stagedCount > 0 ? (
                    <div className="flex items-center border border-primary/40 rounded-xl bg-background p-0.5 shadow-xs">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-foreground hover:bg-secondary active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickDecrement(item);
                        }}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-7 text-center text-sm font-bold tabular-nums text-primary">
                        {stagedCount}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-foreground hover:bg-secondary active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickIncrement(item);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-xl text-xs font-bold border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all shadow-2xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAdd(item);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      ADD
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
