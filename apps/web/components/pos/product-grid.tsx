"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  X,
  Sparkles,
  Layers,
  Leaf,
  Flame,
  Star,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { QueryError } from "@/components/ui/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTabs } from "@/components/ui/nav-picker";
import { useCategories, useMenuItems, type MenuItem } from "@/hooks/use-menu";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type DietaryFilter = "ALL" | "VEG" | "NON_VEG" | "HIGHLIGHTED";

export function ProductGrid({
  branchId,
  onSelect,
  activeItemId,
}: {
  branchId: string | null;
  onSelect: (item: MenuItem) => void;
  activeItemId?: string | null;
}) {
  const { data: categories } = useCategories(branchId);
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<DietaryFilter>("ALL");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data: items,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useMenuItems(branchId, activeCategoryId);

  // Global hotkey '/' or 'Ctrl+K' to focus search input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement !== searchInputRef.current
      ) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = items?.filter((i) => {
    // Search query filter
    const query = search.toLowerCase().trim();
    if (query) {
      const matchName = i.name.toLowerCase().includes(query);
      const matchShortCode = i.shortCode?.toLowerCase().includes(query);
      const matchOnlineName = i.onlineDisplayName?.toLowerCase().includes(query);
      if (!matchName && !matchShortCode && !matchOnlineName) return false;
    }

    // Dietary & highlight filters
    if (dietaryFilter === "VEG" && !i.isVeg) return false;
    if (dietaryFilter === "NON_VEG" && i.isVeg) return false;
    if (dietaryFilter === "HIGHLIGHTED" && !i.isHighlighted) return false;

    return true;
  });

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            placeholder="Search products or short codes (e.g. gt30, coffee)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 pr-16 text-sm bg-muted/30 focus-visible:bg-background transition-colors rounded-xl border-border"
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-muted/80 border border-border/80 font-mono text-[10px] text-muted-foreground pointer-events-none">
              /
            </kbd>
          )}
        </div>

        {/* Dietary Filters */}
        <div className="flex items-center gap-1 shrink-0 p-1 bg-muted/40 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setDietaryFilter("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              dietaryFilter === "ALL"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setDietaryFilter("VEG")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              dietaryFilter === "VEG"
                ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Show Veg items only"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
            <span>Veg</span>
          </button>
          <button
            type="button"
            onClick={() => setDietaryFilter("NON_VEG")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              dietaryFilter === "NON_VEG"
                ? "bg-red-600/10 text-red-700 dark:text-red-400 border border-red-500/30 shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Show Non-Veg items only"
          >
            <span className="h-2 w-2 rounded-full bg-red-600 shrink-0" />
            <span>Non-Veg</span>
          </button>
          <button
            type="button"
            onClick={() => setDietaryFilter("HIGHLIGHTED")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
              dietaryFilter === "HIGHLIGHTED"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="Featured & Highlighted items"
          >
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>Stars</span>
          </button>
        </div>
      </div>

      {/* Mobile Category Dropdown / Horizontal Tabs */}
      {categories && categories.length > 0 && (
        <ResponsiveTabs
          mobileOnly
          className="lg:hidden"
          label="Category"
          value={activeCategoryId ?? "all"}
          onChange={(id) => setActiveCategoryId(id === "all" ? undefined : id)}
          desktopListClassName="justify-start lg:h-auto lg:flex-wrap"
          items={[
            { id: "all", label: "All Items" },
            ...categories.map((c) => ({
              id: c.id,
              label: c.name,
              hint: `${c._count.items} items`,
            })),
          ]}
        />
      )}

      {/* Main Split: Left Categories + Right Product Grid */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-4">
        {categories && categories.length > 0 && (
          <nav
            aria-label="Category Browser"
            className="hidden w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border pr-2.5 lg:flex xl:w-52"
          >
            {[
              {
                id: undefined as string | undefined,
                name: "All Items",
                count: categories.reduce((sum, c) => sum + (c._count?.items ?? 0), 0),
              },
              ...categories.map((c) => ({
                id: c.id as string | undefined,
                name: c.name,
                count: c._count.items as number | undefined,
              })),
            ].map((c) => {
              const active = c.id === activeCategoryId;
              return (
                <button
                  key={c.id ?? "all"}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setActiveCategoryId(c.id)}
                  className={cn(
                    "flex min-h-9 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-all",
                    active
                      ? "bg-primary font-bold text-primary-foreground shadow-2xs"
                      : "font-medium text-foreground hover:bg-muted/70",
                  )}
                >
                  <span className="min-w-0 truncate leading-snug">{c.name}</span>
                  {c.count !== undefined && (
                    <span
                      className={cn(
                        "shrink-0 text-[11px] tabular-nums px-1.5 py-0.2 rounded-md font-semibold",
                        active ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground bg-muted",
                      )}
                    >
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Product Cards Grid */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isError && !items ? (
            <QueryError
              error={error}
              what="the menu"
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          ) : (
            <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto pb-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {isLoading &&
                Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}

              {filtered?.map((item) => {
                const isSelected = activeItemId === item.id;
                const hasOptions = item.modifierGroups.length > 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className={cn(
                      "pos-tile relative flex min-h-[105px] flex-col justify-between rounded-xl border bg-card p-3 text-left transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/40 bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/30 shadow-2xs",
                    )}
                  >
                    {/* Top Row: Veg Indicator + Short Code + Highlight Star */}
                    <div className="flex items-center justify-between w-full gap-1">
                      <div className="flex items-center gap-1.5">
                        {/* Standard Indian FSSAI Veg / Non-Veg Border Square */}
                        <span
                          className={cn(
                            "flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border p-0.5",
                            item.isVeg
                              ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                              : "border-red-600 bg-red-50 dark:bg-red-950",
                          )}
                          title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              item.isVeg ? "bg-emerald-600" : "bg-red-600",
                            )}
                          />
                        </span>
                        {item.shortCode && (
                          <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-tight bg-muted/60 px-1 rounded">
                            {item.shortCode}
                          </span>
                        )}
                      </div>

                      {item.isHighlighted && (
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      )}
                    </div>

                    {/* Middle: Item Title */}
                    <div className="my-1.5">
                      <p className="text-xs sm:text-[13px] font-semibold leading-tight text-foreground line-clamp-2">
                        {item.name}
                      </p>
                    </div>

                    {/* Bottom Row: Price & Modifiers Tag */}
                    <div className="flex w-full items-baseline justify-between gap-1 mt-auto pt-1 border-t border-border/40">
                      <span className="text-xs sm:text-sm font-extrabold tabular-nums text-foreground tracking-tight">
                        {formatCurrency(item.price)}
                      </span>

                      {item.halfPrice != null ? (
                        <span className="text-[10px] tabular-nums font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded">
                          ½ {formatCurrency(item.halfPrice)}
                        </span>
                      ) : hasOptions ? (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Layers className="h-2.5 w-2.5" />
                          <span>Custom</span>
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}

              {filtered?.length === 0 && !isLoading && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <p className="text-sm font-medium">No menu items found</p>
                  <p className="text-xs mt-1">
                    {search ? `No items match "${search}"` : "This category has no items yet"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
