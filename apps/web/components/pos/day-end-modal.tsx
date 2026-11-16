"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Printer,
  Receipt,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission, useCurrentUser } from "@/hooks/use-auth";
import {
  useAccountingActions,
  useXReport,
  type XReportData,
  type ZReportResponse,
} from "@/hooks/use-accounting";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export interface DayEndModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string | null;
}

export function DayEndModal({ open, onOpenChange, branchId }: DayEndModalProps) {
  const { data: me } = useCurrentUser();
  const canViewFinancials = hasPermission(me?.user, "reports.financial.view");
  const hasBlindPermission = hasPermission(me?.user, "pos.blind_day_end");

  const [activeTab, setActiveTab] = useState<"z-report" | "x-report">("z-report");
  const [openingFloat, setOpeningFloat] = useState("500");
  const [note, setNote] = useState("");
  const [isBlindCount, setIsBlindCount] = useState(true);
  const [showDenomCalculator, setShowDenomCalculator] = useState(true);

  // Denominations count state
  const [denomCounts, setDenomCounts] = useState<Record<number, string>>({
    500: "",
    200: "",
    100: "",
    50: "",
    20: "",
    10: "",
  });
  const [directCounted, setDirectCounted] = useState("");

  // Result state after generating Z-Report
  const [zReportResult, setZReportResult] = useState<ZReportResponse | null>(null);

  // Queries and Actions
  const { data: xReport, isLoading: xLoading, refetch: refetchX } = useXReport(
    branchId,
    undefined,
    Number(openingFloat) || 0,
  );
  const { generateZReport } = useAccountingActions(branchId);

  // Calculate total counted from denominations or direct input
  const totalCounted = useMemo(() => {
    if (showDenomCalculator) {
      return Object.entries(denomCounts).reduce((sum, [denom, countStr]) => {
        const count = parseInt(countStr, 10);
        return sum + (isNaN(count) ? 0 : count * Number(denom));
      }, 0);
    }
    const val = parseFloat(directCounted);
    return isNaN(val) ? 0 : val;
  }, [denomCounts, directCounted, showDenomCalculator]);

  const expectedCash = xReport?.cashDrawer.expectedCash ?? 0;
  const variance = totalCounted - expectedCash;

  const handleDenomChange = (denom: number, val: string) => {
    setDenomCounts((prev) => ({ ...prev, [denom]: val }));
  };

  const handleResetCalculator = () => {
    setDenomCounts({
      500: "",
      200: "",
      100: "",
      50: "",
      20: "",
      10: "",
    });
    setDirectCounted("");
  };

  const handleCloseRegister = () => {
    if (totalCounted <= 0 && !confirm("Total counted cash is 0. Are you sure you want to proceed with 0 cash?")) {
      return;
    }

    const denomPayload: Record<string, number> = {};
    for (const [d, countStr] of Object.entries(denomCounts)) {
      const c = parseInt(countStr, 10);
      if (!isNaN(c) && c > 0) {
        denomPayload[d] = c;
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    generateZReport.mutate(
      {
        businessDate: todayStr,
        openingFloat: Number(openingFloat) || 0,
        countedCash: totalCounted,
        denominations: Object.keys(denomPayload).length > 0 ? denomPayload : undefined,
        isBlindCount,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          toast.success("Register closed & Z-Report generated!");
          setZReportResult(res);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to generate Z-Report");
        },
      },
    );
  };

  const handlePrintSlip = (text: string) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print slip.");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Register Slip</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 10px; line-height: 1.3; }
            pre { white-space: pre-wrap; margin: 0; }
          </style>
        </head>
        <body>
          <pre>${text}</pre>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopySlip = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Slip copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Day End & Register Audit
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Z-Report official register closing & X-Report interim mid-day readings
                </DialogDescription>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as any);
                setZReportResult(null);
              }}
              className="w-auto"
            >
              <TabsList className="h-8 bg-muted/60 p-0.5">
                <TabsTrigger value="z-report" className="h-7 px-3 text-xs font-semibold gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-500" /> Z-Report (Day End)
                </TabsTrigger>
                <TabsTrigger value="x-report" className="h-7 px-3 text-xs font-semibold gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-500" /> X-Report (Read)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: Z-REPORT CLOSING WORKFLOW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "z-report" && (
          <div className="space-y-5 py-2">
            {zReportResult ? (
              /* Z-Report Completed State: Monospace Slip Display */
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        Day End Closing Finalized — {zReportResult.zReportNumber}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Register locked by {zReportResult.cashierName} · Counted {formatCurrency(zReportResult.countedCash)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={zReportResult.variance === 0 ? "secondary" : "destructive"}
                    className="font-mono text-xs px-2.5 py-0.5"
                  >
                    Variance: {formatCurrency(zReportResult.variance)}
                  </Badge>
                </div>

                {/* Printable Terminal Slip View */}
                <div className="rounded-xl border bg-zinc-950 p-4 text-zinc-100 font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
                  <pre className="whitespace-pre">{zReportResult.printableSlip}</pre>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setZReportResult(null);
                      handleResetCalculator();
                    }}
                  >
                    <RotateCcw className="mr-2 h-3.5 w-3.5" /> Start New Count
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopySlip(zReportResult.printableSlip)}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" /> Copy Slip
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePrintSlip(zReportResult.printableSlip)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      <Printer className="mr-2 h-3.5 w-3.5" /> Print Thermal Slip (ESC/POS)
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Z-Report Setup & Counting Flow */
              <div className="space-y-5">
                {/* Top Controls: Blind Day End & Opening Float */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="openingFloat" className="text-xs font-semibold">
                      Opening Float (Till Float Amount)
                    </Label>
                    <div className="relative">
                      <Input
                        id="openingFloat"
                        type="number"
                        min="0"
                        step="10"
                        value={openingFloat}
                        onChange={(e) => setOpeningFloat(e.target.value)}
                        className="font-mono tabular-nums pl-7"
                        placeholder="500"
                      />
                      <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
                    </div>
                  </div>

                  {/* Blind Day End Mode Toggle */}
                  <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 flex items-center justify-between">
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-foreground">
                          Blind Day End Mode
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Hides expected cash & variance to enforce honest count
                      </p>
                    </div>
                    <Switch
                      checked={isBlindCount}
                      onCheckedChange={setIsBlindCount}
                      aria-label="Toggle Blind Day End Mode"
                    />
                  </div>
                </div>

                {/* Blind Mode Alert Banner */}
                {isBlindCount ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">
                        Blind Count Active (Fraud Prevention Protocol)
                      </span>
                      <span className="text-muted-foreground">
                        Expected till cash is hidden. Enter physical notes/coins count below. Variance is computed upon final submission.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Opening Float
                      </span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {formatCurrency(Number(openingFloat) || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Expected Till Cash
                      </span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {formatCurrency(expectedCash)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Live Variance
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          variance === 0
                            ? "text-emerald-500"
                            : variance > 0
                              ? "text-amber-500"
                              : "text-red-500",
                        )}
                      >
                        {variance === 0 ? "Balanced" : formatCurrency(variance)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Denomination Counter Suite */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                        Physical Cash Denominations
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetCalculator}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear Counts
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowDenomCalculator(!showDenomCalculator)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {showDenomCalculator ? "Switch to Total Entry" : "Use Denominations"}
                      </button>
                    </div>
                  </div>

                  {showDenomCalculator ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {DENOMINATIONS.map((denom) => {
                        const count = denomCounts[denom] || "";
                        const sub = (parseInt(count, 10) || 0) * denom;
                        return (
                          <div
                            key={denom}
                            className="flex items-center justify-between rounded-xl border bg-card p-2.5 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono text-foreground w-12">
                                ₹{denom}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">×</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                value={count}
                                onChange={(e) => handleDenomChange(denom, e.target.value)}
                                placeholder="0"
                                className="h-8 w-16 text-center font-mono text-xs tabular-nums"
                              />
                              <span className="text-[11px] font-mono text-muted-foreground w-14 text-right tabular-nums">
                                {sub > 0 ? `₹${sub}` : "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl border bg-card">
                      <Label htmlFor="directCounted" className="text-xs font-semibold">
                        Total Physical Cash Counted in Till
                      </Label>
                      <Input
                        id="directCounted"
                        type="number"
                        min="0"
                        step="0.01"
                        value={directCounted}
                        onChange={(e) => setDirectCounted(e.target.value)}
                        placeholder="e.g. 12500"
                        className="h-11 font-mono text-base tabular-nums"
                      />
                    </div>
                  )}
                </div>

                {/* Total Counted Banner */}
                <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">
                      Total Physical Cash Counted
                    </span>
                    <span className="text-2xl font-bold font-mono tabular-nums text-foreground">
                      {formatCurrency(totalCounted)}
                    </span>
                  </div>

                  {!isBlindCount && (
                    <Badge
                      variant={variance === 0 ? "secondary" : "outline"}
                      className={cn(
                        "font-mono text-xs px-3 py-1",
                        variance === 0
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : variance > 0
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            : "bg-red-500/10 text-red-500 border-red-500/30",
                      )}
                    >
                      {variance === 0
                        ? "Balanced (₹0)"
                        : variance > 0
                          ? `Over by +${formatCurrency(variance)}`
                          : `Short by -${formatCurrency(Math.abs(variance))}`}
                    </Badge>
                  )}
                </div>

                {/* Manager Note */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="closeNote" className="text-xs font-semibold">
                    Shift / Day End Notes (Optional)
                  </Label>
                  <Input
                    id="closeNote"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Cash drawer verified, change delivered to bank safe"
                    maxLength={300}
                    className="text-xs"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCloseRegister}
                    disabled={generateZReport.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
                  >
                    {generateZReport.isPending ? "Closing Register..." : "Finalize Day End & Generate Z-Report"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: X-REPORT INTERIM READ */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "x-report" && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    X-Report: Interim Register Read
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Non-resetting audit read. View current gross sales, tender totals, and till cash without closing.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchX()}
                className="h-8 text-xs font-semibold"
              >
                Refresh Read
              </Button>
            </div>

            {xLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Reading live till metrics...
              </div>
            ) : xReport ? (
              <div className="space-y-4">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border bg-card">
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Gross Sales
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatCurrency(xReport.sales.grossSales)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border bg-card">
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Net Revenue
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {formatCurrency(xReport.sales.totalRevenue)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border bg-card">
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Covers (Guests)
                    </span>
                    <span className="text-base font-bold tabular-nums text-foreground">
                      {xReport.covers.totalCovers} ({formatCurrency(xReport.covers.revenuePerCover)}/cover)
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border bg-card">
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Expected in Till
                    </span>
                    <span className="text-base font-bold tabular-nums text-emerald-500">
                      {formatCurrency(xReport.cashDrawer.expectedCash)}
                    </span>
                  </div>
                </div>

                {/* Printable Terminal Slip View */}
                <div className="rounded-xl border bg-zinc-950 p-4 text-zinc-100 font-mono text-xs leading-relaxed overflow-x-auto shadow-inner">
                  <pre className="whitespace-pre">{xReport.printableSlip}</pre>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopySlip(xReport.printableSlip)}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy Slip
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handlePrintSlip(xReport.printableSlip)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    <Printer className="mr-2 h-3.5 w-3.5" /> Print X-Report Slip
                  </Button>
                </div>
              </div>
            ) : (
              <p className="p-6 text-center text-xs text-muted-foreground">
                No open register session data found.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
