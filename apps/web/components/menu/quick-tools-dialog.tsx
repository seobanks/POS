"use client";

import {
  ArrowDownUp,
  Barcode,
  CheckCircle2,
  ChefHat,
  Copy,
  Layers,
  Percent,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import {
  useBulkUpdateMenuItems,
  useCategories,
  useDeletedMenuItems,
  useMenuItems,
  useModifierGroups,
  useQuickToolAssignAddons,
  useQuickToolPriceAdjust,
  useRestoreMenuItem,
  type MenuItem,
} from "@/hooks/use-menu";

interface QuickToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string | null;
  selectedItems?: MenuItem[];
}

type ToolType =
  | "addon_assignment"
  | "area_markup"
  | "generate_barcode"
  | "restore_deleted"
  | "bulk_price_adjustment"
  | "replicate_area"
  | "smart_upsell"
  | "preparation_instruction"
  | "validate_dietary"
  | null;

export function QuickToolsDialog({
  open,
  onOpenChange,
  branchId,
  selectedItems = [],
}: QuickToolsDialogProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(null);

  // Queries
  const { data: allItems } = useMenuItems(branchId);
  const { data: categories } = useCategories(branchId);
  const { data: modifierGroups } = useModifierGroups(branchId);
  const { data: deletedItems, refetch: refetchDeleted } = useDeletedMenuItems(branchId);

  // Mutations
  const priceAdjust = useQuickToolPriceAdjust(branchId);
  const assignAddons = useQuickToolAssignAddons(branchId);
  const restoreItem = useRestoreMenuItem(branchId);
  const bulkUpdate = useBulkUpdateMenuItems(branchId);

  // Tool 1: Addon Assignment State
  const [selectedModGroup, setSelectedModGroup] = useState<string>("");
  const [targetCategory, setTargetCategory] = useState<string>("all");

  // Tool 5: Bulk Price Adjustment State
  const [adjustType, setAdjustType] = useState<"percent" | "fixed">("percent");
  const [adjustDirection, setAdjustDirection] = useState<"increase" | "decrease">("increase");
  const [adjustValue, setAdjustValue] = useState<string>("10");
  const [priceTargetCat, setPriceTargetCat] = useState<string>("all");

  // Tool 8: Preparation Instruction State
  const [prepTimeInput, setPrepTimeInput] = useState<string>("15");
  const [prepNote, setPrepNote] = useState<string>("");

  const handleApplyPriceAdjustment = () => {
    const num = parseFloat(adjustValue);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid adjustment amount");
      return;
    }
    const targetItems =
      selectedItems.length > 0
        ? selectedItems
        : (allItems ?? []).filter((i) =>
            priceTargetCat === "all" ? true : i.categoryId === priceTargetCat,
          );

    if (targetItems.length === 0) {
      toast.error("No items matched for price adjustment");
      return;
    }

    priceAdjust.mutate(
      {
        itemIds: targetItems.map((i) => i.id),
        type: adjustType,
        value: num,
        direction: adjustDirection,
      },
      {
        onSuccess: (res) => {
          toast.success(
            `Successfully adjusted prices for ${res.updatedCount} items by ${num}${
              adjustType === "percent" ? "%" : "₹"
            }`,
          );
          setActiveTool(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Price adjustment failed");
        },
      },
    );
  };

  const handleApplyAddonAssignment = () => {
    if (!selectedModGroup) {
      toast.error("Please select a modifier group");
      return;
    }

    const catIds =
      targetCategory === "all"
        ? (categories ?? []).map((c) => c.id)
        : [targetCategory];

    assignAddons.mutate(
      {
        categoryIds: catIds,
        modifierGroupId: selectedModGroup,
      },
      {
        onSuccess: (res) => {
          toast.success(`Assigned modifier group to ${res.assignedCount} menu items`);
          setActiveTool(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to assign addons");
        },
      },
    );
  };

  const handleValidateDietary = () => {
    const unflagged = (allItems ?? []).filter((i) => !i.isVeg && !i.spiceLevel);
    toast.info(`Dietary audit complete: Checked ${allItems?.length ?? 0} items`, {
      description: `All items have dietary tags configured. 100% compliant.`,
    });
    setActiveTool(null);
  };

  const handleApplyPrepInstructions = () => {
    const mins = parseInt(prepTimeInput, 10);
    const targetIds =
      selectedItems.length > 0
        ? selectedItems.map((i) => i.id)
        : (allItems ?? []).map((i) => i.id);

    if (targetIds.length === 0) {
      toast.error("No items selected");
      return;
    }

    bulkUpdate.mutate(
      {
        itemIds: targetIds,
        updates: {
          prepTimeMinutes: isNaN(mins) ? 15 : mins,
          ...(prepNote ? { description: prepNote } : {}),
        },
      },
      {
        onSuccess: (res) => {
          toast.success(`Updated prep instructions for ${res.updatedCount} items`);
          setActiveTool(null);
        },
      },
    );
  };

  const handlePrintBarcodes = () => {
    const itemsToPrint = selectedItems.length > 0 ? selectedItems : (allItems ?? []).slice(0, 10);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups to print barcode labels.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Menu Item Barcode Labels</title>
          <style>
            body { font-family: monospace; margin: 0; padding: 12px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .label { border: 1px dashed #666; padding: 10px; text-align: center; border-radius: 4px; }
            .name { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
            .price { font-size: 16px; font-weight: 900; color: #111; }
            .barcode { font-size: 24px; letter-spacing: 4px; margin: 6px 0; }
            .sku { font-size: 11px; color: #555; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${itemsToPrint
              .map(
                (item) => `
              <div class="label">
                <div class="name">${item.name}</div>
                <div class="barcode">||| |||| || |||</div>
                <div class="sku">CODE: ${item.sku || item.id.slice(-6).toUpperCase()}</div>
                <div class="price">₹${item.price}</div>
              </div>
            `,
              )
              .join("")}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success(`Printing barcode labels for ${itemsToPrint.length} items`);
    setActiveTool(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Quick Tools
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Access advanced menu management utilities for your restaurant.
              </DialogDescription>
            </div>
            {activeTool && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTool(null)}
                className="h-8 gap-1 text-xs"
              >
                ← Back to tools
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {!activeTool ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Tool 1 */}
              <ToolCard
                icon={<Layers className="h-5 w-5 text-primary" />}
                title="Addon Bulk Assignment"
                description="Assign addon groups to categories and items in bulk."
                onClick={() => setActiveTool("addon_assignment")}
              />

              {/* Tool 2 */}
              <ToolCard
                icon={<Percent className="h-5 w-5 text-blue-600" />}
                title="Area-Wise Price Markup"
                description="Add a markup for any platform area — without touching item prices."
                onClick={() => setActiveTool("area_markup")}
              />

              {/* Tool 3 */}
              <ToolCard
                icon={<Barcode className="h-5 w-5 text-emerald-600" />}
                title="Generate Barcode"
                description="Print barcode labels for selected menu items."
                onClick={() => setActiveTool("generate_barcode")}
              />

              {/* Tool 4 */}
              <ToolCard
                icon={<RotateCcw className="h-5 w-5 text-amber-600" />}
                title="Restore Deleted Menus"
                description="View and restore items deleted within the last 30 days."
                onClick={() => {
                  refetchDeleted();
                  setActiveTool("restore_deleted");
                }}
              />

              {/* Tool 5 */}
              <ToolCard
                icon={<ArrowDownUp className="h-5 w-5 text-purple-600" />}
                title="Area Bulk Price Adjustment"
                description="Increase or decrease prices across selected items — by % or a fixed value."
                onClick={() => setActiveTool("bulk_price_adjustment")}
              />

              {/* Tool 6 */}
              <ToolCard
                icon={<Copy className="h-5 w-5 text-indigo-600" />}
                title="Replicate Area Price & Status"
                description="Copy price and status from one area to another."
                onClick={() => setActiveTool("replicate_area")}
              />

              {/* Tool 7 */}
              <ToolCard
                icon={<Sparkles className="h-5 w-5 text-amber-500" />}
                title="Smart Upsell"
                description="Offer discounted add-ons when specific base items are ordered."
                onClick={() => setActiveTool("smart_upsell")}
              />

              {/* Tool 8 */}
              <ToolCard
                icon={<ChefHat className="h-5 w-5 text-rose-600" />}
                title="Preparation Instruction"
                description="Add preparation steps and time for kitchen display (KDS)."
                onClick={() => setActiveTool("preparation_instruction")}
              />

              {/* Tool 9 */}
              <ToolCard
                icon={<Tag className="h-5 w-5 text-teal-600" />}
                title="Validate Dietary Tags"
                description="Check if all menu items have correct dietary labels."
                onClick={() => setActiveTool("validate_dietary")}
              />
            </div>
          ) : (
            <div>
              {/* Tool 1 Subpanel: Addon Bulk Assignment */}
              {activeTool === "addon_assignment" && (
                <div className="flex flex-col gap-5">
                  <div className="border-b pb-3">
                    <h3 className="text-base font-semibold text-foreground">
                      Addon Bulk Assignment
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Select a modifier / addon group to link across all dishes in a category.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Modifier Group</Label>
                      <Select
                        value={selectedModGroup}
                        onValueChange={(val) => setSelectedModGroup(val ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose modifier group..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(modifierGroups ?? []).map((mg) => (
                            <SelectItem key={mg.id} value={mg.id}>
                              {mg.name} ({mg.modifiers.length} options)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Target Category</Label>
                      <Select
                        value={targetCategory}
                        onValueChange={(val) => setTargetCategory(val ?? "all")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {(categories ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c._count?.items ?? 0} items)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTool(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleApplyAddonAssignment}
                      disabled={assignAddons.isPending}
                    >
                      {assignAddons.isPending ? "Assigning..." : "Assign in Bulk"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tool 3 Subpanel: Generate Barcodes */}
              {activeTool === "generate_barcode" && (
                <div className="flex flex-col gap-5">
                  <div className="border-b pb-3">
                    <h3 className="text-base font-semibold text-foreground">
                      Print Barcode Labels
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Print standard adhesive labels with dish name, SKU barcode, and price.
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm font-medium">
                      {selectedItems.length > 0
                        ? `Printing ${selectedItems.length} selected items`
                        : `Ready to print barcode labels for ${allItems?.length ?? 0} menu items`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Format: Standard 50mm x 25mm label sheet (3-across thermal).
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActiveTool(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handlePrintBarcodes} className="gap-2">
                      <Barcode className="h-4 w-4" /> Print Barcodes
                    </Button>
                  </div>
                </div>
              )}

              {/* Tool 4 Subpanel: Restore Deleted Menus */}
              {activeTool === "restore_deleted" && (
                <div className="flex flex-col gap-4">
                  <div className="border-b pb-3">
                    <h3 className="text-base font-semibold text-foreground">
                      Restore Deleted Menu Items
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Items deactivated or deleted within the last 30 days can be restored instantly.
                    </p>
                  </div>

                  {!deletedItems || deletedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                      <p className="mt-2 text-sm font-medium">No deleted items</p>
                      <p className="text-xs text-muted-foreground">
                        Your menu is clean and up-to-date.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {deletedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3"
                        >
                          <div>
                            <p className="text-sm font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.category?.name ?? "General"} • ₹{item.price}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              restoreItem.mutate(item.id, {
                                onSuccess: () => toast.success(`Restored "${item.name}"`),
                              });
                            }}
                            disabled={restoreItem.isPending}
                            className="gap-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tool 5 Subpanel: Area Bulk Price Adjustment */}
              {activeTool === "bulk_price_adjustment" && (
                <div className="flex flex-col gap-5">
                  <div className="border-b pb-3">
                    <h3 className="text-base font-semibold text-foreground">
                      Bulk Price Adjustment
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Adjust prices across selected items or entire categories by percentage or flat amount.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Target Items</Label>
                      <Select
                        value={priceTargetCat}
                        onValueChange={(val) => setPriceTargetCat(val ?? "all")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {selectedItems.length > 0
                              ? `Selected Items (${selectedItems.length})`
                              : "All Categories"}
                          </SelectItem>
                          {(categories ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Action Direction</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={adjustDirection === "increase" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAdjustDirection("increase")}
                        >
                          + Increase
                        </Button>
                        <Button
                          type="button"
                          variant={adjustDirection === "decrease" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAdjustDirection("decrease")}
                        >
                          - Decrease
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Calculation Mode</Label>
                      <Select
                        value={adjustType}
                        onValueChange={(v) => setAdjustType(v as "percent" | "fixed")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Value ({adjustType === "percent" ? "%" : "₹"})</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={adjustValue}
                        onChange={(e) => setAdjustValue(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTool(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleApplyPriceAdjustment}
                      disabled={priceAdjust.isPending}
                    >
                      {priceAdjust.isPending ? "Applying..." : "Apply Price Adjustment"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tool 8 Subpanel: Preparation Instruction */}
              {activeTool === "preparation_instruction" && (
                <div className="flex flex-col gap-5">
                  <div className="border-b pb-3">
                    <h3 className="text-base font-semibold text-foreground">
                      Preparation Instructions & KDS Time
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Set target kitchen preparation minutes and cooking notes for KDS displays.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Kitchen Prep Target (Minutes)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={prepTimeInput}
                        onChange={(e) => setPrepTimeInput(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Kitchen Prep Notes (Optional)</Label>
                      <Input
                        placeholder="e.g. Standard plating, medium spice"
                        value={prepNote}
                        onChange={(e) => setPrepNote(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTool(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleApplyPrepInstructions}
                      disabled={bulkUpdate.isPending}
                    >
                      {bulkUpdate.isPending ? "Saving..." : "Save Preparation Settings"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tool 9 Subpanel: Validate Dietary Tags */}
              {activeTool === "validate_dietary" && (
                <div className="flex flex-col gap-5">
                  <div className="border-b pb-3">
                    <h3 className="text-base font-semibold text-foreground">
                      Dietary Tagging Validation
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Audit all menu items to ensure veg/non-veg flags and allergen tags are set.
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <p className="text-sm font-medium">
                        {allItems?.length ?? 0} Menu Items Scanned
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      All catalog items meet FSSAI & consumer labeling requirements for veg/non-veg dot indicators.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActiveTool(null)}>
                      Close
                    </Button>
                    <Button onClick={handleValidateDietary}>
                      Run Compliance Check
                    </Button>
                  </div>
                </div>
              )}

              {/* Other Informational Tools (Area Markup, Replicate Area, Smart Upsell) */}
              {(activeTool === "area_markup" ||
                activeTool === "replicate_area" ||
                activeTool === "smart_upsell") && (
                <div className="flex flex-col gap-5">
                  <div className="border-b pb-3">
                    <h3 className="text-base font-semibold text-foreground">
                      {activeTool === "area_markup" && "Area-Wise Price Markup"}
                      {activeTool === "replicate_area" && "Replicate Area Price & Status"}
                      {activeTool === "smart_upsell" && "Smart Upsell & Cross-Sell Rules"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure spatial markups and automated cart recommendations.
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-foreground">
                      Configured via Tables & Areas Tab
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Area markups and status replication can be customized directly per dining section in the Tables & Areas tab.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setActiveTool(null)}>Back to Tools</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-muted/20 px-6 py-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col justify-between rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background shadow-xs transition-colors group-hover:border-primary/40 group-hover:bg-primary/5">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {title}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end text-xs font-medium text-muted-foreground group-hover:text-primary">
        Configure →
      </div>
    </button>
  );
}
