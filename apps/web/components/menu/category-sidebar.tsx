"use client";

import { Folder, FolderPlus, Layers, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { MenuCategory } from "@/hooks/use-menu";
import { cn } from "@/lib/utils";

interface CategorySidebarProps {
  categories: MenuCategory[] | undefined;
  isLoading: boolean;
  selectedCategoryId: string | undefined;
  onSelectCategory: (id: string | undefined) => void;
  totalItemCount: number;
  onAddCategoryClick: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function CategorySidebar({
  categories = [],
  isLoading,
  selectedCategoryId,
  onSelectCategory,
  totalItemCount,
  onAddCategoryClick,
  isCollapsed = false,
  onToggleCollapse,
}: CategorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center border-r bg-card/60 p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          title="Expand categories pane"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-64 shrink-0 flex-col border-r bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Categories</h3>
        </div>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title="Collapse categories"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Category Search */}
      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search categories"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex flex-col gap-1.5 p-1">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {/* All Items Button */}
            <button
              type="button"
              onClick={() => onSelectCategory(undefined)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                selectedCategoryId === undefined
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <span className="truncate">All Items</span>
              <Badge
                variant={selectedCategoryId === undefined ? "secondary" : "outline"}
                className={cn(
                  "h-5 min-w-[24px] justify-center text-[10px] font-bold px-1.5",
                  selectedCategoryId === undefined
                    ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {totalItemCount}
              </Badge>
            </button>

            {/* Category Items */}
            {filtered.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const count = cat._count?.items ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="truncate text-left">{cat.name}</span>
                  <Badge
                    variant={isSelected ? "secondary" : "outline"}
                    className={cn(
                      "h-5 min-w-[20px] justify-center text-[10px] px-1.5",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground border-transparent font-bold"
                        : "bg-muted/70 text-muted-foreground border-border",
                    )}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching category
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Add Category */}
      <div className="border-t p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddCategoryClick}
          className="h-8 w-full gap-1.5 text-xs font-medium"
        >
          <FolderPlus className="h-3.5 w-3.5 text-primary" /> + Category
        </Button>
      </div>
    </div>
  );
}
