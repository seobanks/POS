"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Crown,
  DollarSign,
  Medal,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StaffPerformanceViewProps {
  rows: (string | number | null)[][];
}

interface StaffMember {
  name: string;
  role: string;
  completed: number;
  cancelled: number;
  grossSales: number;
  netSales: number;
  aov: number;
  tips: number;
  cancelRate: string;
}

export function StaffPerformanceView({ rows }: StaffPerformanceViewProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"netSales" | "completed" | "aov" | "tips">("netSales");

  const staffList: StaffMember[] = useMemo(() => {
    return rows.map((r) => ({
      name: String(r[0] || "Staff"),
      role: String(r[1] || "Crew"),
      completed: Number(r[2] || 0),
      cancelled: Number(r[3] || 0),
      grossSales: Number(r[4] || 0),
      netSales: Number(r[5] || 0),
      aov: Number(r[6] || 0),
      tips: Number(r[7] || 0),
      cancelRate: String(r[8] || "0%"),
    }));
  }, [rows]);

  const filtered = useMemo(() => {
    return staffList
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "netSales") return b.netSales - a.netSales;
        if (sortBy === "completed") return b.completed - a.completed;
        if (sortBy === "aov") return b.aov - a.aov;
        return b.tips - a.tips;
      });
  }, [staffList, search, sortBy]);

  const top3 = useMemo(() => {
    return [...staffList].sort((a, b) => b.netSales - a.netSales).slice(0, 3);
  }, [staffList]);

  return (
    <div className="space-y-6">
      {/* Top 3 Staff Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((staff, rank) => {
            const isFirst = rank === 0;
            const isSecond = rank === 1;
            const medal = isFirst ? "🥇" : isSecond ? "🥈" : "🥉";
            const borderCol = isFirst
              ? "border-amber-500/50 bg-amber-500/5"
              : isSecond
                ? "border-zinc-400/50 bg-secondary/30"
                : "border-amber-700/40 bg-secondary/20";

            return (
              <Card
                key={staff.name}
                className={cn(
                  "p-5 rounded-2xl border text-center flex flex-col justify-between gap-3 shadow-xs relative overflow-hidden",
                  borderCol,
                )}
              >
                {isFirst && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <Crown className="h-3 w-3" /> Top Producer
                  </div>
                )}

                <div>
                  <span className="text-3xl block mb-1">{medal}</span>
                  <h3 className="text-base font-bold text-foreground">{staff.name}</h3>
                  <Badge variant="outline" className="text-[10px] font-semibold mt-1">
                    {staff.role}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-background/60 rounded-xl p-3 border border-border/50 text-left">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Net Sales</span>
                    <strong className="text-sm font-bold font-mono text-foreground block">
                      {formatCurrency(staff.netSales)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Orders Completed</span>
                    <strong className="text-sm font-bold font-mono text-foreground block">
                      {staff.completed} orders
                    </strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">AOV: <strong>{formatCurrency(staff.aov)}</strong></span>
                    <span className="text-muted-foreground">Tips: <strong className="text-emerald-500">{formatCurrency(staff.tips)}</strong></span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Search and Sort Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff name or role..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-muted-foreground">Sort By:</span>
          <button
            type="button"
            onClick={() => setSortBy("netSales")}
            className={cn("px-2.5 py-1 rounded-lg border", sortBy === "netSales" ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary")}
          >
            Net Sales
          </button>
          <button
            type="button"
            onClick={() => setSortBy("completed")}
            className={cn("px-2.5 py-1 rounded-lg border", sortBy === "completed" ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary")}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setSortBy("aov")}
            className={cn("px-2.5 py-1 rounded-lg border", sortBy === "aov" ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary")}
          >
            AOV
          </button>
          <button
            type="button"
            onClick={() => setSortBy("tips")}
            className={cn("px-2.5 py-1 rounded-lg border", sortBy === "tips" ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-secondary")}
          >
            Tips
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <Card className="rounded-2xl border border-border bg-card overflow-x-auto shadow-xs">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b bg-secondary/20">
            <tr>
              <th className="py-3 px-4 font-semibold">Staff Member</th>
              <th className="py-3 px-4 font-semibold">Role</th>
              <th className="py-3 px-4 font-semibold text-right">Orders Taken</th>
              <th className="py-3 px-4 font-semibold text-right">Gross Sales</th>
              <th className="py-3 px-4 font-semibold text-right">Net Revenue</th>
              <th className="py-3 px-4 font-semibold text-right">Avg Order Value</th>
              <th className="py-3 px-4 font-semibold text-right">Tips</th>
              <th className="py-3 px-4 font-semibold text-right">Cancel Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((s, idx) => {
              const cancelHigh = parseFloat(s.cancelRate) > 5;
              return (
                <tr key={`${s.name}-${idx}`} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-foreground">{s.name}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{s.role}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{s.completed}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{formatCurrency(s.grossSales)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-foreground">{formatCurrency(s.netSales)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-foreground">{formatCurrency(s.aov)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-500 font-semibold">{formatCurrency(s.tips)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={cn("text-xs font-mono font-semibold", cancelHigh ? "text-red-500" : "text-muted-foreground")}>
                      {s.cancelRate}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
