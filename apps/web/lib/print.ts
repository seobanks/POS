// Universal 1-Time Setup: Direct browser-based thermal printing for all tenants.
// When Chrome runs in kiosk mode (--kiosk-printing), this prints 100% silently
// with ONE CLICK directly to the default printer without opening any dialogs.
let printFrame: HTMLIFrameElement | null = null;

function getPrintFrame(): HTMLIFrameElement {
  if (printFrame && document.body.contains(printFrame)) return printFrame;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0.01";
  frame.style.pointerEvents = "none";
  frame.style.border = "none";
  document.body.appendChild(frame);
  printFrame = frame;
  return frame;
}

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
 * Universal 1-Click Thermal Print for all tenants.
 * Loads the backend self-printing thermal HTML into a hidden iframe.
 * Prints directly to the default thermal printer with ZERO configuration per tenant.
 */
export function openReceiptPrint(orderId: string, branchId: string, adj: BillQuery = {}) {
  if (typeof window === "undefined" || !orderId) return;
  const frame = getPrintFrame();
  const printAction = () => {
    const win = frame.contentWindow;
    if (!win) return;
    try {
      win.focus();
      win.print();
    } catch {
      try {
        win.postMessage("print", "*");
      } catch {}
    }
  };
  frame.onload = () => {
    setTimeout(printAction, 150);
  };
  frame.src = `/api/orders/${orderId}/receipt?branchId=${branchId}${billQueryString(adj)}&t=${Date.now()}`;
}

export function openKotPrint(orderId: string, branchId: string) {
  if (typeof window === "undefined" || !orderId) return;
  const frame = getPrintFrame();
  const printAction = () => {
    const win = frame.contentWindow;
    if (!win) return;
    try {
      win.focus();
      win.print();
    } catch {
      try {
        win.postMessage("print", "*");
      } catch {}
    }
  };
  frame.onload = () => {
    setTimeout(printAction, 150);
  };
  frame.src = `/api/orders/${orderId}/kot?branchId=${branchId}&t=${Date.now()}`;
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
