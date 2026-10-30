// Raw ESC/POS over TCP (JetDirect / "port 9100") for network thermal printers.
// The backend connects out to the printer, so the printer's address must be
// reachable from wherever the backend runs; there is no discovery.
import * as net from 'net';
import { PrinterNotFoundError } from './escpos-usb';

const CONNECT_TIMEOUT_MS = 4000;
const WRITE_TIMEOUT_MS = 8000;

export interface NetworkPrinterTarget {
  host: string;
  port: number;
}

function describe(target: NetworkPrinterTarget): string {
  return `${target.host}:${target.port}`;
}

/**
 * Direct raw TCP socket printing for network thermal printers (port 9100).
 * Connects to printer at host:port, sends the data buffer, waits for completion,
 * and handles timeout, socket error, write, and clean socket destruction.
 */
export function printOverTcp(
  host: string,
  port: number,
  data: Buffer,
  timeoutMs?: number,
): Promise<{ success: boolean; error?: string }>;
export function printOverTcp(
  host: string,
  data: Buffer,
  timeoutMs?: number,
): Promise<{ success: boolean; error?: string }>;
export function printOverTcp(
  host: string,
  portOrData: number | Buffer = 9100,
  dataOrTimeout?: Buffer | number,
  timeoutMs: number = 5000,
): Promise<{ success: boolean; error?: string }> {
  let port = 9100;
  let data: Buffer;
  let timeout = timeoutMs;

  if (Buffer.isBuffer(portOrData)) {
    data = portOrData;
    if (typeof dataOrTimeout === 'number') {
      timeout = dataOrTimeout;
    }
  } else {
    port = portOrData;
    data = dataOrTimeout as Buffer;
    timeout = timeoutMs;
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = (success: boolean, error?: string) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      try {
        socket.destroy();
      } catch {
        // ignore errors on destroy
      }
      resolve(success ? { success: true } : { success: false, error });
    };

    socket.setTimeout(timeout, () => {
      cleanup(false, `Timed out printing to ${host}:${port} after ${timeout}ms`);
    });

    socket.once('error', (err: NodeJS.ErrnoException) => {
      const why =
        err.code === 'ECONNREFUSED'
          ? `Connection refused at ${host}:${port} (is raw/9100 printing enabled?)`
          : err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH'
            ? `Host unreachable: ${host}:${port}`
            : err.code === 'ENOTFOUND'
              ? `Host name not found: ${host}`
              : err.code === 'ETIMEDOUT'
                ? `Connection timed out: ${host}:${port}`
                : err.message || 'Socket error';
      cleanup(false, why);
    });

    socket.connect(port, host, () => {
      socket.end(data, () => {
        // Data has been sent and flushed to the network stream
      });
      socket.once('close', () => {
        cleanup(true);
      });
    });
  });
}

export function sendViaNetwork(
  target: NetworkPrinterTarget,
  buffer: Buffer,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS, () =>
      done(
        new PrinterNotFoundError(
          `Printer at ${describe(target)} did not answer - check it is on, on the same network as the server, and the address is right`,
        ),
      ),
    );
    socket.once('error', (err: NodeJS.ErrnoException) => {
      const why =
        err.code === 'ECONNREFUSED'
          ? 'connection refused (is raw/9100 printing enabled on the printer?)'
          : err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH'
            ? 'host unreachable from the server'
            : err.code === 'ENOTFOUND'
              ? 'host name not found'
              : err.message;
      done(
        new PrinterNotFoundError(
          `Could not reach the printer at ${describe(target)}: ${why}`,
        ),
      );
    });
    socket.connect(target.port, target.host, () => {
      socket.setTimeout(WRITE_TIMEOUT_MS, () =>
        done(
          new Error(
            `Timed out sending to ${describe(target)} - printer not responding`,
          ),
        ),
      );
      // end() flushes then half-closes; wait for the close so the bytes have
      // left our side before we report success.
      socket.end(buffer, () => undefined);
      socket.once('close', () => done());
    });
  });
}

/** Opens and closes a connection without sending anything. */
export async function probeNetworkPrinter(
  target: NetworkPrinterTarget,
): Promise<{ reachable: boolean; error: string | null }> {
  try {
    await sendViaNetwork(target, Buffer.alloc(0));
    return { reachable: true, error: null };
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : 'Unreachable',
    };
  }
}
