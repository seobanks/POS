/**
 * Hanva POS Local Print Bridge
 * ==========================================
 * Cloud-to-LAN 1-Click Silent Thermal Printing Service (Petpooja style).
 * 
 * Runs as a background service on the restaurant's cashier computer.
 * Connects outbound to the Hanva cloud server via WebSocket.
 * Intercepts realtime print.job events and routes them instantly to:
 *   1. Network Thermal Printers over RAW TCP Port 9100 (LAN / Wi-Fi)
 *   2. Local USB / Windows Default Printer via Windows Print Spooler
 * 
 * Works 100% silently with 0 clicks and zero browser popups.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const https = require('https');
const { execFile } = require('child_process');
const os = require('os');
const { io } = require('socket.io-client');

const CONFIG_FILE = path.join(__dirname, 'config.json');

// Default Configuration Template
const DEFAULT_CONFIG = {
  cloudUrl: 'https://api.hanva.in',
  branchId: '',
  token: '',
  username: '',
  password: '',
  defaultPrinterIp: '192.168.1.100',
  defaultPrinterPort: 9100,
  fallbackToWindowsPrinter: true,
  windowsPrinterName: '', // empty = OS Default printer
  stationRoutes: {
    // e.g. "Kitchen": "192.168.1.200", "Bar": "192.168.1.201"
  }
};

function log(msg, ...args) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${msg}`, ...args);
}

function banner() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    HANVA POS — LOCAL PRINT BRIDGE                   ║
║          Cloud-to-LAN 1-Click Silent Thermal Printer Service         ║
╚══════════════════════════════════════════════════════════════════════╝
  Platform: ${os.platform()} (${os.arch()})
  Node.js:  ${process.version}
`);
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch (err) {
      log('⚠️ Could not parse config.json, using default options:', err.message);
    }
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    log('✓ Saved configuration to config.json');
  } catch (err) {
    log('⚠️ Failed to save config.json:', err.message);
  }
}

/**
 * Sends binary ESC/POS buffer over RAW TCP socket to printer IP:port (port 9100).
 */
function printOverTcp(host, port, data, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const cleanup = (success, error) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      try {
        socket.destroy();
      } catch (_) {}
      resolve(success ? { success: true } : { success: false, error });
    };

    socket.setTimeout(timeoutMs, () => {
      cleanup(false, `Timeout connecting to ${host}:${port}`);
    });

    socket.once('error', (err) => {
      cleanup(false, err.message || 'Socket connection failed');
    });

    socket.connect(port, host, () => {
      socket.end(data, () => {
        // Data flushed
      });
      socket.once('close', () => {
        cleanup(true);
      });
    });
  });
}

/**
 * Sends binary ESC/POS buffer directly to Windows Print Spooler (RAW datatype).
 * Silently bypasses all print dialogs using PowerShell winspool.drv.
 */
function printToWindowsSpooler(printerName, data) {
  if (process.platform !== 'win32') {
    return Promise.resolve({
      success: false,
      error: 'Windows Print Spooler is only available on Windows'
    });
  }

  const tmpDir = os.tmpdir();
  const tmpFile = path.join(
    tmpDir,
    `hanva_spool_${Date.now()}_${Math.random().toString(36).slice(2)}.bin`
  );

  return new Promise(async (resolve) => {
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
    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Hanva POS Receipt";
        di.pDataType = "RAW";
        bool success = false;
        if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                    Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                    int dwWritten = 0;
                    success = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return success;
    }
}
"@

Add-Type -TypeDefinition $rawType -ErrorAction SilentlyContinue
$bytes = [System.IO.File]::ReadAllBytes($binFile)
$ok = [RawPrinterHelper]::SendBytesToPrinter($targetPrinter, $bytes)
if (-not $ok) {
    throw "winspool failed to write raw bytes to printer: $targetPrinter"
}
`;

      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', script, printerName || '', tmpFile],
        { timeout: 8000 },
        async (err) => {
          try {
            await fs.promises.unlink(tmpFile);
          } catch (_) {}
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true });
          }
        }
      );
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

/**
 * Builds a sample 80mm ESC/POS test receipt buffer.
 */
function buildSampleEscPosTestSlip() {
  const ESC = 0x1b;
  const GS = 0x1d;
  const parts = [];

  // Reset
  parts.push(Buffer.from([ESC, 0x40]));
  // Align Center
  parts.push(Buffer.from([ESC, 0x61, 1]));
  // Double height & width for header
  parts.push(Buffer.from([GS, 0x21, 0x11]));
  parts.push(Buffer.from('HANVA POS\n', 'utf8'));
  // Normal text
  parts.push(Buffer.from([GS, 0x21, 0x00]));
  parts.push(Buffer.from('LOCAL PRINT BRIDGE — TEST SLIP\n', 'utf8'));
  parts.push(Buffer.from('--------------------------------\n', 'utf8'));
  // Align Left
  parts.push(Buffer.from([ESC, 0x61, 0]));
  parts.push(Buffer.from(`Status:   Bridge Online (Port 9100 / Spooler)\n`, 'utf8'));
  parts.push(Buffer.from(`Host:     ${os.hostname()}\n`, 'utf8'));
  parts.push(Buffer.from(`Time:     ${new Date().toLocaleString()}\n`, 'utf8'));
  parts.push(Buffer.from('--------------------------------\n', 'utf8'));
  parts.push(Buffer.from('1x Masala Dosa             90.00\n', 'utf8'));
  parts.push(Buffer.from('1x South Indian Filter     30.00\n', 'utf8'));
  parts.push(Buffer.from('--------------------------------\n', 'utf8'));
  // Bold Total
  parts.push(Buffer.from([ESC, 0x45, 1]));
  parts.push(Buffer.from('TOTAL AMOUNT              120.00\n', 'utf8'));
  parts.push(Buffer.from([ESC, 0x45, 0]));
  parts.push(Buffer.from('--------------------------------\n', 'utf8'));
  // Align Center
  parts.push(Buffer.from([ESC, 0x61, 1]));
  parts.push(Buffer.from('✓ 1-CLICK DIRECT PRINT ACTIVE!\n', 'utf8'));
  parts.push(Buffer.from('Ready to receive cashier orders.\n\n\n\n', 'utf8'));
  // Auto-Cut Paper (GS V 66 0)
  parts.push(Buffer.from([GS, 0x56, 66, 0]));

  return Buffer.concat(parts);
}

/**
 * Authenticates with the Hanva Cloud API to obtain a session token.
 */
async function authenticate(config) {
  if (config.token) return config.token;
  if (!config.username || !config.password) {
    log('ℹ️ No token or username/password provided in config.json');
    return null;
  }

  log(`🔐 Authenticating with ${config.cloudUrl} as ${config.username}...`);
  return new Promise((resolve) => {
    try {
      const url = new URL('/v1/auth/login', config.cloudUrl);
      const payload = JSON.stringify({
        usernameOrEmail: config.username,
        password: config.password,
      });

      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 10000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const body = JSON.parse(data);
              let token = body.token;
              // Extract cookie if returned
              if (!token && res.headers['set-cookie']) {
                for (const c of res.headers['set-cookie']) {
                  const m = c.match(/nodedr_session=([^;]+)/);
                  if (m) token = decodeURIComponent(m[1]);
                }
              }
              if (token) {
                log('✓ Authenticated successfully!');
                resolve(token);
              } else {
                log('⚠️ Login response did not contain token:', body.message || data);
                resolve(null);
              }
            } catch (err) {
              log('⚠️ Login response parse error:', err.message);
              resolve(null);
            }
          });
        }
      );

      req.on('error', (err) => {
        log('⚠️ Authentication network error:', err.message);
        resolve(null);
      });

      req.write(payload);
      req.end();
    } catch (e) {
      log('⚠️ Auth request setup error:', e.message);
      resolve(null);
    }
  });
}

/**
 * Main Print Job Dispatcher
 */
async function handlePrintJob(job, config) {
  const jobType = job.jobType || 'RECEIPT';
  const ticketNumber = job.ticketNumber || job.id?.slice(0, 8) || 'N/A';
  log(`📥 Incoming ${jobType} Job #${ticketNumber} (Target: ${job.targetPrinter || 'Default'})`);

  if (!job.rawEscposBase64) {
    log('⚠️ Job contains no rawEscposBase64 payload, skipping.');
    return;
  }

  const rawBytes = Buffer.from(job.rawEscposBase64, 'base64');
  let target = job.targetPrinter || config.defaultPrinterIp;

  // Check stationRoutes mapping
  if (config.stationRoutes && job.stationName && config.stationRoutes[job.stationName]) {
    target = config.stationRoutes[job.stationName];
  }

  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(target);
  const startTime = Date.now();

  // Route 1: Direct TCP Port 9100 (Network thermal printer)
  if (isIp) {
    const port = config.defaultPrinterPort || 9100;
    log(`➡️ Sending ${rawBytes.length} bytes to Network Printer at ${target}:${port}...`);
    const res = await printOverTcp(target, port, rawBytes);
    const duration = Date.now() - startTime;

    if (res.success) {
      log(`✅ Successfully printed ${jobType} #${ticketNumber} on ${target}:${port} in ${duration}ms!`);
      return;
    } else {
      log(`❌ Network print to ${target}:${port} failed: ${res.error}`);
    }
  }

  // Route 2: Windows Print Spooler (USB / Default Windows printer fallback)
  if (config.fallbackToWindowsPrinter && process.platform === 'win32') {
    const printerName = isIp ? config.windowsPrinterName : target;
    log(`➡️ Fallback: Sending ${rawBytes.length} bytes to Windows Print Spooler (${printerName || 'Default Printer'})...`);
    const res = await printToWindowsSpooler(printerName, rawBytes);
    const duration = Date.now() - startTime;

    if (res.success) {
      log(`✅ Successfully printed ${jobType} #${ticketNumber} via Windows Spooler in ${duration}ms!`);
      return;
    } else {
      log(`❌ Windows Spooler print failed: ${res.error}`);
    }
  }
}

async function runTest(config) {
  banner();
  log('🧪 Running Print Bridge Self-Test Slip...');
  const testData = buildSampleEscPosTestSlip();

  if (config.defaultPrinterIp && /^(\d{1,3}\.){3}\d{1,3}$/.test(config.defaultPrinterIp)) {
    log(`➡️ Testing Network Printer at ${config.defaultPrinterIp}:${config.defaultPrinterPort || 9100}...`);
    const res = await printOverTcp(config.defaultPrinterIp, config.defaultPrinterPort || 9100, testData);
    if (res.success) {
      log(`✅ TEST PRINT SUCCEEDED on ${config.defaultPrinterIp}! Paper should be cut.`);
      process.exit(0);
    } else {
      log(`❌ Network test failed: ${res.error}`);
    }
  }

  if (process.platform === 'win32') {
    log(`➡️ Testing Windows Print Spooler (${config.windowsPrinterName || 'Default'})...`);
    const res = await printToWindowsSpooler(config.windowsPrinterName, testData);
    if (res.success) {
      log(`✅ TEST PRINT SUCCEEDED via Windows Print Spooler!`);
      process.exit(0);
    } else {
      log(`❌ Windows spooler test failed: ${res.error}`);
    }
  }

  process.exit(1);
}

async function startBridge() {
  banner();
  const config = loadConfig();

  if (process.argv.includes('--test')) {
    return runTest(config);
  }

  log(`Connecting to Cloud Server: ${config.cloudUrl}`);
  log(`Default Printer IP:         ${config.defaultPrinterIp}:${config.defaultPrinterPort || 9100}`);
  log(`Windows Spooler Fallback:   ${config.fallbackToWindowsPrinter ? 'ENABLED' : 'DISABLED'}`);

  const token = await authenticate(config);
  if (token) {
    config.token = token;
    saveConfig(config);
  }

  const socketUrl = config.cloudUrl.replace(/\/v1$/, '');
  const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    auth: {
      token: config.token,
      branchId: config.branchId,
    },
    query: {
      branchId: config.branchId,
      token: config.token,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    log('🟢 [ONLINE] Connected to Hanva POS Cloud Realtime Gateway!');
    log(`📡 Listening for print jobs on Branch: ${config.branchId || 'All Branches'}...`);
  });

  socket.on('disconnect', (reason) => {
    log(`🔴 [OFFLINE] Disconnected from Cloud Gateway: ${reason}. Retrying...`);
  });

  socket.on('connect_error', (err) => {
    log(`⚠️ Connection error: ${err.message}. Retrying in background...`);
  });

  socket.on('print.job', async (job) => {
    try {
      await handlePrintJob(job, config);
    } catch (err) {
      log('❌ Unhandled print job error:', err.message);
    }
  });

  // Keep-alive heartbeat log every 10 minutes
  setInterval(() => {
    if (socket.connected) {
      log('💚 Heartbeat: Print Bridge active and ready for orders.');
    }
  }, 10 * 60 * 1000);
}

startBridge();
