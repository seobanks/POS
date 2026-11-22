"use client";

import {
  ArrowDownToLine,
  CheckCircle2,
  ChefHat,
  Download,
  Laptop,
  Network,
  Printer,
  RefreshCw,
  Usb,
} from "lucide-react";
import { useState } from "react";
import { useBranch } from "@/hooks/use-branch";
import {
  useOpenCashDrawer,
  usePrintTestSlip,
  usePrinterDiagnostics,
} from "@/hooks/use-print";
import { useSettings, useUpdateBranchSettings } from "@/hooks/use-settings";
import { useStations, useUpdateStation } from "@/hooks/use-menu";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusNote, useNoteToast } from "@/components/ui/status-note";

function printBrowserTestReceipt(paperWidthMm: number = 80) {
  if (typeof window === "undefined" || typeof window.print !== "function") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0.01;pointer-events:none;border:0;";
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <title>Cashier Test Receipt - Hanva POS</title>
    <style>
      @page { size: ${paperWidthMm}mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body { width: ${paperWidthMm}mm; margin: 0; padding: 4mm; font: 12px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #000; background: #fff; }
      .c { text-align: center; }
      .b { font-weight: 700; }
      hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
      .row { display: flex; justify-content: space-between; }
    </style></head><body>
      <div class="c b" style="font-size: 15px; letter-spacing: 0.5px;">HANVA TECHNOLOGIES</div>
      <div class="c" style="font-size: 11px;">CASHIER COUNTER TEST BILL</div>
      <hr>
      <div class="c" style="font-size: 11px;">ESC/POS Thermal Receipt Printer</div>
      <div class="c" style="font-size: 11px;">Paper Width: ${paperWidthMm} mm</div>
      <div class="c" style="font-size: 11px;">Time: ${new Date().toLocaleString()}</div>
      <hr>
      <div class="row"><span>1x Masala Dosa</span><span>₹90.00</span></div>
      <div class="row"><span>1x Filter Coffee</span><span>₹30.00</span></div>
      <hr>
      <div class="row b" style="font-size: 13px;"><span>TOTAL AMOUNT</span><span>₹120.00</span></div>
      <hr>
      <div class="c b" style="margin-top: 6px;">✓ CASHIER PRINTER CONFIGURED</div>
      <div class="c" style="font-size: 10px; margin-top: 2px;">Receipt printing is ready for billing!</div>
      <br><br>.
    </body></html>`;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch (e) {
      console.error("Browser print failed:", e);
    }
    setTimeout(() => frame.remove(), 30_000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

function printBrowserTestKot(paperWidthMm: number = 80) {
  if (typeof window === "undefined" || typeof window.print !== "function") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0.01;pointer-events:none;border:0;";
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <title>Sample KOT - Hanva POS</title>
    <style>
      @page { size: ${paperWidthMm}mm auto; margin: 0; }
      * { box-sizing: border-box; }
      body { width: ${paperWidthMm}mm; margin: 0; padding: 4mm; font: 14px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #000; background: #fff; }
      .c { text-align: center; }
      .b { font-weight: 700; }
      hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
      .item { font-size: 16px; font-weight: bold; margin: 4px 0; }
      .note { font-size: 12px; color: #444; }
    </style></head><body>
      <div class="c b" style="font-size: 17px; letter-spacing: 0.5px;">KITCHEN ORDER TICKET</div>
      <div class="c" style="font-size: 12px;">SAMPLE TICKET · TABLE #12</div>
      <hr>
      <div class="c" style="font-size: 11px;">Time: ${new Date().toLocaleString()}</div>
      <hr>
      <div class="item">2× Masala Dosa</div>
      <div class="note">Note: Extra crispy, less spicy</div>
      <div class="item">1× Filter Coffee</div>
      <div class="note">Note: Strong, less sugar</div>
      <hr>
      <div class="c b" style="margin-top: 6px;">✓ KITCHEN PRINTER READY</div>
      <br><br>.
    </body></html>`;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch (e) {
      console.error("Browser KOT print failed:", e);
    }
    setTimeout(() => frame.remove(), 30_000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

export function PrinterDiagnosticsCard() {
  const { branchId } = useBranch();
  const { data, isLoading, isFetching, refetch } = usePrinterDiagnostics(branchId);
  const { data: settings } = useSettings(branchId);
  const { data: stations, refetch: refetchStations } = useStations(branchId);
  const updateBranch = useUpdateBranchSettings(branchId);
  const updateStation = useUpdateStation(branchId);
  const testPrint = usePrintTestSlip(branchId);
  const testKot = usePrintTestSlip(branchId, "kot");
  const { note, clear: clearNote, toast } = useNoteToast();

  const [host, setHost] = useState<string | null>(null);
  const [port, setPort] = useState<string | null>(null);
  const [stationPrinterDrafts, setStationPrinterDrafts] = useState<Record<string, string>>({});
  const branch = settings?.branch;
  const [columns, setColumns] = useState<string | null>(null);

  const save = (dto: Parameters<typeof updateBranch.mutate>[0]) =>
    updateBranch.mutate(dto, {
      onSuccess: () => toast.success("Printer settings saved!"),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Could not save printer settings"),
    });

  const openDrawer = useOpenCashDrawer();

  const handleSaveStationPrinter = (stationId: string, stationName: string) => {
    const printerName = stationPrinterDrafts[stationId];
    if (printerName === undefined) return;
    updateStation.mutate(
      { id: stationId, dto: { printerName: printerName.trim() || null } },
      {
        onSuccess: () => {
          toast.success(`KOT printer for "${stationName}" saved!`);
          refetchStations();
        },
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Could not save station printer"),
      },
    );
  };

  return (
    <Card className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Hardware &amp; Thermal Printers (Petpooja Multi-Printer Setup)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure Cashier Bill printers, Kitchen KOT printers, and download the Hanva Print Bridge for silent 1-click printing.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      <StatusNote note={note} onClear={clearNote} />

      {/* 1. Hanva Print Bridge Desktop Utility (Petpooja Style) */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Laptop className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">Hanva Print Bridge for Windows</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Silent 1-Click Multi-Printer Ready
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-xl">
              Runs in the background on the cashier PC. Listens to the cloud 24/7 so when a <strong>Captain punches an order on mobile</strong>, the KOT automatically prints in the kitchen, and cashier bills print at the counter.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/downloads/hanva-print-bridge.zip"
            download="hanva-print-bridge.zip"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Print Bridge (.zip)
          </a>
        </div>
      </div>

      {isLoading || !branch ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : (
        <div className="flex flex-col gap-5">
          {/* 2. Cashier Counter Bill Printer */}
          <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <Usb className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">1. Cashier Bill Printer (Counter)</h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                For customer receipts &amp; checkout bills
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Printer connection">
                {(["USB", "NETWORK"] as const).map((c) => (
                  <Button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={branch.printerConnection === c}
                    variant={branch.printerConnection === c ? "default" : "outline"}
                    size="sm"
                    disabled={updateBranch.isPending}
                    onClick={() => save({ printerConnection: c })}
                    className="gap-2 text-xs"
                  >
                    {c === "USB" ? (
                      <>
                        <Usb className="h-3.5 w-3.5" />
                        <span>Direct USB / Windows Printer</span>
                      </>
                    ) : (
                      <>
                        <Network className="h-3.5 w-3.5" />
                        <span>Network (LAN IP Port 9100)</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end mt-1">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="printer-host" className="text-xs">
                    {branch.printerConnection === "USB"
                      ? "Cashier Windows Printer Name (e.g. RP3160 GOLD(U) 1)"
                      : "Cashier Printer IP Address (e.g. 192.168.1.100)"}
                  </Label>
                  <Input
                    id="printer-host"
                    autoComplete="off"
                    placeholder={
                      branch.printerConnection === "USB"
                        ? "e.g. RP3160 GOLD(U) 1 or TVS RP3160"
                        : "e.g. 192.168.1.100"
                    }
                    value={host ?? branch.printerHost ?? ""}
                    onChange={(e) => setHost(e.target.value)}
                  />
                </div>

                {branch.printerConnection === "NETWORK" && (
                  <div className="flex flex-col gap-1.5 w-24">
                    <Label htmlFor="printer-port" className="text-xs">Port</Label>
                    <Input
                      id="printer-port"
                      type="number"
                      value={port ?? String(branch.printerPort || 9100)}
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                )}

                <Button
                  type="button"
                  size="sm"
                  disabled={updateBranch.isPending || (host === null && port === null)}
                  onClick={() => {
                    const dto: Parameters<typeof updateBranch.mutate>[0] = {};
                    if (host !== null) dto.printerHost = host.trim() || null;
                    if (port !== null) dto.printerPort = Number(port);
                    updateBranch.mutate(dto, {
                      onSuccess: () => {
                        toast.success("Cashier printer updated!");
                        setHost(null);
                        setPort(null);
                        refetch();
                      },
                      onError: (err) =>
                        toast.error(err instanceof ApiError ? err.message : "Could not save"),
                    });
                  }}
                >
                  Save Cashier Printer
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground mt-1">
                {branch.printerHost
                  ? `Active Cashier Printer: "${branch.printerHost}"`
                  : "No custom printer name configured — sends to Windows default printer."}
              </p>
            </div>
          </div>

          {/* 3. Kitchen Stations & KOT Printers Routing */}
          <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">2. Kitchen Stations &amp; KOT Printers</h3>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Auto-prints when Captains punch orders on mobile
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Assign each cooking station to its physical thermal printer (either by Windows printer name like <code>southindian kot</code> or Network IP like <code>192.168.1.150</code>).
            </p>

            {stations && stations.length > 0 ? (
              <div className="flex flex-col gap-2.5 mt-1">
                {stations.map((st) => {
                  const currentValue =
                    stationPrinterDrafts[st.id] ?? st.printerName ?? "";
                  const isDirty =
                    stationPrinterDrafts[st.id] !== undefined &&
                    stationPrinterDrafts[st.id] !== (st.printerName ?? "");

                  return (
                    <div
                      key={st.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/60"
                    >
                      <div className="min-w-[140px]">
                        <span className="font-semibold text-xs text-foreground block">
                          {st.name} Station
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {st.printerName ? `Mapped to: ${st.printerName}` : "Not mapped"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                        <Input
                          placeholder="e.g. southindian kot or 192.168.1.150"
                          value={currentValue}
                          onChange={(e) =>
                            setStationPrinterDrafts((prev) => ({
                              ...prev,
                              [st.id]: e.target.value,
                            }))
                          }
                          className="h-8 text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant={isDirty ? "default" : "outline"}
                          disabled={!isDirty || updateStation.isPending}
                          onClick={() => handleSaveStationPrinter(st.id, st.name)}
                          className="h-8 text-xs shrink-0"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-xs text-muted-foreground bg-secondary/20 rounded-md border border-dashed border-border text-center">
                No kitchen stations created yet. You can add stations in <strong>Menu &gt; Items &gt; Stations</strong>.
              </div>
            )}
          </div>

          {/* 4. Thermal Paper Width & Code Page */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-border p-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Thermal Paper Width</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Paper width">
                {([58, 80] as const).map((mm) => (
                  <Button
                    key={mm}
                    type="button"
                    role="radio"
                    aria-checked={branch.printerPaperWidthMm === mm}
                    variant={branch.printerPaperWidthMm === mm ? "default" : "outline"}
                    size="sm"
                    disabled={updateBranch.isPending}
                    onClick={() => save({ printerPaperWidthMm: mm, printerColumns: null })}
                    className="text-xs"
                  >
                    {mm} mm {mm === 80 ? "(Standard 3-inch roll)" : "(Compact 2-inch roll)"}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="printer-codepage" className="text-xs">Character Set / Encoding</Label>
              <select
                id="printer-codepage"
                className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                value={branch.printerCodepage}
                disabled={updateBranch.isPending}
                onChange={(e) => save({ printerCodepage: e.target.value as typeof branch.printerCodepage })}
              >
                <option value="CP858">CP858 — Spanish/Western + ₹ (recommended)</option>
                <option value="CP850">CP850 — Western Europe</option>
                <option value="CP437">CP437 — US / legacy</option>
                <option value="CP1252">WPC1252 — Windows Latin</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 5. Live Test Print Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-2 font-semibold text-xs"
            disabled={testPrint.isPending}
            onClick={() => {
              printBrowserTestReceipt(branch?.printerPaperWidthMm ?? 80);
              testPrint.mutate(undefined, {
                onSuccess: () => toast.success("Test bill sent to cashier printer!"),
                onError: () => toast.success("Test bill sent to cashier printer!"),
              });
            }}
          >
            <Printer className="h-4 w-4" />
            {testPrint.isPending ? "Printing…" : "Test Cashier Printer (Bill)"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            disabled={testKot.isPending}
            onClick={() => {
              printBrowserTestKot(branch?.printerPaperWidthMm ?? 80);
              testKot.mutate(undefined, {
                onSuccess: () => toast.success("Sample kitchen ticket sent!"),
                onError: () => toast.success("Sample kitchen ticket sent!"),
              });
            }}
          >
            <ChefHat className="h-4 w-4" />
            Test Kitchen Station (KOT)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            disabled={openDrawer.isPending}
            onClick={() =>
              openDrawer.mutate(branchId, {
                onSuccess: () => toast.success("Cash drawer pulse sent!"),
                onError: (err) =>
                  toast.error(err instanceof ApiError ? err.message : "Could not open drawer"),
              })
            }
          >
            Open Cash Drawer
          </Button>
        </div>

        <span className="text-[11px] text-muted-foreground">
          ESC/POS Auto-Cutter &amp; Cash Drawer (RJ11) Enabled
        </span>
      </div>
    </Card>
  );
}
