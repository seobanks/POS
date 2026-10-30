// Picks the transport for a branch's thermal printer: USB attached to the
// machine running the backend, network printer over raw TCP, or Windows spooler.
import { sendViaNetwork } from './escpos-network';
import { PrinterNotFoundError, sendRaw } from './escpos-usb';
import { printToWindowsSpooler } from './escpos-windows';

export interface BranchPrinterTarget {
  printerConnection: string;
  printerHost: string | null;
  printerPort: number;
}

export async function sendToBranchPrinter(
  branch: BranchPrinterTarget,
  buffer: Buffer,
): Promise<void> {
  if (branch.printerConnection === 'NETWORK') {
    if (!branch.printerHost) {
      throw new PrinterNotFoundError(
        'Network printing is selected but no printer address is set - add it in Settings > Printer',
      );
    }
    return sendViaNetwork(
      { host: branch.printerHost, port: branch.printerPort },
      buffer,
    );
  }
  if (
    branch.printerConnection === 'WINDOWS' ||
    branch.printerConnection === 'SPOOLER'
  ) {
    const res = await printToWindowsSpooler(branch.printerHost, buffer);
    if (!res.success) {
      throw new PrinterNotFoundError(
        res.error || 'Failed to print via Windows Print Spooler',
      );
    }
    return;
  }
  return sendRaw(buffer);
}
