using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace HanvaPOS.Launcher
{
    static class Program
    {
        private static Mutex _singleInstanceMutex;
        private static NotifyIcon _trayIcon;
        private static Process _backendProcess;
        private static Process _webProcess;
        private static string _appDir;
        private static string _dataDir;
        private static string _logsDir;
        private static string _pgDataDir;
        private static string _nodeExe;
        private static string _pgBinDir;
        private static string _backendDir;
        private static string _webDir;
        private static string _localIp;
        private static bool _isExiting;

        [STAThread]
        static void Main()
        {
            string debugLog = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HanvaPOS", "data", "logs", "launcher-debug.log");
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(debugLog));
                File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} Launcher Main started (PID {1})\n", DateTime.Now, Process.GetCurrentProcess().Id));

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                bool isOnlyInstance = false;
                try
                {
                    _singleInstanceMutex = new Mutex(true, "Local\\HanvaPOS_SingleInstance_Mutex", out isOnlyInstance);
                    if (!isOnlyInstance)
                    {
                        isOnlyInstance = _singleInstanceMutex.WaitOne(0, false);
                    }
                }
                catch (AbandonedMutexException)
                {
                    // Previous instance exited or was killed; we take ownership!
                    isOnlyInstance = true;
                }

                File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} Mutex check: isOnlyInstance={1}\n", DateTime.Now, isOnlyInstance));

                if (!isOnlyInstance)
                {
                    // Another instance is genuinely actively running — open POS if ready, else notify
                    try
                    {
                        File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} Second instance detected, checking port 3000...\n", DateTime.Now));
                        bool ready = false;
                        using (var client = new HttpClient())
                        {
                            client.Timeout = TimeSpan.FromSeconds(1);
                            try
                            {
                                var res = client.GetAsync("http://127.0.0.1:3000").Result;
                                ready = res.IsSuccessStatusCode || res.StatusCode == HttpStatusCode.Redirect;
                            }
                            catch { }
                        }

                        if (ready)
                        {
                            OpenAppWindow("http://localhost:3000");
                        }
                        else
                        {
                            MessageBox.Show("Hanva Fine Dine POS is starting up in the background.\nPlease check the Hanva icon in your system tray (bottom-right near the clock).",
                                "Hanva POS Starting", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        }
                    }
                    catch { }
                    return;
                }

                InitPaths();
                File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} InitPaths completed. _appDir={1}\n", DateTime.Now, _appDir));

                _localIp = GetLocalIpAddress();
                File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} Local IP={1}\n", DateTime.Now, _localIp));

                InitializeTray();
                File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} InitializeTray completed\n", DateTime.Now));

                // Run supervisor in background thread
                Task.Run(async () =>
                {
                    try
                    {
                        File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} Background task starting StartServicesAsync...\n", DateTime.Now));
                        await StartServicesAsync();
                        File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} StartServicesAsync finished.\n", DateTime.Now));
                    }
                    catch (Exception ex)
                    {
                        File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} Supervisor fatal error: {1}\n", DateTime.Now, ex));
                        LogError("Supervisor fatal error", ex);
                        ShowBalloon("Startup Error", "Could not start POS services: " + ex.Message, ToolTipIcon.Error);
                    }
                });

                File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} Calling Application.Run()...\n", DateTime.Now));
                Application.Run();
                File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} Application.Run() exited.\n", DateTime.Now));
            }
            catch (Exception ex)
            {
                try
                {
                    File.AppendAllText(debugLog, string.Format("{0:yyyy-MM-dd HH:mm:ss} CRASH IN MAIN: {1}\n", DateTime.Now, ex));
                }
                catch { }
            }
        }

        private static void InitPaths()
        {
            _appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            
            _dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HanvaPOS", "data");
            _logsDir = Path.Combine(_dataDir, "logs");
            _pgDataDir = Path.Combine(_dataDir, "pgdata");

            Directory.CreateDirectory(_dataDir);
            Directory.CreateDirectory(_logsDir);

            // Locate Node.js
            string localNode = Path.Combine(_appDir, "bin", "node", "node.exe");
            if (File.Exists(localNode)) _nodeExe = localNode;
            else _nodeExe = "node.exe";

            // Locate PostgreSQL
            string localPg = Path.Combine(_appDir, "bin", "postgres", "bin");
            if (Directory.Exists(localPg)) _pgBinDir = localPg;
            else _pgBinDir = Path.Combine(_appDir, "postgres", "bin");

            // Locate Backend & Web
            _backendDir = Path.Combine(_appDir, "app", "backend");
            _webDir = Path.Combine(_appDir, "app", "web");
        }

        private static void InitializeTray()
        {
            _trayIcon = new NotifyIcon();
            _trayIcon.Text = "Hanva Fine Dine POS";

            // Load icon if available, otherwise use application icon
            string iconPath = Path.Combine(_appDir, "app.ico");
            if (File.Exists(iconPath))
            {
                try { _trayIcon.Icon = new Icon(iconPath); } catch { _trayIcon.Icon = SystemIcons.Application; }
            }
            else
            {
                _trayIcon.Icon = SystemIcons.Application;
            }

            ContextMenuStrip menu = new ContextMenuStrip();
            
            ToolStripMenuItem titleItem = new ToolStripMenuItem("Hanva Fine Dine POS (Starting...)");
            titleItem.Enabled = false;
            titleItem.Font = new Font(Control.DefaultFont, FontStyle.Bold);
            menu.Items.Add(titleItem);
            menu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem openPosItem = new ToolStripMenuItem("Open Billing POS Window", null, (s, e) => OpenAppWindow("http://localhost:3000"));
            openPosItem.Font = new Font(Control.DefaultFont, FontStyle.Bold);
            menu.Items.Add(openPosItem);

            ToolStripMenuItem showWifiItem = new ToolStripMenuItem("Show Wi-Fi LAN IP (For Waiter / KDS Tabs)", null, (s, e) => ShowWifiDialog());
            menu.Items.Add(showWifiItem);

            ToolStripMenuItem openLogsItem = new ToolStripMenuItem("View Logs Folder", null, (s, e) => Process.Start("explorer.exe", _logsDir));
            menu.Items.Add(openLogsItem);

            menu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem restartItem = new ToolStripMenuItem("Restart POS Services", null, async (s, e) =>
            {
                ShowBalloon("Restarting", "Restarting POS background services...", ToolTipIcon.Info);
                await StopServicesAsync();
                await StartServicesAsync();
            });
            menu.Items.Add(restartItem);

            ToolStripMenuItem exitItem = new ToolStripMenuItem("Stop & Exit", null, async (s, e) =>
            {
                _isExiting = true;
                _trayIcon.Visible = false;
                await StopServicesAsync();
                Application.Exit();
            });
            menu.Items.Add(exitItem);

            _trayIcon.ContextMenuStrip = menu;
            _trayIcon.DoubleClick += (s, e) => OpenAppWindow("http://localhost:3000");
            _trayIcon.Visible = true;
        }

        private static async Task StartServicesAsync()
        {
            UpdateTrayStatus("Starting local database...");
            await EnsurePostgresStartedAsync();

            UpdateTrayStatus("Checking database configuration...");
            EnsureBackendConfig();

            UpdateTrayStatus("Starting POS backend server...");
            StartBackendProcess();

            UpdateTrayStatus("Starting POS web server...");
            StartWebProcess();

            // Wait for Web to become healthy
            bool webReady = await WaitForHttpAsync("http://127.0.0.1:3000", TimeSpan.FromSeconds(60));
            if (webReady)
            {
                UpdateTrayStatus("Online (Port 3000)");
                string msg = string.Format("Billing Counter ready.\nWi-Fi Waiter Tablets: http://{0}:3000", _localIp);
                ShowBalloon("Hanva POS Online", msg, ToolTipIcon.Info);
                OpenAppWindow("http://localhost:3000");
            }
            else
            {
                UpdateTrayStatus("Started (Check logs)");
            }
        }

        private static async Task EnsurePostgresStartedAsync()
        {
            string initdbExe = Path.Combine(_pgBinDir, "initdb.exe");
            string pgctlExe = Path.Combine(_pgBinDir, "pg_ctl.exe");

            if (!File.Exists(initdbExe) || !File.Exists(pgctlExe))
            {
                LogError("PostgreSQL binaries not found in " + _pgBinDir, null);
                return;
            }

            // 1. Initialize data directory if not initialized
            string versionFile = Path.Combine(_pgDataDir, "PG_VERSION");
            bool isFirstInit = !File.Exists(versionFile);
            if (isFirstInit)
            {
                Log("Initializing PostgreSQL data cluster in " + _pgDataDir);
                string initArgs = string.Format("-D \"{0}\" -U postgres -E UTF8 -A trust", _pgDataDir);
                await RunProcessAsync(initdbExe, initArgs, _pgBinDir);
            }

            // 2. Start PostgreSQL if not already running
            string statusArgs = string.Format("status -D \"{0}\"", _pgDataDir);
            int statusExit = await RunProcessAsync(pgctlExe, statusArgs, _pgBinDir);
            if (statusExit != 0)
            {
                Log("Starting PostgreSQL service...");
                string logPath = Path.Combine(_logsDir, "postgres.log");
                string startArgs = string.Format("start -D \"{0}\" -l \"{1}\" -w", _pgDataDir, logPath);
                await RunProcessAsync(pgctlExe, startArgs, _pgBinDir);
            }
            else
            {
                Log("PostgreSQL service is already active.");
            }

            // 3. For new installations, create database, run migrations and seed
            if (isFirstInit)
            {
                await Task.Delay(2000);

                string createdbExe = Path.Combine(_pgBinDir, "createdb.exe");
                if (File.Exists(createdbExe))
                {
                    Log("Creating hanva_pos database...");
                    await RunProcessAsync(createdbExe, "-U postgres -h 127.0.0.1 -p 5432 hanva_pos", _pgBinDir);
                }

                var dbEnv = new System.Collections.Generic.Dictionary<string, string>();
                dbEnv["DATABASE_URL"] = "postgresql://postgres@127.0.0.1:5432/hanva_pos?schema=public";
                dbEnv["NODE_ENV"] = "production";

                string prismaCli = Path.Combine(_backendDir, "node_modules", "prisma", "build", "index.js");
                if (File.Exists(prismaCli))
                {
                    Log("Applying database migrations with Prisma migrate deploy...");
                    await RunProcessAsync(_nodeExe, "\"" + prismaCli + "\" migrate deploy", _backendDir, dbEnv);
                }
                else
                {
                    string psqlExe = Path.Combine(_pgBinDir, "psql.exe");
                    string schemaSql = Path.Combine(_backendDir, "prisma", "schema.sql");
                    if (File.Exists(psqlExe) && File.Exists(schemaSql))
                    {
                        Log("Applying initial database schema from " + schemaSql);
                        string psqlArgs = string.Format("-U postgres -h 127.0.0.1 -p 5432 -d hanva_pos -f \"{0}\"", schemaSql);
                        await RunProcessAsync(psqlExe, psqlArgs, _pgBinDir);
                    }
                }

                string seedJs = Path.Combine(_backendDir, "prisma", "dist", "seed.js");
                if (!File.Exists(seedJs)) seedJs = Path.Combine(_backendDir, "dist", "prisma", "seed.js");
                if (File.Exists(seedJs))
                {
                    Log("Seeding default restaurant and credentials from " + seedJs);
                    await RunProcessAsync(_nodeExe, "\"" + seedJs + "\"", _backendDir, dbEnv);
                }
            }
        }

        private static void EnsureBackendConfig()
        {
            string envFile = Path.Combine(_dataDir, ".env");
            if (!File.Exists(envFile))
            {
                string secret = GenerateSecureSecret(64);
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("PORT=4001");
                sb.AppendLine("DATABASE_URL=\"postgresql://postgres@127.0.0.1:5432/hanva_pos?schema=public\"");
                sb.AppendLine("JWT_SECRET=\"" + secret + "\"");
                sb.AppendLine("JWT_EXPIRES_IN=12h");
                sb.AppendLine("COOKIE_SECURE=false");
                sb.AppendLine("CORS_ORIGIN=http://localhost:3000");
                sb.AppendLine("NX_DAEMON=false");
                File.WriteAllText(envFile, sb.ToString(), Encoding.UTF8);
            }

            // Copy .env into backend directory if not present
            string backendEnv = Path.Combine(_backendDir, ".env");
            try
            {
                File.Copy(envFile, backendEnv, true);
            }
            catch { }
        }

        private static void StartBackendProcess()
        {
            StopProcess(ref _backendProcess);

            string mainJs = Path.Combine(_backendDir, "dist", "src", "main.js");
            if (!File.Exists(mainJs)) mainJs = Path.Combine(_backendDir, "dist", "main.js");

            if (!File.Exists(mainJs))
            {
                LogError("Backend entrypoint not found: " + mainJs, null);
                return;
            }

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = _nodeExe,
                Arguments = "\"" + mainJs + "\"",
                WorkingDirectory = _backendDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            // Pass environment
            psi.EnvironmentVariables["PORT"] = "4001";
            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["DATABASE_URL"] = "postgresql://postgres@127.0.0.1:5432/hanva_pos?schema=public";

            _backendProcess = new Process { StartInfo = psi };
            string logPath = Path.Combine(_logsDir, "backend.log");
            
            _backendProcess.OutputDataReceived += (s, e) => { if (e.Data != null) File.AppendAllText(logPath, e.Data + "\n"); };
            _backendProcess.ErrorDataReceived += (s, e) => { if (e.Data != null) File.AppendAllText(logPath, "[ERR] " + e.Data + "\n"); };

            _backendProcess.Start();
            _backendProcess.BeginOutputReadLine();
            _backendProcess.BeginErrorReadLine();
            Log("Backend process started (PID " + _backendProcess.Id + ")");
        }

        private static void StartWebProcess()
        {
            StopProcess(ref _webProcess);

            string serverJs = Path.Combine(_webDir, "apps", "web", "server.js");
            string workingDir = _webDir;
            if (File.Exists(serverJs))
            {
                workingDir = Path.Combine(_webDir, "apps", "web");
            }
            else
            {
                serverJs = Path.Combine(_webDir, "server.js");
            }

            if (!File.Exists(serverJs))
            {
                LogError("Next.js web standalone server not found: " + serverJs, null);
                return;
            }

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = _nodeExe,
                Arguments = "\"" + serverJs + "\"",
                WorkingDirectory = workingDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            psi.EnvironmentVariables["PORT"] = "3000";
            psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";
            psi.EnvironmentVariables["BACKEND_URL"] = "http://localhost:4001";
            psi.EnvironmentVariables["NEXT_PUBLIC_API_URL"] = "http://localhost:4001";
            psi.EnvironmentVariables["NODE_ENV"] = "production";

            _webProcess = new Process { StartInfo = psi };
            string logPath = Path.Combine(_logsDir, "web.log");

            _webProcess.OutputDataReceived += (s, e) => { if (e.Data != null) File.AppendAllText(logPath, e.Data + "\n"); };
            _webProcess.ErrorDataReceived += (s, e) => { if (e.Data != null) File.AppendAllText(logPath, "[ERR] " + e.Data + "\n"); };

            _webProcess.Start();
            _webProcess.BeginOutputReadLine();
            _webProcess.BeginErrorReadLine();
            Log("Web process started (PID " + _webProcess.Id + ")");
        }

        private static async Task StopServicesAsync()
        {
            Log("Stopping POS processes...");
            StopProcess(ref _webProcess);
            StopProcess(ref _backendProcess);

            // Stop PostgreSQL gracefully
            string pgctlExe = Path.Combine(_pgBinDir, "pg_ctl.exe");
            if (File.Exists(pgctlExe) && Directory.Exists(_pgDataDir))
            {
                try
                {
                    string stopArgs = string.Format("stop -D \"{0}\" -m fast -w", _pgDataDir);
                    await RunProcessAsync(pgctlExe, stopArgs, _pgBinDir);
                    Log("PostgreSQL stopped.");
                }
                catch (Exception ex)
                {
                    LogError("Error stopping postgres", ex);
                }
            }
        }

        private static void StopProcess(ref Process p)
        {
            if (p != null)
            {
                try
                {
                    if (!p.HasExited)
                    {
                        p.Kill();
                        p.WaitForExit(3000);
                    }
                }
                catch { }
                p = null;
            }
        }

        private static async Task<bool> WaitForHttpAsync(string url, TimeSpan timeout)
        {
            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(2);
                DateTime deadline = DateTime.UtcNow + timeout;
                while (DateTime.UtcNow < deadline)
                {
                    try
                    {
                        var res = await client.GetAsync(url);
                        if (res.IsSuccessStatusCode || res.StatusCode == HttpStatusCode.Redirect)
                            return true;
                    }
                    catch { }
                    await Task.Delay(1000);
                }
            }
            return false;
        }

        private static async Task<int> RunProcessAsync(string exe, string args, string workingDir, System.Collections.Generic.Dictionary<string, string> env = null)
        {
            return await Task.Run(() =>
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = exe,
                    Arguments = args,
                    WorkingDirectory = workingDir,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                if (env != null)
                {
                    foreach (var kvp in env)
                    {
                        psi.EnvironmentVariables[kvp.Key] = kvp.Value;
                    }
                }

                using (Process p = new Process())
                {
                    p.StartInfo = psi;
                    StringBuilder output = new StringBuilder();
                    StringBuilder error = new StringBuilder();

                    p.OutputDataReceived += (s, e) => { if (e.Data != null) output.AppendLine(e.Data); };
                    p.ErrorDataReceived += (s, e) => { if (e.Data != null) error.AppendLine(e.Data); };

                    p.Start();
                    p.BeginOutputReadLine();
                    p.BeginErrorReadLine();
                    p.WaitForExit();

                    if (p.ExitCode != 0)
                    {
                        string errText = error.ToString().Trim();
                        if (string.IsNullOrEmpty(errText)) errText = output.ToString().Trim();
                        Log("Command (" + Path.GetFileName(exe) + ") exited with code " + p.ExitCode + ": " + errText);
                    }
                    return p.ExitCode;
                }
            });
        }

        private static void ShowWifiDialog()
        {
            string url = "http://" + _localIp + ":3000";
            string msg = "Other devices on the same Wi-Fi network (waiter mobile phones, tablets, kitchen display) can connect to:\n\n" +
                         url + "\n\n" +
                         "Ensure this computer remains connected to your restaurant's Wi-Fi router.";
            MessageBox.Show(msg, "Local Wi-Fi Network Address", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private static string GetLocalIpAddress()
        {
            try
            {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    if (endPoint != null) return endPoint.Address.ToString();
                }
            }
            catch { }
            return "127.0.0.1";
        }

        private static string GenerateSecureSecret(int bytes)
        {
            byte[] data = new byte[bytes];
            using (var rng = RandomNumberGenerator.Create()) rng.GetBytes(data);
            return Convert.ToBase64String(data).Replace("+", "").Replace("/", "").Substring(0, bytes);
        }

        private static void OpenAppWindow(string url)
        {
            try
            {
                // Prefer Microsoft Edge as it is guaranteed on Windows 10/11, or Google Chrome / Brave
                string[] candidateBrowsers = new string[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "BraveSoftware", "Brave-Browser", "Application", "brave.exe")
                };

                string browserPath = null;
                foreach (string candidate in candidateBrowsers)
                {
                    if (File.Exists(candidate))
                    {
                        browserPath = candidate;
                        break;
                    }
                }

                if (browserPath != null)
                {
                    string profileDir = Path.Combine(_dataDir, "app-profile");
                    try { Directory.CreateDirectory(profileDir); } catch { }

                    // Launch in standalone software window mode (frameless, zero address bar, isolated profile)
                    string arguments = string.Format(
                        "--app=\"{0}\" --window-size=1366,768 --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check --disable-features=Translate,ChromeWhatsNewUI",
                        url,
                        profileDir
                    );

                    ProcessStartInfo psi = new ProcessStartInfo(browserPath, arguments);
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = false;
                    Process.Start(psi);
                    return;
                }
            }
            catch (Exception ex)
            {
                LogError("Failed to launch standalone app window, falling back to shell execute", ex);
            }

            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
        }

        private static void OpenBrowser(string url)
        {
            OpenAppWindow(url);
        }

        private static void UpdateTrayStatus(string status)
        {
            if (_trayIcon != null && _trayIcon.ContextMenuStrip != null)
            {
                _trayIcon.ContextMenuStrip.Items[0].Text = "Hanva POS: " + status;
            }
        }

        private static void ShowBalloon(string title, string text, ToolTipIcon icon)
        {
            if (_trayIcon != null && !_isExiting)
            {
                _trayIcon.ShowBalloonTip(3000, title, text, icon);
            }
        }

        private static void Log(string msg)
        {
            try { File.AppendAllText(Path.Combine(_logsDir, "launcher.log"), string.Format("{0:yyyy-MM-dd HH:mm:ss} {1}\n", DateTime.Now, msg)); } catch { }
        }

        private static void LogError(string msg, Exception ex)
        {
            try { File.AppendAllText(Path.Combine(_logsDir, "launcher-error.log"), string.Format("{0:yyyy-MM-dd HH:mm:ss} {1}: {2}\n", DateTime.Now, msg, ex)); } catch { }
        }
    }
}
