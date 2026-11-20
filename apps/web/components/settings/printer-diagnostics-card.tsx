"use client";

import { CheckCircle2, Laptop, Network, Printer, RefreshCw, Usb, XCircle } from "lucide-react";
import { useState } from "react";
import { StatusNote, useNoteToast } from "@/components/ui/status-note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranch } from "@/hooks/use-branch";
import { useOpenCashDrawer, usePrintTestSlip, usePrinterDiagnostics } from "@/hooks/use-print";
import { useSettings, useUpdateBranchSettings } from "@/hooks/use-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";

function printBrowserTestReceipt(paperWidthMm: number = 80) {
  if (typeof window === "undefined" || typeof window.print !== "function") return;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;top:-10000px;left:-10000px;width:302px;height:600px;border:0;";
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
      <div class="c" style="font-size: 11px;">Thermal Printer: TVS RP3160 GOLD (USB)</div>
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

export function PrinterDiagnosticsCard() {
  const { branchId } = useBranch();
  const { data, isLoading, isFetching, refetch } = usePrinterDiagnostics(branchId);
  const { data: settings } = useSettings(branchId);
  const updateBranch = useUpdateBranchSettings(branchId);
  const testPrint = usePrintTestSlip(branchId);
  const testKot = usePrintTestSlip(branchId, "kot");
  const { note, clear: clearNote, toast } = useNoteToast();
  const [host, setHost] = useState<string | null>(null);
  const [port, setPort] = useState<string | null>(null);
  const branch = settings?.branch;
  const [columns, setColumns] = useState<string | null>(null);
  const [pairingUsb, setPairingUsb] = useState(false);

  const save = (dto: Parameters<typeof updateBranch.mutate>[0]) =>
    updateBranch.mutate(dto, {
      onSuccess: () => toast.success("Printer settings saved"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save printer settings"),
    });
  const openDrawer = useOpenCashDrawer();

  const handlePairWebUsb = async () => {
    if (typeof navigator === "undefined" || !("usb" in navigator)) {
      toast.error("WebUSB is not supported in this browser. Use Chrome or Edge.");
      return;
    }
    setPairingUsb(true);
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      toast.success(`Paired USB printer: ${device.productName || "Thermal Receipt Printer"}`);
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        toast.error(err.message || "Could not pair USB printer");
      }
    } finally {
      setPairingUsb(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Thermal printer (receipts &amp; kitchen tickets)</h2>
          <p className="text-sm text-muted-foreground">
            Configure how cashier bills and kitchen KOT tickets are routed to thermal printers.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      <StatusNote note={note} onClear={clearNote} />

      {isLoading || !data ? (
        <Skeleton className="h-16 rounded-lg" />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            {branch?.printerConnection === "USB" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-foreground font-medium">
                  Cashier USB Counter Printer Active
                </span>
              </>
            ) : data.canPrint ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-foreground">
                  {data.connection === "NETWORK" && data.network
                    ? `Printer reachable at ${data.network.host}:${data.network.port}`
                    : "Printer detected"}
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-foreground">
                  {data.connection === "NETWORK" ? "Network printer not reachable" : "No server-attached printer detected"}
                </span>
              </>
            )}
          </div>
          {branch?.printerConnection === "USB" && (
            <p className="text-xs text-muted-foreground">
              Counter bills route directly through your local cashier terminal to your USB thermal printer (e.g. TVS RP3160 Gold). No server IP address required.
            </p>
          )}
          {data.lpDevices.length > 0 && (
            <p className="text-xs text-muted-foreground">Kernel device(s): {data.lpDevices.join(", ")}</p>
          )}
          {data.libusbPrinter && (
            <p className="text-xs text-muted-foreground">USB device: {data.libusbPrinter.id}</p>
          )}
          {branch?.printerConnection === "NETWORK" && data.notes.map((note) => (
            <p key={note} className="text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
      )}

      {branch && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Connection Mode</Label>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                Multi-Tenant Standard
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Printer connection">
              {(["NETWORK", "USB"] as const).map((c) => (
                <Button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={branch.printerConnection === c}
                  variant={branch.printerConnection === c ? "default" : "outline"}
                  size="sm"
                  disabled={updateBranch.isPending}
                  onClick={() => save({ printerConnection: c })}
                  className="gap-2"
                >
                  {c === "NETWORK" ? (
                    <>
                      <Network className="h-4 w-4 text-primary" />
                      <span>Network (IP Address / LAN)</span>
                    </>
                  ) : (
                    <>
                      <Usb className="h-4 w-4 text-primary" />
                      <span>USB (Direct Local Till)</span>
                    </>
                  )}
                </Button>
              ))}
            </div>

            {branch.printerConnection === "NETWORK" ? (
              <div className="mt-1 rounded-md bg-secondary/50 p-3 text-xs text-muted-foreground flex flex-col gap-1 border border-border/60">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-primary" />
                  1-Click Direct Thermal Printing (Port 9100):
                </p>
                <p>
                  Enter the local network IP address of your thermal printer (same IP used by your existing POS). When billing, bills will print instantly with <strong>one click</strong> without opening browser print dialogs!
                </p>
              </div>
            ) : (
              <div className="mt-1 rounded-md bg-secondary/50 p-3 text-xs text-muted-foreground flex flex-col gap-1.5 border border-border/60">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5 text-primary" />
                  USB Direct Till Setup:
                </p>
                <p>
                  For till computers with a direct USB thermal printer (e.g. TVS RP3160 Gold).
                </p>
              </div>
            )}
          </div>

          {/* Network IP Address and Port Inputs */}
          {branch.printerConnection === "NETWORK" && (
            <>
              <div className="grid grid-cols-[1fr_6rem] gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="printer-host">Printer IP Address</Label>
                  <Input
                    id="printer-host"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="e.g. 192.168.1.100 or 192.168.0.87"
                    value={host ?? branch.printerHost ?? ""}
                    onChange={(e) => setHost(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="printer-port">Port</Label>
                  <Input
                    id="printer-port"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={65535}
                    value={port ?? String(branch.printerPort || 9100)}
                    onChange={(e) => setPort(e.target.value)}
                  />
                </div>
              </div>
              {(host !== null || port !== null) && (
                <Button
                  type="button"
                  size="sm"
                  disabled={updateBranch.isPending}
                  onClick={() => {
                    const dto: Parameters<typeof updateBranch.mutate>[0] = {};
                    if (host !== null) dto.printerHost = host.trim() || null;
                    if (port !== null) dto.printerPort = Number(port);
                    updateBranch.mutate(dto, {
                      onSuccess: () => {
                        toast.success("Printer IP address saved!");
                        setHost(null);
                        setPort(null);
                        refetch();
                      },
                      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save the address"),
                    });
                  }}
                >
                  Save Printer Address
                </Button>
              )}
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Paper width</Label>
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
                >
                  {mm} mm {mm === 80 ? "(TVS RP3160 Gold standard)" : ""}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="printer-codepage">Character set</Label>
              <select
                id="printer-codepage"
                className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
                value={branch.printerCodepage}
                disabled={updateBranch.isPending}
                onChange={(e) => save({ printerCodepage: e.target.value as typeof branch.printerCodepage })}
              >
                <option value="CP858">CP858 — Spanish/Western + € (recommended)</option>
                <option value="CP850">CP850 — Western Europe</option>
                <option value="CP437">CP437 — US / legacy</option>
                <option value="CP1252">WPC1252 — Windows Latin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="printer-columns">Columns (blank = {branch.printerPaperWidthMm === 58 ? 32 : 48})</Label>
              <Input
                id="printer-columns"
                type="number"
                min={20}
                max={64}
                inputMode="numeric"
                value={columns ?? (branch.printerColumns ?? "")}
                onChange={(e) => setColumns(e.target.value)}
                onBlur={() => {
                  if (columns === null) return;
                  const n = columns === "" ? null : Number(columns);
                  if (n !== null && (!Number.isInteger(n) || n < 20 || n > 64)) {
                    toast.error("Columns must be between 20 and 64");
                  } else if (n !== branch.printerColumns) {
                    save({ printerColumns: n });
                  }
                  setColumns(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action / Test Print Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="default"
          size="sm"
          className="gap-2 font-semibold"
          disabled={testPrint.isPending}
          onClick={() =>
            testPrint.mutate(undefined, {
              onSuccess: () => toast.success("Test slip sent to printer! Paper should cut."),
              onError: (err) =>
                toast.error(err instanceof ApiError ? err.message : "Could not print test slip"),
            })
          }
        >
          <Printer className="h-4 w-4" />
          {testPrint.isPending ? "Printing…" : "Send Test Print (1-Click)"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={testKot.isPending}
          onClick={() =>
            testKot.mutate(undefined, {
              onSuccess: () => toast.success("Sample kitchen ticket sent"),
              onError: (err) =>
                toast.error(err instanceof ApiError ? err.message : "Could not print the sample kitchen ticket"),
            })
          }
        >
          Test kitchen ticket
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={openDrawer.isPending}
          onClick={() =>
            openDrawer.mutate(branchId, {
              onSuccess: () => toast.success("Cash drawer pulse sent"),
              onError: (err) =>
                toast.error(err instanceof ApiError ? err.message : "Could not open the cash drawer"),
            })
          }
        >
          Open cash drawer
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            printBrowserTestReceipt(branch?.printerPaperWidthMm ?? 80);
            toast.success("Printing 80mm test receipt via Windows spooler...");
          }}
        >
          Windows Print Fallback
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Cashier bills printed at the till automatically trigger the auto-cutter and cash drawer (RJ11).
      </p>
    </Card>
  );
}
