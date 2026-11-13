"use client";

import {
  FolderPlus,
  Layers,
  LayoutGrid,
  Percent,
  Plus,
  Receipt,
  UtensilsCrossed,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AddCategoryDialog } from "@/components/menu/add-category-dialog";
import { AddItemDialog } from "@/components/menu/add-item-dialog";
import { BulkImportDialog } from "@/components/menu/bulk-import-dialog";
import { CategorySidebar } from "@/components/menu/category-sidebar";
import { ComboComponentsDialog } from "@/components/menu/combo-components-dialog";
import { EditCategoryDialog } from "@/components/menu/edit-category-dialog";
import { EditItemDialog } from "@/components/menu/edit-item-dialog";
import { MenuItemsTable } from "@/components/menu/menu-items-table";
import { QuickToolsDialog } from "@/components/menu/quick-tools-dialog";
import { TaxRatesView } from "@/components/menu/tax-rates-view";
import { TablesAndAreasView } from "@/components/tables/tables-and-areas-view";
import { FloatingAiAgent } from "@/components/ai/floating-ai-agent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import {
  useCategories,
  useDeleteCategory,
  useDeleteMenuItem,
  useMenuItems,
  type MenuCategory,
  type MenuItem,
} from "@/hooks/use-menu";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type MenuTab = "items" | "categories" | "tables" | "taxes";

export default function MenuPage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  const canManage = hasPermission(me?.user, "menu.manage");

  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") as MenuTab) || "items";
  const [activeTab, setActiveTab] = useState<MenuTab>(tabParam);

  // Queries
  const { data: categories, isLoading: categoriesLoading } = useCategories(branchId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const { data: items, isLoading: itemsLoading } = useMenuItems(branchId, selectedCategoryId);
  const { data: allItems } = useMenuItems(branchId);

  // Dialog States
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [quickToolsOpen, setQuickToolsOpen] = useState(false);
  const [quickToolsSelected, setQuickToolsSelected] = useState<MenuItem[]>([]);
  const [comboItem, setComboItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [categorySidebarCollapsed, setCategorySidebarCollapsed] = useState(false);

  const deleteCategory = useDeleteCategory(branchId);

  const totalItemCount = allItems?.length ?? 0;

  const handleOpenQuickTools = (selected: MenuItem[]) => {
    setQuickToolsSelected(selected);
    setQuickToolsOpen(true);
  };

  const onDeleteCategory = (category: MenuCategory) => {
    if (!confirm(`Delete the "${category.name}" category? This cannot be undone.`)) return;
    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        toast.success(`"${category.name}" deleted`);
        if (selectedCategoryId === category.id) setSelectedCategoryId(undefined);
      },
      onError: (err) =>
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Could not delete category — remove its items first",
        ),
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-4 sm:-m-6 overflow-hidden bg-background">
      {/* Top Menu Management Navigation Bar matching Petpooja */}
      <div className="flex flex-wrap items-center justify-between border-b bg-card/60 px-5 py-2.5 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              Menu Management
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Configure dishes, categories, areas, pricing and tax slabs.
            </p>
          </div>
        </div>

        {/* Sub-Nav Tabs */}
        <div className="flex items-center gap-1.5">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as MenuTab)}
            className="w-auto"
          >
            <TabsList className="h-8 bg-muted/60 p-0.5">
              <TabsTrigger value="items" className="h-7 gap-1.5 px-3 text-xs font-semibold">
                <UtensilsCrossed className="h-3.5 w-3.5" /> Items
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {totalItemCount}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="categories" className="h-7 gap-1.5 px-3 text-xs font-semibold">
                <Layers className="h-3.5 w-3.5" /> Categories
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {categories?.length ?? 0}
                </Badge>
              </TabsTrigger>

              <TabsTrigger value="tables" className="h-7 gap-1.5 px-3 text-xs font-semibold">
                <LayoutGrid className="h-3.5 w-3.5" /> Tables & Areas
              </TabsTrigger>

              <TabsTrigger value="taxes" className="h-7 gap-1.5 px-3 text-xs font-semibold">
                <Percent className="h-3.5 w-3.5" /> Taxes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Tab View Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tab 1: Menu Items (with Left Category Browser) */}
        {activeTab === "items" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Collapsible Left Category Browser */}
            <CategorySidebar
              categories={categories}
              isLoading={categoriesLoading}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              totalItemCount={totalItemCount}
              onAddCategoryClick={() => setAddCategoryOpen(true)}
              isCollapsed={categorySidebarCollapsed}
              onToggleCollapse={() => setCategorySidebarCollapsed((prev) => !prev)}
            />

            {/* High-Performance Items Table */}
            <MenuItemsTable
              items={items ?? []}
              allItems={allItems ?? []}
              isLoading={itemsLoading}
              canManage={canManage}
              branchId={branchId}
              onAddItemClick={() => setAddItemOpen(true)}
              onEditItemClick={(item) => setEditingItem(item)}
              onOpenBulkImport={() => setBulkImportOpen(true)}
              onOpenQuickTools={handleOpenQuickTools}
              onToggleCategoryDrawer={
                categorySidebarCollapsed
                  ? () => setCategorySidebarCollapsed(false)
                  : undefined
              }
            />
          </div>
        )}

        {/* Tab 2: Categories Management View */}
        {activeTab === "categories" && (
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Categories ({categories?.length ?? 0})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Organize dishes into menu sections shown on POS, Captain PWA, and Guest QR.
                </p>
              </div>
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => setAddCategoryOpen(true)}
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Category
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(categories ?? []).map((cat) => (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-sm text-foreground">{cat.name}</h3>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {cat._count?.items ?? 0} items
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Display Rank: {cat.sortOrder}
                    </p>
                  </div>

                  {canManage && (
                    <div className="mt-4 flex items-center justify-end gap-1 border-t pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCategory(cat)}
                        className="h-7 px-2 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteCategory(cat)}
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Tables & Areas (Matching Screenshots 4 & 5) */}
        {activeTab === "tables" && (
          <TablesAndAreasView
            branchId={branchId}
            canManage={canManage}
            onNavigateToItems={() => setActiveTab("items")}
          />
        )}

        {/* Tab 4: Taxes & Split GST (Matching Screenshot 6) */}
        {activeTab === "taxes" && (
          <TaxRatesView
            branchId={branchId}
            canManage={canManage}
            onNavigateToItems={() => setActiveTab("items")}
          />
        )}
      </div>

      {/* Quick Tools Suite Modal (Matching Screenshot 3) */}
      <QuickToolsDialog
        open={quickToolsOpen}
        onOpenChange={setQuickToolsOpen}
        branchId={branchId}
        selectedItems={quickToolsSelected}
      />

      {/* Dialogs */}
      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        branchId={branchId}
        categories={categories ?? []}
        defaultCategoryId={selectedCategoryId}
      />

      <AddCategoryDialog
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
        branchId={branchId}
      />

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          categories={categories ?? []}
          onClose={() => setEditingItem(null)}
          branchId={branchId}
        />
      )}

      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          branchId={branchId}
        />
      )}

      {comboItem && (
        <ComboComponentsDialog
          item={comboItem}
          allItems={allItems ?? []}
          open={Boolean(comboItem)}
          onOpenChange={(open) => !open && setComboItem(null)}
          branchId={branchId}
        />
      )}

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        branchId={branchId}
      />

      {/* Floating Draggable AI Assistant Widget */}
      <FloatingAiAgent />
    </div>
  );
}
