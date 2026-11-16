"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Printer, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SchedulesPanel } from "@/components/reports/schedules-panel";
import { MenuEngineeringQuadrant } from "@/components/reports/menu-engineering-quadrant";
import { HourlyHeatmapView } from "@/components/reports/hourly-heatmap-view";
import { StaffPerformanceView } from "@/components/reports/staff-performance-view";
import { ReportsSidebar, type CatalogEntry } from "@/components/reports/reports-sidebar";
interface ReportResult {
  key: string;
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function ReportsPage() {
  const { branchId } = useBranch();
  const { data: me } = useCurrentUser();
  const canExport = hasPermission(me?.user, "data.export");
  const [key, setKey] = useState("sales-daily");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [range, setRange] = useState(() => ({
    from: iso(new Date(Date.now() - 29 * 86_400_000)),
    to: iso(new Date()),
  }));

  const { data: catalog } = useQuery({
    queryKey: ["reports", "catalog"],
    queryFn: () => api.get<CatalogEntry[]>("/reports"),
  });
  const qs = `branchId=${branchId}&from=${range.from}&to=${range.to}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", key, branchId, range.from, range.to],
    queryFn: () => api.get<ReportResult>(`/reports/${key}?${qs}`),
    enabled: !!branchId && range.from <= range.to,
    retry: false,
  });

  const currentReport = catalog?.find((c) => c.key === key);

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Filter by date, print, export to Excel, PDF or CSV, or email on a schedule</p>
      </div>

      {/* Mobile Report Selector Bar (< lg) */}
      <div className="lg:hidden flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Active Report</p>
            <p className="text-sm font-medium text-foreground truncate">
              {currentReport?.title ?? key}
            </p>
          </div>
        </div>
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Change Report
              </Button>
            }
          />
          <SheetContent side="left" className="w-[310px] sm:w-[340px] p-0 flex flex-col bg-card border-r border-border">
            <SheetTitle className="sr-only">Select Report</SheetTitle>
            <ReportsSidebar
              catalog={catalog}
              selectedKey={key}
              onSelectKey={(newKey) => {
                setKey(newKey);
                setMobileSheetOpen(false);
              }}
              className="h-full border-none rounded-none bg-transparent shadow-none"
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
        {/* Desktop Sticky Scrollable Reports Directory (lg+) */}
        <div className="hidden lg:block print:hidden">
          <ReportsSidebar
            catalog={catalog}
            selectedKey={key}
            onSelectKey={setKey}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Input type="date" className="w-40" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            <Input type="date" className="w-40" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            {canExport &&
              (["xlsx", "pdf", "csv"] as const).map((f) => (
                <a
                  key={f}
                  href={`/api/v1/reports/${key}/export?${qs}&format=${f}`}
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm hover:bg-secondary"
                >
                  <Download className="mr-2 h-4 w-4" /> {f === "xlsx" ? "Excel" : f.toUpperCase()}
                </a>
              ))}
          </div>

          {/* Specialized Interactive Visual Views */}
          {data && data.rows.length > 0 && key === "menu-engineering" && (
            <MenuEngineeringQuadrant rows={data.rows} />
          )}

          {data && data.rows.length > 0 && key === "hourly-heatmap" && (
            <HourlyHeatmapView rows={data.rows} />
          )}

          {data && data.rows.length > 0 && key === "staff-performance" && (
            <StaffPerformanceView rows={data.rows} />
          )}

          <Card className="overflow-x-auto p-4">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {key === "menu-engineering"
                ? "Full Menu Item Strategy Table"
                : key === "hourly-heatmap"
                  ? "Raw Hourly Matrix Table"
                  : key === "staff-performance"
                    ? "Full Staff Metrics Table"
                    : (data?.title ?? catalog?.find((c) => c.key === key)?.title)}
            </h2>
            <p className="mb-3 hidden text-xs text-muted-foreground print:block">
              {range.from} to {range.to}
            </p>
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : error ? (
              <p className="text-sm text-destructive">{error instanceof ApiError ? error.message : "Could not load report"}</p>
            ) : data && data.rows.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    {data.columns.map((c) => (
                      <th key={c} className="py-1 pr-4 font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {r.map((cell, j) => (
                        <td key={j} className="py-1.5 pr-4 tabular-nums">{cell ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
            )}
          </Card>

          {canExport && (
            <SchedulesPanel
              branchId={branchId}
              reportKey={key}
              titles={Object.fromEntries((catalog ?? []).map((c) => [c.key, c.title]))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
