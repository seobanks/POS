/**
 * Hanva POS Local Print Bridge
 * ==========================================
 * Cloud-to-LAN Silent Thermal Printing Service (Petpooja style).
 * 
 * Runs as a background service on the restaurant's cashier computer.
 * Connects outbound to the Hanva cloud server via WebSocket.
 * Intercepts realtime print.job events and routes them instantly to:
 *   1. Cashier Bill Printer (e.g. RP3160 GOLD(U) 1 via USB / Windows Spooler)
 *   2. Kitchen KOT Printer(s) (e.g. southindian kot via LAN IP or Windows Spooler)
 * 
 * Works 100% silently with 0 clicks and zero browser popups.
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const https = require('https');
const { execFile, execSync } = require('child_process');
const readline = require('readline');
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
  billPrinter: '', // e.g. "RP3160 GOLD(U) 1" (Cashier Counter Printer)
  kotPrinter: '',  // e.g. "southindian kot" or "192.168.1.150" (Kitchen KOT Printer)
  stationRoutes: {
    // "Kitchen": "southindian kot",
    // "Bar": "192.168.1.151"
  },
  defaultPrinterPort: 9100,
  fallbackToWindowsPrinter: true,
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
 * Lists all installed Windows printers using PowerShell.
 */
function getInstalledWindowsPrinters() {
  if (process.platform !== 'win32') return [];
  try {
    const cmd = `powershell.exe -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object -Property Name, PortName | ConvertTo-Json"`;
    const out = execSync(cmd, { timeout: 6000, encoding: 'utf8' }).trim();
    if (!out) return [];
    const parsed = JSON.parse(out);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.map((p) => ({ name: p.Name, port: p.PortName }));
  } catch (e) {
    try {
      const fallbackCmd = `powershell.exe -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"`;
      const out = execSync(fallbackCmd, { timeout: 6000, encoding: 'utf8' }).trim();
      return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name, port: '' }));
    } catch {
      return [];
    }
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
      socket.end(data, () => {});
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
      error: 'Windows Print Spooler is only available on Windows',
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
function buildSampleEscPosTestSlip(title = 'TEST RECEIPT', targetLabel = '') {
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
  parts.push(Buffer.from(`${title}\n`, 'utf8'));
  parts.push(Buffer.from('--------------------------------\n', 'utf8'));
  // Align Left
  parts.push(Buffer.from([ESC, 0x61, 0]));
  parts.push(Buffer.from(`Printer:  ${targetLabel || 'Direct Spooler'}\n`, 'utf8'));
  parts.push(Buffer.from(`Host:     ${os.hostname()}\n`, 'utf8'));
  parts.push(Buffer.from(`Time:     ${new Date().toLocaleString()}\n`, 'utf8'));
  parts.push(Buffer.from('--------------------------------\n', 'utf8'));
  if (title.includes('KOT')) {
    parts.push(Buffer.from('TABLE #12 - DINE IN\n', 'utf8'));
    parts.push(Buffer.from('2x Masala Dosa (Crispy)\n', 'utf8'));
    parts.push(Buffer.from('1x South Indian Filter Coffee\n', 'utf8'));
  } else {
    parts.push(Buffer.from('1x Masala Dosa             90.00\n', 'utf8'));
    parts.push(Buffer.from('1x South Indian Filter     30.00\n', 'utf8'));
    parts.push(Buffer.from('--------------------------------\n', 'utf8'));
    // Bold Total
    parts.push(Buffer.from([ESC, 0x45, 1]));
    parts.push(Buffer.from('TOTAL AMOUNT              120.00\n', 'utf8'));
    parts.push(Buffer.from([ESC, 0x45, 0]));
  }
  parts.push(Buffer.from('--------------------------------\n', 'utf8'));
  // Align Center
  parts.push(Buffer.from([ESC, 0x61, 1]));
  parts.push(Buffer.from('✓ 1-CLICK DIRECT PRINT VERIFIED!\n', 'utf8'));
  parts.push(Buffer.from('Ready for live billing.\n\n\n\n', 'utf8'));
  // Auto-Cut Paper (GS V 66 0)
  parts.push(Buffer.from([GS, 0x56, 66, 0]));

  return Buffer.concat(parts);
}

/**
 * Authenticates with the Hanva Cloud API to obtain a session token and auto-fetch branchId.
 */
async function authenticate(config) {
  if (config.token && config.branchId) return { token: config.token, branchId: config.branchId };
  if (!config.username || !config.password) {
    log('ℹ️ No token or username/password provided in config.json');
    return { token: null, branchId: config.branchId || null };
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
          res.on('end', async () => {
            try {
              const body = JSON.parse(data);
              let token = body.token;
              if (!token && res.headers['set-cookie']) {
                for (const c of res.headers['set-cookie']) {
                  const m = c.match(/nodedr_session=([^;]+)/);
                  if (m) token = decodeURIComponent(m[1]);
                }
              }
              if (token) {
                log('✓ Authenticated successfully with Hanva Cloud!');
                // Auto-fetch branchId if not in config
                let branchId = config.branchId;
                if (!branchId) {
                  branchId = await fetchDefaultBranch(config.cloudUrl, token);
                }
                resolve({ token, branchId });
              } else {
                log('⚠️ Login response did not contain token:', body.message || data);
                resolve({ token: null, branchId: null });
              }
            } catch (err) {
              log('⚠️ Login response parse error:', err.message);
              resolve({ token: null, branchId: null });
            }
          });
        }
      );

      req.on('error', (err) => {
        log('⚠️ Authentication network error:', err.message);
        resolve({ token: null, branchId: null });
      });

      req.write(payload);
      req.end();
    } catch (e) {
      log('⚠️ Auth request setup error:', e.message);
      resolve({ token: null, branchId: null });
    }
  });
}

function fetchDefaultBranch(cloudUrl, token) {
  return new Promise((resolve) => {
    try {
      const url = new URL('/v1/branches', cloudUrl);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(
        url,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `nodedr_session=${token}`,
          },
          timeout: 8000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const branches = JSON.parse(data);
              if (Array.isArray(branches) && branches.length > 0) {
                log(`✓ Auto-selected Branch: ${branches[0].name} (${branches[0].id})`);
                resolve(branches[0].id);
                return;
              }
            } catch {}
            resolve(null);
          });
        }
      );
      req.on('error', () => resolve(null));
      req.end();
    } catch {
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
  const station = job.stationName || 'Counter';
  log(`📥 Incoming ${jobType} #${ticketNumber} (Station: ${station})`);

  if (!job.rawEscposBase64) {
    log('⚠️ Job contains no rawEscposBase64 payload, skipping.');
    return;
  }

  const rawBytes = Buffer.from(job.rawEscposBase64, 'base64');
  let target = '';

  // Specific routing logic:
  if (jobType === 'KOT') {
    // 1. Station specific route (e.g. config.stationRoutes["Kitchen"] or "southindian kot")
    if (config.stationRoutes && job.stationName && config.stationRoutes[job.stationName]) {
      target = config.stationRoutes[job.stationName];
    } else if (config.kotPrinter) {
      target = config.kotPrinter;
    } else if (job.targetPrinter && job.targetPrinter !== 'Default KOT Printer' && job.targetPrinter !== 'Counter Printer') {
      target = job.targetPrinter;
    } else {
      target = config.kotPrinter || config.billPrinter || '';
    }
  } else {
    // RECEIPT (Customer Bill)
    if (config.billPrinter) {
      target = config.billPrinter;
    } else if (job.targetPrinter && job.targetPrinter !== 'Counter Printer') {
      target = job.targetPrinter;
    } else {
      target = config.billPrinter || '';
    }
  }

  const isIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(target);
  const startTime = Date.now();

  // Route A: Network IP Thermal Printer (Port 9100)
  if (isIp) {
    const [ip, rawPort] = target.split(':');
    const port = rawPort ? parseInt(rawPort, 10) : config.defaultPrinterPort || 9100;
    log(`➡️ [${jobType}] Sending ${rawBytes.length} bytes to Network Printer (${ip}:${port})...`);
    const res = await printOverTcp(ip, port, rawBytes);
    const duration = Date.now() - startTime;

    if (res.success) {
      log(`✅ [${jobType}] Successfully printed #${ticketNumber} on ${ip}:${port} in ${duration}ms!`);
      return;
    } else {
      log(`❌ Network print to ${ip}:${port} failed: ${res.error}`);
    }
  }

  // Route B: Windows Print Spooler (Direct to named printer e.g. "RP3160 GOLD(U) 1" or "southindian kot")
  if (process.platform === 'win32') {
    const printerName = isIp ? '' : target;
    log(`➡️ [${jobType}] Sending ${rawBytes.length} bytes to Windows Spooler [${printerName || 'Default Windows Printer'}]...`);
    const res = await printToWindowsSpooler(printerName, rawBytes);
    const duration = Date.now() - startTime;

    if (res.success) {
      log(`✅ [${jobType}] Successfully printed #${ticketNumber} on [${printerName || 'Default'}] in ${duration}ms!`);
      return;
    } else {
      log(`❌ Windows Spooler print failed: ${res.error}`);
    }
  }
}

/**
 * Interactive Setup Wizard for Cashier PC
 */
async function runSetup() {
  banner();
  console.log('--- HANVA POS: 1-MINUTE PRINTER SETUP WIZARD ---\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  const currentConfig = loadConfig();

  const cloudUrl = (await question(`Cloud URL [${currentConfig.cloudUrl}]: `)).trim() || currentConfig.cloudUrl;
  const username = (await question(`Cashier Login Email [${currentConfig.username}]: `)).trim() || currentConfig.username;
  const password = (await question(`Cashier Password: `)).trim() || currentConfig.password;

  currentConfig.cloudUrl = cloudUrl;
  currentConfig.username = username;
  currentConfig.password = password;

  const auth = await authenticate(currentConfig);
  if (auth.token) {
    currentConfig.token = auth.token;
    if (auth.branchId) currentConfig.branchId = auth.branchId;
    console.log(`✓ Authentication succeeded!\n`);
  } else {
    console.log(`⚠️ Login failed, please verify your credentials.\n`);
  }

  console.log('Detecting installed Windows printers...\n');
  const printers = getInstalledWindowsPrinters();

  console.log('Available Printers on this PC:');
  printers.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.name} ${p.port ? `(${p.port})` : ''}`);
  });
  console.log(`  [M] Enter IP address manually (e.g. 192.168.1.150)\n`);

  // Choose Bill Printer
  let billChoice = await question(`Select CASHIER BILL PRINTER (number or M) [Default: 1]: `);
  billChoice = billChoice.trim();
  let billPrinter = currentConfig.billPrinter;
  if (!billChoice && printers.length > 0) {
    billPrinter = printers[0].name;
  } else if (billChoice.toUpperCase() === 'M') {
    billPrinter = (await question(`Enter Cashier Printer IP address: `)).trim();
  } else {
    const idx = parseInt(billChoice, 10) - 1;
    if (printers[idx]) billPrinter = printers[idx].name;
  }

  // Choose KOT Printer
  let kotChoice = await question(`Select KITCHEN KOT PRINTER (number or M) [Default: 2 or same]: `);
  kotChoice = kotChoice.trim();
  let kotPrinter = currentConfig.kotPrinter;
  if (!kotChoice && printers.length > 1) {
    kotPrinter = printers[1].name;
  } else if (kotChoice.toUpperCase() === 'M') {
    kotPrinter = (await question(`Enter Kitchen Printer IP address: `)).trim();
  } else {
    const idx = parseInt(kotChoice, 10) - 1;
    if (printers[idx]) kotPrinter = printers[idx].name;
    else if (!kotPrinter) kotPrinter = billPrinter;
  }

  currentConfig.billPrinter = billPrinter;
  currentConfig.kotPrinter = kotPrinter;
  currentConfig.stationRoutes = {
    Kitchen: kotPrinter,
  };

  saveConfig(currentConfig);

  console.log('\n======================================================');
  console.log(`✓ SETUP COMPLETE!`);
  console.log(`  Cashier Bill Printer:  ${billPrinter}`);
  console.log(`  Kitchen KOT Printer:   ${kotPrinter}`);
  console.log('======================================================\n');

  const testNow = (await question(`Send test slip to both printers now? (Y/n): `)).trim().toLowerCase();
  rl.close();

  if (testNow !== 'n') {
    await runTest(currentConfig);
  }

  console.log('\n======================================================');
  console.log('✓ SETUP COMPLETE!');
  console.log('  You can now start the bridge anytime by double-clicking');
  console.log('  "start-bridge.bat" or keep this window open.');
  console.log('======================================================\n');
  console.log('Starting the Print Bridge now in background...\n');
  await startBridge(currentConfig);
}

async function runCashierTest(config) {
  banner();
  const target = config.billPrinter || '';
  log(`🧪 Testing Cashier Bill Printer: [${target || 'Default Windows Printer'}]...`);
  const billTest = buildSampleEscPosTestSlip('CASHIER BILL TEST', target);
  let res;
  if (/^(\d{1,3}\.){3}\d{1,3}/.test(target)) {
    const [ip, p] = target.split(':');
    res = await printOverTcp(ip, p ? parseInt(p, 10) : 9100, billTest);
  } else {
    res = await printToWindowsSpooler(target, billTest);
  }
  if (res && !res.success) {
    log(`❌ Cashier test failed: ${res.error}`);
    return false;
  }
  log(`✅ Cashier Printer test slip successfully sent! Paper should feed and cut.\n`);
  return true;
}

async function runKotTest(config) {
  banner();
  const target = config.kotPrinter || config.billPrinter || '';
  log(`🧪 Testing Kitchen KOT Printer: [${target || 'Default Windows Printer'}]...`);
  const kotTest = buildSampleEscPosTestSlip('KITCHEN KOT TEST', target);
  let res;
  if (/^(\d{1,3}\.){3}\d{1,3}/.test(target)) {
    const [ip, p] = target.split(':');
    res = await printOverTcp(ip, p ? parseInt(p, 10) : 9100, kotTest);
  } else {
    res = await printToWindowsSpooler(target, kotTest);
  }
  if (res && !res.success) {
    log(`❌ Kitchen KOT test failed: ${res.error}`);
    return false;
  }
  log(`✅ Kitchen KOT test slip successfully sent! Paper should feed and cut.\n`);
  return true;
}

async function openCashDrawer(printerName) {
  banner();
  const target = printerName || '';
  log(`💵 Sending pulse to open cash drawer on [${target || 'Default Printer'}]...`);
  // Standard ESC/POS kick pulse (ESC p 0 25 250)
  const pulse = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  let res;
  if (/^(\d{1,3}\.){3}\d{1,3}/.test(target)) {
    const [ip, p] = target.split(':');
    res = await printOverTcp(ip, p ? parseInt(p, 10) : 9100, pulse);
  } else {
    res = await printToWindowsSpooler(target, pulse);
  }
  if (res && !res.success) {
    log(`❌ Cash drawer kick failed: ${res.error}`);
    return false;
  }
  log(`✅ Cash drawer pulse successfully sent! Drawer should open.\n`);
  return true;
}

async function runTest(config) {
  banner();
  log('🧪 Running Print Bridge Self-Test on configured printers...\n');

  // Test Cashier Printer
  if (config.billPrinter) {
    await runCashierTest(config);
  }

  // Test Kitchen Printer
  if (config.kotPrinter && config.kotPrinter !== config.billPrinter) {
    await runKotTest(config);
  }
}

async function startBridge(passedConfig) {
  banner();
  const config = passedConfig || loadConfig();

  if (!config.billPrinter && !config.kotPrinter && process.platform === 'win32') {
    console.log('⚠️ Printers not yet configured in config.json.');
    console.log('Launching interactive setup wizard...\n');
    return runSetup();
  }

  log(`Cloud Gateway:        ${config.cloudUrl}`);
  log(`Cashier Bill Printer: [${config.billPrinter || 'Default'}]`);
  log(`Kitchen KOT Printer:  [${config.kotPrinter || 'Default'}]`);

  const auth = await authenticate(config);
  if (auth.token) {
    config.token = auth.token;
    if (auth.branchId) config.branchId = auth.branchId;
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
    log(`📡 Listening for print jobs (KOTs from Captains & Bills from Cashier)...`);
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
      log('💚 Heartbeat: Print Bridge active and listening for live orders.');
    }
  }, 10 * 60 * 1000);
}

process.on('uncaughtException', (err) => {
  console.error('\n[FATAL EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('\n[UNHANDLED REJECTION]', reason);
});

async function main() {
  if (process.argv.includes('--printers')) {
    const list = getInstalledWindowsPrinters();
    console.log(JSON.stringify(list));
    process.exit(0);
  } else if (process.argv.includes('--setup')) {
    await runSetup();
  } else if (process.argv.includes('--test')) {
    const config = loadConfig();
    await runTest(config);
  } else if (process.argv.includes('--test-cashier')) {
    const config = loadConfig();
    await runCashierTest(config);
  } else if (process.argv.includes('--test-kot')) {
    const config = loadConfig();
    await runKotTest(config);
  } else if (process.argv.includes('--drawer')) {
    const config = loadConfig();
    await openCashDrawer(config.billPrinter);
  } else {
    await startBridge();
  }
}

main().catch((err) => {
  console.error('\n[FATAL ERROR]', err);
});
