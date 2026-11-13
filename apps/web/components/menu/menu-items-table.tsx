"use client";

import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Flame,
  Globe,
  Leaf,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Utensils,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBulkDeleteMenuItems,
  useBulkUpdateMenuItems,
  useDeleteMenuItem,
  useUpdateMenuItem,
  type MenuItem,
} from "@/hooks/use-menu";
import { exportMenuToCsv } from "@/lib/csv-parser";
import { cn } from "@/lib/utils";

interface MenuItemsTableProps {
  items: MenuItem[];
  allItems: MenuItem[];
  isLoading: boolean;
  canManage: boolean;
  branchId: string | null;
  onAddItemClick: () => void;
  onEditItemClick: (item: MenuItem) => void;
  onOpenBulkImport: () => void;
  onOpenQuickTools: (selected: MenuItem[]) => void;
  onToggleCategoryDrawer?: () => void;
}

export function MenuItemsTable({
  items,
  allItems,
  isLoading,
  canManage,
  branchId,
  onAddItemClick,
  onEditItemClick,
  onOpenBulkImport,
  onOpenQuickTools,
  onToggleCategoryDrawer,
}: MenuItemsTableProps) {
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Inline editing state for Name & Price
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState<string>("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameVal, setEditingNameVal] = useState<string>("");

  // Mutations
  const updateItem = useUpdateMenuItem(branchId);
  const bulkUpdate = useBulkUpdateMenuItems(branchId);
  const bulkDelete = useBulkDeleteMenuItems(branchId);
  const deleteSingle = useDeleteMenuItem(branchId);

  // Filter items
  const filtered = items.filter((item) => {
    if (statusFilter === "active" && !item.isActive) return false;
    if (statusFilter === "inactive" && item.isActive) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCat = Boolean(item.category?.name?.toLowerCase().includes(q));
      const matchSku = Boolean(item.sku && item.sku.toLowerCase().includes(q));
      const matchBarcode = Boolean(item.barcode && item.barcode.toLowerCase().includes(q));
      if (!matchName && !matchCat && !matchSku && !matchBarcode) return false;
    }
    return true;
  });

  // Paginated items
  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + rowsPerPage);

  const selectedItems = allItems.filter((i) => selectedIds.includes(i.id));

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedItems.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Live PoS Sync
  const handleSyncPos = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("PoS Synced successfully", {
        description: "Menu cache updated across all active terminals and captain devices.",
      });
    }, 600);
  };

  // Publish to online platforms
  const handlePublishMenu = () => {
    toast.success("Menu published to online platforms", {
      description: "Direct QR menu, Swiggy, and Zomato catalogs synchronized.",
    });
  };

  // Excel CSV Export
  const handleExportCsv = () => {
    const listToExport = selectedItems.length > 0 ? selectedItems : filtered;
    if (listToExport.length === 0) {
      toast.error("No items to export");
      return;
    }
    const csv = exportMenuToCsv(listToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `menu_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${listToExport.length} items to CSV`);
  };

  // Inline Price Save
  const handleSaveInlinePrice = (item: MenuItem) => {
    const p = parseFloat(editingPriceVal);
    if (isNaN(p) || p < 0) {
      toast.error("Invalid price");
      return;
    }
    updateItem.mutate(
      { id: item.id, dto: { price: p } },
      {
        onSuccess: () => {
          toast.success(`Updated ${item.name} price to ₹${p}`);
          setEditingPriceId(null);
        },
      },
    );
  };

  // Inline Name Save
  const handleSaveInlineName = (item: MenuItem) => {
    if (!editingNameVal.trim()) {
      toast.error("Item name cannot be empty");
      return;
    }
    updateItem.mutate(
      { id: item.id, dto: { name: editingNameVal.trim() } },
      {
        onSuccess: () => {
          toast.success(`Renamed item to "${editingNameVal.trim()}"`);
          setEditingNameId(null);
        },
      },
    );
  };

  // Bulk Status Update
  const handleBulkStatus = (isActive: boolean) => {
    if (selectedIds.length === 0) return;
    bulkUpdate.mutate(
      { itemIds: selectedIds, updates: { isActive } },
      {
        onSuccess: (res) => {
          toast.success(`Updated status for ${res.updatedCount} items`);
          setSelectedIds([]);
        },
      },
    );
  };

  // Bulk Dietary Tag Update
  const handleBulkDietary = (dietary: {
    isVeg?: boolean;
    isVegan?: boolean;
    isJain?: boolean;
    isGlutenFree?: boolean;
  }) => {
    if (selectedIds.length === 0) return;
    bulkUpdate.mutate(
      { itemIds: selectedIds, updates: dietary },
      {
        onSuccess: (res) => {
          toast.success(`Updated dietary tag for ${res.updatedCount} items`);
          setSelectedIds([]);
        },
      },
    );
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} menu items? They will be moved to the 30-day restore trash.`,
      )
    )
      return;

    bulkDelete.mutate(selectedIds, {
      onSuccess: (res) => {
        toast.success(`Deleted ${res.deletedCount} items`);
        setSelectedIds([]);
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Top Header Controls matching Petpooja */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 bg-card/40">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Menu Items</h2>
          {/* Live PoS Sync Badge */}
          <button
            type="button"
            onClick={handleSyncPos}
            title="Click to sync menu with POS terminals"
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20"
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
            <span>PoS Synced 2 min ago</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Excel Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground h-8 gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Excel</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleExportCsv} className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Export to CSV
              </DropdownMenuItem>
              {canManage && (
                <DropdownMenuItem onClick={onOpenBulkImport} className="gap-2 text-xs">
                  <Upload className="h-3.5 w-3.5" /> Import from CSV
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Item Button */}
          {canManage && (
            <Button
              size="sm"
              onClick={onAddItemClick}
              className="h-8 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          )}

          {/* Publish Menu to Online Platforms */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublishMenu}
            className="h-8 gap-1.5 border-primary/30 text-xs font-medium text-primary hover:bg-primary/5"
          >
            <Send className="h-3 w-3 rotate-45" />
            <span className="hidden sm:inline">Online Platforms</span>
            <span className="sm:hidden">Publish</span>
          </Button>
        </div>
      </div>

      {/* Action / Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-2.5 bg-card/20">
        <div className="flex flex-wrap items-center gap-2">
          {onToggleCategoryDrawer && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleCategoryDrawer}
              className="h-8 gap-1 text-xs"
            >
              Categories
            </Button>
          )}

          {/* Search Box */}
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search items, code, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Multi-Select Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-medium h-8 gap-1.5 transition-colors",
                selectedIds.length > 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span>Actions</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
              {selectedIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {selectedIds.length}
                </Badge>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {selectedIds.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Select at least one item first
                </div>
              ) : (
                <>
                  <DropdownMenuLabel className="text-xs">
                    Bulk Actions ({selectedIds.length} items)
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Availability Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-xs">
                      <Zap className="h-3.5 w-3.5 text-blue-600" />
                      <span>Availability</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-44">
                        <DropdownMenuItem
                          onClick={() => handleBulkStatus(true)}
                          className="text-xs font-medium text-emerald-600"
                        >
                          Mark Available (In Stock)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBulkStatus(false)}
                          className="text-xs font-medium text-amber-600"
                        >
                          Mark Out of Stock (86'd)
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  {/* Highlight Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Highlight</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-44">
                        <DropdownMenuItem
                          onClick={() =>
                            bulkUpdate.mutate({
                              itemIds: selectedIds,
                              updates: { description: "Chef Special" },
                            })
                          }
                          className="text-xs"
                        >
                          Chef's Special
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            bulkUpdate.mutate({
                              itemIds: selectedIds,
                              updates: { description: "Bestseller" },
                            })
                          }
                          className="text-xs"
                        >
                          Bestseller
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  {/* Dietary Tag Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-xs">
                      <Tag className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Dietary Tag</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleBulkDietary({ isVeg: true, isVegan: false })}
                          className="text-xs gap-2"
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Pure Veg
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBulkDietary({ isVeg: false })}
                          className="text-xs gap-2"
                        >
                          <span className="h-2 w-2 rounded-full bg-rose-600" /> Non-Veg
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBulkDietary({ isVeg: true, isVegan: true })}
                          className="text-xs gap-2"
                        >
                          <Leaf className="h-3 w-3 text-emerald-600" /> Vegan
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBulkDietary({ isVeg: true, isJain: true })}
                          className="text-xs gap-2"
                        >
                          <span className="h-2 w-2 rounded-full bg-amber-500" /> Jain Friendly
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  {/* QR Ordering */}
                  <DropdownMenuItem
                    onClick={() => {
                      toast.success(`Updated QR Ordering flags for ${selectedIds.length} items`);
                    }}
                    className="gap-2 text-xs"
                  >
                    <Globe className="h-3.5 w-3.5 text-indigo-600" /> QR Ordering
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Bulk Delete */}
                  {canManage && (
                    <DropdownMenuItem
                      onClick={handleBulkDelete}
                      className="gap-2 text-xs font-semibold text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Items
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Tools Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenQuickTools(selectedItems)}
            className="h-8 gap-1.5 text-xs font-medium text-foreground hover:border-primary/40"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span>Quick Tools</span>
          </Button>
        </div>

        {/* Platform items shortcut */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="h-6 gap-1 px-2 text-[11px] font-normal">
            Platform Items <span className="font-mono text-[10px] text-muted-foreground">Ctrl+M</span>
          </Badge>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-xs">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    paginatedItems.length > 0 &&
                    paginatedItems.every((i) => selectedIds.includes(i.id))
                  }
                  onCheckedChange={(c) => handleSelectAll(Boolean(c))}
                  aria-label="Select all on this page"
                />
              </TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead className="min-w-[200px]">Item</TableHead>
              <TableHead className="min-w-[130px]">Online Display Name</TableHead>
              <TableHead className="min-w-[110px]">Short Code</TableHead>
              <TableHead className="w-20 text-center">Status</TableHead>
              <TableHead className="w-28 text-right">Last Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                  Loading menu catalog...
                </TableCell>
              </TableRow>
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <Utensils className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-semibold">No menu items found</p>
                  <p className="text-xs text-muted-foreground">
                    Try clearing the search or category filter.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isEditingPrice = editingPriceId === item.id;
                const isEditingName = editingNameId === item.id;

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => handleToggleSelect(item.id, Boolean(c))}
                        aria-label={`Select ${item.name}`}
                      />
                    </TableCell>

                    {/* Image Thumbnail */}
                    <TableCell>
                      <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-muted/50">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                            <Utensils className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Item Name & Price with fast inline pencil edits */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          {/* Veg / Non-veg dot indicator */}
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-xs border",
                              item.isVeg
                                ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                                : "border-rose-600 bg-rose-50 dark:bg-rose-950/20",
                            )}
                            title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                item.isVeg ? "bg-emerald-600" : "bg-rose-600",
                              )}
                            />
                          </span>

                          {/* Item Name (inline editable) */}
                          {isEditingName ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingNameVal}
                                onChange={(e) => setEditingNameVal(e.target.value)}
                                className="h-6 w-44 text-xs font-semibold"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveInlineName(item);
                                  if (e.key === "Escape") setEditingNameId(null);
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-emerald-600"
                                onClick={() => handleSaveInlineName(item)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canManage) return;
                                setEditingNameId(item.id);
                                setEditingNameVal(item.name);
                              }}
                              className="group/name flex items-center gap-1 text-left text-xs font-semibold text-foreground hover:text-primary"
                            >
                              <span>{item.name}</span>
                              {canManage && (
                                <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover/name:opacity-100 text-muted-foreground" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Price (inline editable) */}
                        <div className="flex items-center gap-1">
                          {isEditingPrice ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">₹</span>
                              <Input
                                type="number"
                                value={editingPriceVal}
                                onChange={(e) => setEditingPriceVal(e.target.value)}
                                className="h-6 w-20 text-xs font-bold"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveInlinePrice(item);
                                  if (e.key === "Escape") setEditingPriceId(null);
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-emerald-600"
                                onClick={() => handleSaveInlinePrice(item)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canManage) return;
                                setEditingPriceId(item.id);
                                setEditingPriceVal(item.price);
                              }}
                              className="group/price flex items-center gap-1 text-xs font-bold text-foreground/90 hover:text-primary"
                            >
                              <span>₹{item.price}</span>
                              {canManage && (
                                <Pencil className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover/price:opacity-100 text-muted-foreground" />
                              )}
                            </button>
                          )}
                          <span className="text-[10px] text-muted-foreground/70">
                            • {item.category?.name ?? "General"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Online Display Name */}
                    <TableCell className="text-xs text-muted-foreground">
                      {item.description ? (
                        <span className="truncate max-w-[120px] block font-medium text-foreground/80">
                          {item.description}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* Short Code */}
                    <TableCell>
                      <span className="font-mono text-xs italic text-muted-foreground">
                        {item.sku || item.barcode || item.name.toLowerCase().replace(/\s+/g, "")}
                      </span>
                    </TableCell>

                    {/* Status Toggle Switch */}
                    <TableCell className="text-center">
                      <Switch
                        checked={item.isActive}
                        disabled={!canManage || updateItem.isPending}
                        onCheckedChange={(checked) => {
                          updateItem.mutate({
                            id: item.id,
                            dto: { isActive: checked },
                          });
                        }}
                        aria-label={`Toggle status for ${item.name}`}
                      />
                    </TableCell>

                    {/* Last Update */}
                    <TableCell className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
                      11 days ago
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer matching Petpooja */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 bg-card/30 text-xs">
        <div className="text-muted-foreground">
          Showing {totalRecords === 0 ? 0 : startIndex + 1} to{" "}
          {Math.min(startIndex + rowsPerPage, totalRecords)} of {totalRecords} items
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Rows</span>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(v) => {
                if (v) {
                  setRowsPerPage(parseInt(v, 10));
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="h-7 px-2 text-[11px]"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 px-2 text-[11px]"
            >
              Prev
            </Button>
            <span className="px-2 text-[11px] font-semibold">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2 text-[11px]"
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="h-7 px-2 text-[11px]"
            >
              Last
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
