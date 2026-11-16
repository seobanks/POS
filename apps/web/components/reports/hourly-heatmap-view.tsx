"use client";

import { useMemo, useState } from "react";
import { Clock, Flame, Info, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface HourlyHeatmapViewProps {
  rows: (string | number | null)[][];
}

interface HeatCell {
  hourWindow: string;
  dayIndex: number;
  dayName: string;
  hour: number;
  orders: number;
  sales: number;
  aov: number;
  level: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HourlyHeatmapView({ rows }: HourlyHeatmapViewProps) {
  const [metric, setMetric] = useState<"sales" | "orders">("sales");
  const [selectedCell, setSelectedCell] = useState<HeatCell | null>(null);

  const { cells, maxSales, maxOrders, peakCell, totalSales, totalOrders } = useMemo<{
    cells: HeatCell[];
    maxSales: number;
    maxOrders: number;
    peakCell: HeatCell | null;
    totalSales: number;
    totalOrders: number;
  }>(() => {
    let maxSales = 0;
    let maxOrders = 0;
    let totalSales = 0;
    let totalOrders = 0;
    let peak: HeatCell | null = null;

    const cells: HeatCell[] = rows.map((r) => {
      const hw = String(r[0] || "00:00 - 01:00");
      const dayIndex = Number(r[1] || 0);
      const dayName = String(r[2] || DAY_NAMES[dayIndex] || "Sun");
      const orders = Number(r[3] || 0);
      const sales = Number(r[4] || 0);
      const aov = Number(r[5] || 0);
      const level = String(r[6] || "Low");

      // Extract starting hour from "08:00 - 09:00"
      const hour = parseInt(hw.slice(0, 2), 10) || 0;

      if (sales > maxSales) maxSales = sales;
      if (orders > maxOrders) maxOrders = orders;
      totalSales += sales;
      totalOrders += orders;

      const cell: HeatCell = {
        hourWindow: hw,
        dayIndex,
        dayName,
        hour,
        orders,
        sales,
        aov,
        level,
      };

      if (!peak || sales > peak.sales) {
        peak = cell;
      }

      return cell;
    });

    return {
      cells,
      maxSales,
      maxOrders,
      peakCell: peak,
      totalSales,
      totalOrders,
    };
  }, [rows]);

  // Lookup map: `${dayIndex}-${hour}` -> HeatCell
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatCell>();
    for (const c of cells) {
      map.set(`${c.dayIndex}-${c.hour}`, c);
    }
    return map;
  }, [cells]);

  const getHeatColor = (cell?: HeatCell) => {
    if (!cell) return "bg-secondary/20 border-transparent";
    const val = metric === "sales" ? cell.sales : cell.orders;
    const max = metric === "sales" ? maxSales : maxOrders;
    if (max === 0 || val === 0) return "bg-secondary/30 border-transparent hover:border-border";

    const ratio = val / max;
    if (ratio > 0.75) return "bg-red-500 text-white font-bold border-red-600 shadow-xs";
    if (ratio > 0.5) return "bg-amber-500 text-white font-bold border-amber-600";
    if (ratio > 0.25) return "bg-emerald-500/80 text-white border-emerald-600";
    if (ratio > 0.1) return "bg-emerald-500/40 text-foreground border-emerald-500/40";
    return "bg-emerald-500/15 text-muted-foreground border-emerald-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Top Insights & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Peak Rush Window */}
        <Card className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
              Peak Traffic Window
            </span>
            <span className="text-sm font-bold text-foreground">
              {peakCell ? `${peakCell.dayName} · ${peakCell.hourWindow}` : "No traffic yet"}
            </span>
            <span className="text-xs text-red-500 font-mono block">
              {peakCell ? `${formatCurrency(peakCell.sales)} (${peakCell.orders} orders)` : ""}
            </span>
          </div>
        </Card>

        {/* Total Weekly Sales & Orders */}
        <Card className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
              Total Period Volume
            </span>
            <span className="text-sm font-bold text-foreground font-mono">
              {formatCurrency(totalSales)}
            </span>
            <span className="text-xs text-muted-foreground font-mono block">
              {totalOrders} total completed orders
            </span>
          </div>
        </Card>

        {/* Metric Selector Toggle */}
        <Card className="p-4 rounded-2xl border border-border bg-card flex flex-col justify-between gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Heatmap Color Intensity
          </span>
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-xl p-1 border">
            <button
              type="button"
              onClick={() => setMetric("sales")}
              className={cn(
                "flex-1 py-1 rounded-lg text-xs font-semibold transition-all",
                metric === "sales" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sales (₹)
            </button>
            <button
              type="button"
              onClick={() => setMetric("orders")}
              className={cn(
                "flex-1 py-1 rounded-lg text-xs font-semibold transition-all",
                metric === "orders" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Order Count
            </button>
          </div>
        </Card>
      </div>

      {/* Heatmap Grid Container */}
      <Card className="p-5 rounded-2xl border border-border bg-card overflow-x-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              24-Hour × 7-Day Revenue Density Heatmap
            </h3>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
            <span>Low</span>
            <div className="flex items-center gap-1">
              <span className="h-3 w-4 rounded-xs bg-emerald-500/20" />
              <span className="h-3 w-4 rounded-xs bg-emerald-500/50" />
              <span className="h-3 w-4 rounded-xs bg-emerald-500" />
              <span className="h-3 w-4 rounded-xs bg-amber-500" />
              <span className="h-3 w-4 rounded-xs bg-red-500" />
            </div>
            <span>Peak Rush 🔥</span>
          </div>
        </div>

        {/* Heatmap Table */}
        <div className="min-w-[760px]">
          {/* Header row: Hours */}
          <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 text-center text-[10px] font-mono text-muted-foreground pb-2 border-b">
            <div>Day</div>
            {HOURS.map((h) => (
              <div key={h} className="truncate">
                {h % 3 === 0 ? `${h}h` : "·"}
              </div>
            ))}
          </div>

          {/* 7 Day Rows */}
          <div className="space-y-1.5 pt-2">
            {DAY_NAMES.map((dayName, dayIndex) => (
              <div
                key={dayName}
                className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 items-center"
              >
                <span className="text-xs font-bold font-mono text-foreground text-left">
                  {dayName}
                </span>

                {HOURS.map((hour) => {
                  const cell = cellMap.get(`${dayIndex}-${hour}`);
                  const isSelected =
                    selectedCell?.dayIndex === dayIndex && selectedCell?.hour === hour;

                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => setSelectedCell(cell ?? null)}
                      className={cn(
                        "h-8 rounded-md border text-[9px] font-mono flex items-center justify-center transition-all hover:scale-105 active:scale-95",
                        getHeatColor(cell),
                        isSelected && "ring-2 ring-primary ring-offset-1",
                      )}
                      title={
                        cell
                          ? `${cell.dayName} ${cell.hourWindow}: ${formatCurrency(cell.sales)} (${cell.orders} orders)`
                          : `${dayName} ${hour}:00 - No orders`
                      }
                    >
                      {cell && (metric === "sales" ? (cell.sales > 0 ? `₹${Math.round(cell.sales / 1000)}k` : "") : (cell.orders > 0 ? cell.orders : ""))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Cell Detail Drawer / Bar */}
        {selectedCell && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-4 mt-4 animate-in fade-in duration-200">
            <div>
              <span className="text-xs font-bold text-foreground">
                {selectedCell.dayName} ({selectedCell.hourWindow})
              </span>
              <span className="text-xs text-muted-foreground block mt-0.5">
                Traffic status: <strong>{selectedCell.level}</strong>
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono">
              <div>
                <span className="text-muted-foreground text-[10px] block">Sales</span>
                <strong className="text-sm font-bold text-foreground">
                  {formatCurrency(selectedCell.sales)}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Orders</span>
                <strong className="text-sm font-bold text-foreground">
                  {selectedCell.orders}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">AOV</span>
                <strong className="text-sm font-bold text-emerald-500">
                  {formatCurrency(selectedCell.aov)}
                </strong>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCell(null)}
              className="h-7 text-xs text-muted-foreground"
            >
              Dismiss
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
