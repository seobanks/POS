"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  billQueryString,
  decodeEscposBase64,
  sendRawToWebUsbDevice,
  type BillQuery,
} from "@/lib/print";
import { getSharedSocket, releaseSharedSocket } from "@/lib/realtime-socket";

export interface PrinterDiagnostics {
  connection: "USB" | "NETWORK";
  network: { host: string; port: number; reachable: boolean; error: string | null } | null;
  lpDevices: string[];
  libusbPrinter: { vendorId: number; productId: number; id: string } | null;
  canPrint: boolean;
  notes: string[];
}

export function usePrinterDiagnostics(branchId?: string | null) {
  return useQuery({
    queryKey: ["print", "diagnostics", branchId ?? null],
    queryFn: () => api.get<PrinterDiagnostics>(`/orders/print/diagnostics${branchId ? `?branchId=${branchId}` : ""}`),
    refetchOnWindowFocus: false,
  });
}

export interface PrintJobResult {
  ok: true;
  /** Characters the printer's code page cannot print (shown as "?" on paper). */
  unsupportedChars?: string[];
}

/** kind "kot" prints a sample kitchen ticket instead of the receipt test slip. */
export function usePrintTestSlip(branchId?: string | null, kind?: "kot") {
  return useMutation({
    mutationFn: () =>
      api.post<{ ok: true }>(
        `/orders/print/test?${[branchId ? `branchId=${branchId}` : "", kind ? `kind=${kind}` : ""].filter(Boolean).join("&")}`,
      ),
  });
}

/**
 * `drawer` also kicks the cash drawer — pass true when the bill was paid in
 * cash. `adjustments` prices a not-yet-paid bill the way the screen shows it;
 * a bill printed before payment never opens the drawer.
 */
export function usePrintOrderUsb(branchId: string | null) {
  return useMutation({
    mutationFn: ({ orderId, drawer, adjustments }: { orderId: string; drawer?: boolean; adjustments?: BillQuery }) =>
      api.post<PrintJobResult>(
        `/orders/${orderId}/print/usb?branchId=${branchId}${drawer ? "&drawer=true" : ""}${billQueryString(adjustments)}`,
      ),
  });
}

export interface KotPrintResult extends PrintJobResult {
  printed: { id: string; ticketNumber: string; reprint: number }[];
}

/**
 * Kitchen tickets to the thermal printer (native text, no prices). Without
 * `reprint` only tickets not yet printed go out and a repeat answers
 * ALREADY_PRINTED; `reprint: true` prints another copy stamped REPRINT.
 */
export function usePrintKot(branchId: string | null) {
  return useMutation({
    mutationFn: ({ orderId, reprint }: { orderId: string; reprint?: boolean }) =>
      api.post<KotPrintResult>(`/orders/${orderId}/print/kot?branchId=${branchId}${reprint ? "&reprint=true" : ""}`),
  });
}

export function useOpenCashDrawer() {
  return useMutation({
    mutationFn: (branchId?: string | null) =>
      api.post<{ ok: true }>(`/orders/print/drawer${branchId ? `?branchId=${branchId}` : ""}`),
  });
}

export interface PrintJobEvent {
  id: string;
  branchId: string;
  stationId?: string | null;
  stationName?: string;
  targetPrinter?: string;
  jobType: "KOT" | "RECEIPT";
  ticketNumber?: string;
  rawEscposBase64: string;
  createdAt: string;
}

export interface UsePrintBridgeOptions {
  enabled?: boolean;
  filterPrinter?: string | string[];
  filterJobType?: "KOT" | "RECEIPT";
  onJob?: (job: PrintJobEvent, rawBytes: Uint8Array) => Promise<boolean | void> | boolean | void;
}

export { decodeEscposBase64, sendRawToWebUsbDevice };

/**
 * Web Print Bridge hook: enables client terminals (e.g., cashier POS or kitchen tablets)
 * to listen for realtime `print.job` spool events and forward jobs to local WebUSB or raw printers.
 */
export function useWebPrintBridge(
  branchId: string | null,
  options: UsePrintBridgeOptions = {},
) {
  const { enabled = true, filterPrinter, filterJobType, onJob } = options;
  const [lastJob, setLastJob] = useState<PrintJobEvent | null>(null);
  const [usbDevice, setUsbDevice] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof navigator !== "undefined" && "usb" in navigator);
  }, []);

  const requestUsbPrinter = useCallback(async () => {
    if (typeof navigator === "undefined" || !("usb" in (navigator as any))) {
      throw new Error("WebUSB is not supported in this browser");
    }
    const usb = (navigator as any).usb;
    const device = await usb.requestDevice({ filters: [] });
    setUsbDevice(device);
    return device;
  }, []);

  useEffect(() => {
    if (!branchId || !enabled) return;

    const socket = getSharedSocket(branchId);
    if (!socket) return;

    const handlePrintJob = async (job: PrintJobEvent) => {
      if (filterJobType && job.jobType !== filterJobType) return;
      if (filterPrinter) {
        const allowed = Array.isArray(filterPrinter) ? filterPrinter : [filterPrinter];
        if (job.targetPrinter && !allowed.includes(job.targetPrinter)) return;
      }

      setLastJob(job);
      const rawBytes = decodeEscposBase64(job.rawEscposBase64);

      if (onJob) {
        const handled = await onJob(job, rawBytes);
        if (handled === true) return;
      }

      if (usbDevice) {
        await sendRawToWebUsbDevice(usbDevice, rawBytes);
      }
    };

    socket.on("print.job", handlePrintJob);

    return () => {
      socket.off("print.job", handlePrintJob);
      releaseSharedSocket(socket);
    };
  }, [branchId, enabled, filterPrinter, filterJobType, onJob, usbDevice]);

  return {
    lastJob,
    usbDevice,
    isSupported,
    requestUsbPrinter,
  };
}

export const usePrintBridge = useWebPrintBridge;
export const usePrintSpooler = useWebPrintBridge;
