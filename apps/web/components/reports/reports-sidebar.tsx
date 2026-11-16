"use client";

import { useMemo, useState } from "react";
import {
  Search,
  X,
  FileText,
  TrendingUp,
  Receipt,
  BarChart3,
  Users,
  Award,
  Clock,
  Package,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CatalogEntry {
  key: string;
  title: string;
  group: string;
}

interface ReportsSidebarProps {
  catalog?: CatalogEntry[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  className?: string;
}

const GROUP_ICONS: Record<string, React.ElementType> = {
  Sales: TrendingUp,
  Tax: Receipt,
  Analytics: BarChart3,
  Customers: Users,
  Staff: Award,
  Operations: Clock,
  Inventory: Package,
};

export function ReportsSidebar({
  catalog = [],
  selectedKey,
  onSelectKey,
  className,
}: ReportsSidebarProps) {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");

  const allGroups = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((c) => {
      if (c.group) set.add(c.group);
    });
    return Array.from(set);
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.title.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q);

      const matchesGroup =
        selectedGroup === "ALL" || item.group === selectedGroup;

      return matchesSearch && matchesGroup;
    });
  }, [catalog, search, selectedGroup]);

  // Group the filtered results
  const groupedResults = useMemo(() => {
    const map = new Map<string, CatalogEntry[]>();
    for (const item of filteredCatalog) {
      const g = item.group || "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return map;
  }, [filteredCatalog]);

  const totalReportsCount = catalog.length;

  return (
    <aside
      className={cn(
        "print:hidden flex flex-col rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md p-3.5 shadow-xs transition-all",
        "lg:sticky lg:top-4 lg:h-[calc(100vh-100px)] lg:max-h-[calc(100vh-100px)]",
        className,
      )}
    >
      {/* Header with Title & Filter Count */}
      <div className="flex items-center justify-between pb-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            Reports Directory
          </span>
        </div>
        <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5">
          {filteredCatalog.length} / {totalReportsCount}
        </Badge>
      </div>

      {/* Search Input */}
      <div className="relative my-2.5 shrink-0">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Filter reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 pr-7 text-xs bg-muted/40 border-border/60 focus-visible:ring-1 focus-visible:ring-primary"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 shrink-0 scrollbar-none no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedGroup("ALL")}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all",
            selectedGroup === "ALL"
              ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
              : "text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-transparent",
          )}
        >
          All
        </button>
        {allGroups.map((g) => {
          const count = catalog.filter((c) => c.group === g).length;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGroup(g === selectedGroup ? "ALL" : g)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-all flex items-center gap-1",
                selectedGroup === g
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-transparent",
              )}
            >
              <span>{g}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Navigation List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 py-1 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/35">
        {groupedResults.size === 0 ? (
          <div className="py-8 text-center px-2">
            <Filter className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No reports match your search</p>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedGroup("ALL");
                }}
                className="mt-2 text-xs text-primary hover:underline font-medium"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          Array.from(groupedResults.entries()).map(([groupName, items]) => {
            const GroupIcon = GROUP_ICONS[groupName] || FileText;

            return (
              <div key={groupName} className="space-y-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <GroupIcon className="h-3.5 w-3.5 text-muted-foreground/70" />
                    <span>{groupName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isSelected = selectedKey === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onSelectKey(item.key)}
                        className={cn(
                          "group flex items-center justify-between w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground font-medium shadow-2xs shadow-primary/30"
                            : "text-foreground/80 hover:text-foreground hover:bg-muted/60",
                        )}
                      >
                        <span className="truncate pr-1.5 leading-snug">{item.title}</span>
                        {isSelected ? (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-90 animate-in fade-in slide-in-from-left-1 duration-150" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0 transition-all" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 mt-2 border-t border-border/40 shrink-0 text-[11px] text-muted-foreground/70 flex items-center justify-between px-1">
        <span>Click to load report</span>
        <span className="text-[10px] font-mono opacity-80">v2.0</span>
      </div>
    </aside>
  );
}
