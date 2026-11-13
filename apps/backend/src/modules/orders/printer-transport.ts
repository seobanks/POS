// Picks the transport for a branch's thermal printer: USB attached to the
// machine running the backend, network printer over raw TCP, or Windows spooler.
import { sendViaNetwork } from './escpos-network';
import { PrinterNotFoundError, sendRaw } from './escpos-usb';
import { printToWindowsSpooler } from './escpos-windows';

export interface BranchPrinterTarget {
  printerConnection?: string;
  printerHost?: string | null;
  printerPort: number;
  printerTransport?: string;
  printerIp?: string | null;
  printerName?: string | null;
}

export async function sendToBranchPrinter(
  branch: BranchPrinterTarget,
  buffer: Buffer,
): Promise<void> {
  const connection = branch.printerTransport || branch.printerConnection || 'USB';
  const host = branch.printerIp || branch.printerHost;
  const port = branch.printerPort || 9100;

  if (connection === 'NETWORK') {
    if (!host) {
      throw new PrinterNotFoundError(
        'Network printing is selected but no printer address is set - add it in Settings > Printer',
      );
    }
    return sendViaNetwork(
      { host, port },
      buffer,
    );
  }
  if (
    connection === 'WINDOWS' ||
    connection === 'SPOOLER'
  ) {
    const res = await printToWindowsSpooler(branch.printerName || host, buffer);
    if (!res.success) {
      throw new PrinterNotFoundError(
        res.error || 'Failed to print via Windows Print Spooler',
      );
    }
    return;
  }
  return sendRaw(buffer);
}
