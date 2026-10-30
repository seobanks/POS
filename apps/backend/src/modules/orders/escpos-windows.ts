// Windows Print Spooler direct silent printing integration for raw ESC/POS jobs.
// Bypasses the browser and OS print dialogs by sending RAW byte streams directly
// to the Windows Print Spooler API (winspool.drv) via PowerShell.
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface WindowsPrinterInfo {
  name: string;
  isDefault: boolean;
}

/**
 * Lists installed Windows printer queues via PowerShell CIM.
 * Returns empty array on non-Windows platforms.
 */
export function getWindowsPrinters(): Promise<WindowsPrinterInfo[]> {
  if (process.platform !== 'win32') {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const ps =
      'Get-CimInstance Win32_Printer | Select-Object Name, Default | ConvertTo-Json -Compress';
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', ps],
      { timeout: 5000 },
      (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve([]);
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const printers: WindowsPrinterInfo[] = list
            .filter((p: { Name?: string }) => Boolean(p.Name))
            .map((p: { Name: string; Default?: boolean }) => ({
              name: String(p.Name),
              isDefault: Boolean(p.Default),
            }));
          resolve(printers);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

/**
 * Sends raw binary data (ESC/POS bytes) silently to a Windows print queue
 * using winspool.drv API (RAW datatype, no print dialog).
 *
 * @param printerName Name of the Windows printer queue, or null/empty to use the OS default printer.
 * @param data ESC/POS binary job payload.
 */
export async function printToWindowsSpooler(
  printerName: string | null | undefined,
  data: Buffer,
): Promise<{ success: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return {
      success: false,
      error: 'Windows Print Spooler is only available on Windows platforms',
    };
  }

  // Write payload to a temporary file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(
    tmpDir,
    `escpos_spool_${Date.now()}_${Math.random().toString(36).slice(2)}.bin`,
  );

  try {
    await fs.promises.writeFile(tmpFile, data);

    const script = `
$ErrorActionPreference = 'Stop'
$targetPrinter = $args[0]
$binFile = $args[1]

if (-not $targetPrinter) {
  $default = Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1
  if (-not $default) {
    throw "No default printer found in Windows Print Spooler"
  }
  $targetPrinter = $default.Name
}

$rawType = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytes(string szPrinterName, byte[] bytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Hanva POS Receipt";
        di.pDataType = "RAW";
        if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) return false;
        if (!StartDocPrinter(hPrinter, 1, di)) { ClosePrinter(hPrinter); return false; }
        if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return false; }
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
        int written = 0;
        bool success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written);
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return success;
    }
}
"@

Add-Type -TypeDefinition $rawType -ErrorAction SilentlyContinue
$bytes = [System.IO.File]::ReadAllBytes($binFile)
$ok = [RawPrinterHelper]::SendBytes($targetPrinter, $bytes)
if (-not $ok) {
  throw "Failed to spool raw ESC/POS bytes to printer '$targetPrinter'"
}
`;

    return await new Promise<{ success: boolean; error?: string }>((resolve) => {
      execFile(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          script,
          printerName || '',
          tmpFile,
        ],
        { timeout: 8000 },
        (err) => {
          if (err) {
            resolve({
              success: false,
              error: err.message || 'Spooler write error',
            });
          } else {
            resolve({ success: true });
          }
        },
      );
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Spooler exception',
    };
  } finally {
    try {
      await fs.promises.unlink(tmpFile);
    } catch {
      // ignore temp file removal errors
    }
  }
}
