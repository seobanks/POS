// All bill, receipt, and KOT printing in the POS routes directly to the
// ESC/POS thermal printer via the backend thermal printer service (USB / Network / Bluetooth).
// Web/browser iframe printing is disabled so that cashier flows are never interrupted
// by platform print dialogs.

/** Bill figures the cashier has typed but not yet saved (see receipt route). */
export type BillQuery = Record<string, string | number | undefined>;

export function billQueryString(adj: BillQuery = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(adj)) {
    if (v !== undefined && v !== "" && v !== 0) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `&${s}` : "";
}

/**
 * Web/browser print is disabled: all bill, receipt, and KOT printing uses
 * direct thermal ESC/POS printing. Kept as a safe no-op for backward compatibility.
 */
export function openReceiptPrint(_orderId: string, _branchId: string, _adj: BillQuery = {}) {
  // Web print is disabled — all printing routes directly to the thermal printer
}

export function openKotPrint(_orderId: string, _branchId: string) {
  // Web print is disabled — all printing routes directly to the thermal printer
}

/**
 * Decodes base64 ESC/POS payload to Uint8Array for raw WebUSB/network printing.
 */
export function decodeEscposBase64(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Helper to print raw ESC/POS bytes directly to a connected WebUSB device.
 */
export async function sendRawToWebUsbDevice(device: any, data: Uint8Array): Promise<boolean> {
  if (!device) return false;
  try {
    if (!device.opened) {
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);
    }
    const iface = device.configuration?.interfaces?.[0];
    const alt = iface?.alternates?.[0];
    const outEndpoint = alt?.endpoints?.find((ep: any) => ep.direction === "out");
    const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;
    await device.transferOut(endpointNumber, data);
    return true;
  } catch (err) {
    console.warn("WebUSB print failed:", err);
    return false;
  }
}
