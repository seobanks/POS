"use client";

import { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  Info,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MenuEngineeringQuadrantProps {
  rows: (string | number | null)[][];
}

interface AnalyzedItem {
  name: string;
  category: string;
  classification: "Star ⭐" | "Plowhorse 🐎" | "Puzzle 🧩" | "Dog 🐕" | string;
  qty: number;
  price: number;
  foodCost: number;
  unitMargin: number;
  totalMargin: number;
  revenue: number;
  strategy: string;
}

export function MenuEngineeringQuadrant({ rows }: MenuEngineeringQuadrantProps) {
  const [filter, setFilter] = useState<"all" | "stars" | "plowhorses" | "puzzles" | "dogs">("all");

  const items: AnalyzedItem[] = useMemo(() => {
    return rows.map((r) => ({
      name: String(r[0] || "Unknown"),
      category: String(r[1] || "General"),
      classification: String(r[2] || "Dog 🐕"),
      qty: Number(r[3] || 0),
      price: Number(r[4] || 0),
      foodCost: Number(r[5] || 0),
      unitMargin: Number(r[6] || 0),
      totalMargin: Number(r[7] || 0),
      revenue: Number(r[8] || 0),
      strategy: String(r[9] || ""),
    }));
  }, [rows]);

  const stars = useMemo(() => items.filter((i) => i.classification.includes("Star")), [items]);
  const plowhorses = useMemo(() => items.filter((i) => i.classification.includes("Plowhorse")), [items]);
  const puzzles = useMemo(() => items.filter((i) => i.classification.includes("Puzzle")), [items]);
  const dogs = useMemo(() => items.filter((i) => i.classification.includes("Dog")), [items]);

  const totalRevenue = useMemo(() => items.reduce((s, i) => s + i.revenue, 0), [items]);
  const totalMargin = useMemo(() => items.reduce((s, i) => s + i.totalMargin, 0), [items]);

  const displayedItems = useMemo(() => {
    if (filter === "stars") return stars;
    if (filter === "plowhorses") return plowhorses;
    if (filter === "puzzles") return puzzles;
    if (filter === "dogs") return dogs;
    return items;
  }, [filter, items, stars, plowhorses, puzzles, dogs]);

  return (
    <div className="space-y-6">
      {/* 4 Quadrant Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Stars */}
        <button
          type="button"
          onClick={() => setFilter(filter === "stars" ? "all" : "stars")}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all group",
            filter === "stars"
              ? "border-amber-500 bg-amber-500/10 shadow-xs"
              : "border-border/80 bg-card hover:border-amber-500/50",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">⭐</span>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">
              High Profit · High Volume
            </Badge>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground tabular-nums block">
              {stars.length} Items
            </span>
            <span className="text-xs font-semibold text-amber-500">
              STARS ({items.length > 0 ? Math.round((stars.length / items.length) * 100) : 0}%)
            </span>
            <p className="text-[11px] text-muted-foreground mt-1">
              Your crown jewels. Keep quality flawless and promote prominently.
            </p>
          </div>
        </button>

        {/* Plowhorses */}
        <button
          type="button"
          onClick={() => setFilter(filter === "plowhorses" ? "all" : "plowhorses")}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all group",
            filter === "plowhorses"
              ? "border-blue-500 bg-blue-500/10 shadow-xs"
              : "border-border/80 bg-card hover:border-blue-500/50",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">🐎</span>
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold">
              Low Profit · High Volume
            </Badge>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground tabular-nums block">
              {plowhorses.length} Items
            </span>
            <span className="text-xs font-semibold text-blue-500">
              PLOWHORSES ({items.length > 0 ? Math.round((plowhorses.length / items.length) * 100) : 0}%)
            </span>
            <p className="text-[11px] text-muted-foreground mt-1">
              Crowd-pleasers with tight margin. Raise price slightly or optimize food cost.
            </p>
          </div>
        </button>

        {/* Puzzles */}
        <button
          type="button"
          onClick={() => setFilter(filter === "puzzles" ? "all" : "puzzles")}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all group",
            filter === "puzzles"
              ? "border-purple-500 bg-purple-500/10 shadow-xs"
              : "border-border/80 bg-card hover:border-purple-500/50",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">🧩</span>
            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-bold">
              High Profit · Low Volume
            </Badge>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground tabular-nums block">
              {puzzles.length} Items
            </span>
            <span className="text-xs font-semibold text-purple-500">
              PUZZLES ({items.length > 0 ? Math.round((puzzles.length / items.length) * 100) : 0}%)
            </span>
            <p className="text-[11px] text-muted-foreground mt-1">
              High margin but overlooked. Train staff to upsell and feature in recommendations.
            </p>
          </div>
        </button>

        {/* Dogs */}
        <button
          type="button"
          onClick={() => setFilter(filter === "dogs" ? "all" : "dogs")}
          className={cn(
            "p-4 rounded-2xl border text-left transition-all group",
            filter === "dogs"
              ? "border-rose-500 bg-rose-500/10 shadow-xs"
              : "border-border/80 bg-card hover:border-rose-500/50",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">🐕</span>
            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px] font-bold">
              Low Profit · Low Volume
            </Badge>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-foreground tabular-nums block">
              {dogs.length} Items
            </span>
            <span className="text-xs font-semibold text-rose-500">
              DOGS ({items.length > 0 ? Math.round((dogs.length / items.length) * 100) : 0}%)
            </span>
            <p className="text-[11px] text-muted-foreground mt-1">
              Unprofitable and unpopular. Re-engineer ingredients or drop from menu.
            </p>
          </div>
        </button>
      </div>

      {/* Filter Tabs & Total Margin Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            All Items ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("stars")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              filter === "stars" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            Stars ⭐ ({stars.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("plowhorses")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              filter === "plowhorses" ? "bg-blue-500 text-white" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            Plowhorses 🐎 ({plowhorses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("puzzles")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              filter === "puzzles" ? "bg-purple-500 text-white" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            Puzzles 🧩 ({puzzles.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("dogs")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              filter === "dogs" ? "bg-rose-500 text-white" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            Dogs 🐕 ({dogs.length})
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span>Gross Revenue: <strong>{formatCurrency(totalRevenue)}</strong></span>
          <span>Contribution Margin: <strong className="text-emerald-500">{formatCurrency(totalMargin)}</strong></span>
        </div>
      </div>

      {/* Interactive Matrix Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {displayedItems.map((item, idx) => {
          const isStar = item.classification.includes("Star");
          const isPlowhorse = item.classification.includes("Plowhorse");
          const isPuzzle = item.classification.includes("Puzzle");
          const isDog = item.classification.includes("Dog");

          const badgeColor = isStar
            ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
            : isPlowhorse
              ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
              : isPuzzle
                ? "border-purple-500/30 bg-purple-500/10 text-purple-500"
                : "border-rose-500/30 bg-rose-500/10 text-rose-500";

          const marginPct = item.price > 0 ? Math.round((item.unitMargin / item.price) * 100) : 0;

          return (
            <Card
              key={`${item.name}-${idx}`}
              className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col justify-between gap-3 shadow-2xs hover:border-primary/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground line-clamp-1">{item.name}</h4>
                    <span className="text-[11px] text-muted-foreground font-medium">{item.category}</span>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5 shrink-0", badgeColor)}>
                    {item.classification}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-secondary/30 rounded-xl p-2.5 mt-3 text-center border border-border/50">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Sold</span>
                    <span className="text-xs font-bold font-mono text-foreground">{item.qty} units</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Margin</span>
                    <span className="text-xs font-bold font-mono text-emerald-500">{formatCurrency(item.unitMargin)} ({marginPct}%)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Revenue</span>
                    <span className="text-xs font-bold font-mono text-foreground">{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              </div>

              {/* Action Strategy Pill */}
              <div className="rounded-xl border bg-secondary/20 p-2.5 flex items-start gap-2 text-[11px]">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground leading-tight">
                  <strong className="text-foreground font-semibold">Strategy:</strong> {item.strategy}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
