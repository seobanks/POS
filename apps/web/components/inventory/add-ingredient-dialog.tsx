"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Layers, PackagePlus, Sparkles, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import type { IngredientUnit } from "@nodedr-restaurant/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateIngredient } from "@/hooks/use-inventory";
import { useMenuItems } from "@/hooks/use-menu";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

const UNITS: IngredientUnit[] = [
  "PIECE",
  "PACK",
  "BOX",
  "DOZEN",
  "KG",
  "G",
  "L",
  "ML",
];

export function AddIngredientDialog({ branchId }: { branchId: string | null }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "custom">("menu");

  // Selection & form fields
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");
  const [menuSearch, setMenuSearch] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<IngredientUnit>("PIECE");
  const [initialStock, setInitialStock] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("5");

  const createIngredient = useCreateIngredient(branchId);
  const { data: menuItems, isLoading: loadingMenuItems } = useMenuItems(branchId);

  // Filter menu items for search
  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    const term = menuSearch.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.category?.name.toLowerCase().includes(term) ||
        (item.shortCode && item.shortCode.toLowerCase().includes(term))
      );
    });
  }, [menuItems, menuSearch]);

  const selectedMenuItem = useMemo(() => {
    return menuItems?.find((m) => m.id === selectedMenuItemId);
  }, [menuItems, selectedMenuItemId]);

  const handleSelectMenuItem = (itemId: string) => {
    setSelectedMenuItemId(itemId);
    const item = menuItems?.find((m) => m.id === itemId);
    if (item) {
      setName(item.name);
      setUnit("PIECE");
      if (!reorderLevel || reorderLevel === "0") setReorderLevel("5");
    }
  };

  const resetForm = () => {
    setSelectedMenuItemId("");
    setMenuSearch("");
    setName("");
    setUnit("PIECE");
    setInitialStock("");
    setCostPrice("");
    setReorderLevel("5");
    setMode("menu");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter or select a product name");
      return;
    }

    createIngredient.mutate(
      {
        name: name.trim(),
        unit,
        reorderLevel: Number(reorderLevel) || 0,
        isActive: true,
        initialStock: Number(initialStock) > 0 ? Number(initialStock) : 0,
        costPrice: Number(costPrice) >= 0 && costPrice.trim() !== "" ? Number(costPrice) : undefined,
        linkMenuItemId: mode === "menu" && selectedMenuItemId ? selectedMenuItemId : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            mode === "menu" && selectedMenuItem
              ? `"${name}" added to inventory & linked to POS orders`
              : `"${name}" added to inventory`,
          );
          setOpen(false);
          resetForm();
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Could not add inventory item",
          ),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-2 shadow-sm font-medium">
        <PackagePlus className="h-4 w-4" />
        Add to Inventory
      </Button>} />

      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PackagePlus className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-xl">Add to Inventory</DialogTitle>
                <DialogDescription className="text-xs">
                  Stock tracking, automatic sale deductions, and alerts
                </DialogDescription>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-muted/60 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => {
                  setMode("menu");
                  setUnit("PIECE");
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  mode === "menu"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
                Select from Menu (Recommended)
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("custom");
                  setSelectedMenuItemId("");
                  setUnit("KG");
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  mode === "custom"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Custom Raw Material
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {mode === "menu" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Choose Menu Product
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Auto-fetches details from Menu
                  </span>
                </div>

                <Input
                  placeholder="Search menu product by name or category…"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="h-9 text-xs"
                />

                <div className="max-h-40 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-1 divide-y divide-border/30">
                  {loadingMenuItems ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Loading menu items…
                    </div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No matching menu items found.
                    </div>
                  ) : (
                    filteredMenuItems.map((item) => {
                      const isSelected = selectedMenuItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectMenuItem(item.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-medium"
                              : "hover:bg-muted/60 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                item.isVeg ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            <div className="truncate">
                              <span className="truncate block font-medium">
                                {item.name}
                              </span>
                              <span
                                className={`text-[10px] ${
                                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                }`}
                              >
                                {item.category?.name || "Uncategorized"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold tabular-nums">
                              {formatCurrency(item.price)}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedMenuItem && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5 text-xs text-foreground">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-primary">
                        Auto-linked to POS: {selectedMenuItem.name}
                      </p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Whenever an order containing <strong>{selectedMenuItem.name}</strong> is placed, 1 unit will be immediately deducted from this stock.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 pt-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "menu" ? "2. Inventory & Stock Configuration" : "Raw Material Details"}
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label htmlFor="item-name" className="text-xs">
                    Inventory Item Name
                  </Label>
                  <Input
                    id="item-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cold Coffee, Tomato"
                    className="h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs">Stock Unit</Label>
                  <Select
                    value={unit}
                    onValueChange={(v) => setUnit(v as IngredientUnit)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="item-stock" className="text-xs">
                    Initial Stock
                  </Label>
                  <Input
                    id="item-stock"
                    type="number"
                    min="0"
                    step="any"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    placeholder="e.g. 50"
                    className="h-9 tabular-nums"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Units on hand now
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-cost" className="text-xs">
                    Cost / Unit (₹)
                  </Label>
                  <Input
                    id="item-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="e.g. 35.00"
                    className="h-9 tabular-nums"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Purchase/making cost
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-reorder" className="text-xs">
                    Low Stock Alert
                  </Label>
                  <Input
                    id="item-reorder"
                    type="number"
                    min="0"
                    step="any"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    placeholder="e.g. 5"
                    className="h-9 tabular-nums"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Alert when ≤ this
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createIngredient.isPending || (mode === "menu" && !selectedMenuItemId)}
              className="gap-1.5 shadow-sm font-semibold"
            >
              {createIngredient.isPending ? (
                "Adding & Linking…"
              ) : (
                <>
                  <span>Save to Inventory</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
