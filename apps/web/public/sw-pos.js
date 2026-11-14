/**
 * Hanva POS & Captain PWA Service Worker (sw-pos.js)
 * Caches shell assets, app routes (/pos, /captain, /tables, /kds, /orders, /offline, /login), and static bundles
 * Provides offline navigation with high-resilience Offline Emergency Hub
 */

const CACHE_NAME = 'hanva-pos-shell-v3';

// Core shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/offline',
  '/pos',
  '/captain',
  '/tables',
  '/kds',
  '/orders',
  '/captain/manifest.webmanifest',
  '/captain-logo.png',
  '/captain-apple-icon.png',
  '/icons/captain-192.png',
  '/icons/captain-512.png',
  '/icons/captain-96.png',
  '/brand-lockup.png',
  '/hanva-logo.png',
  '/logo.png',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Offline Emergency Hub Self-Contained HTML Fallback (Zero CDN dependencies)
const OFFLINE_HUB_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline Emergency Hub - Hanva POS</title>
  <meta name="theme-color" content="#09090b">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px;
      -webkit-font-smoothing: antialiased;
    }
    @media (min-width: 640px) { body { padding: 32px; } }
    .container { max-width: 720px; margin: 0 auto; width: 100%; }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 14px;
      border-bottom: 1px solid #27272a;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }
    .brand-sub {
      font-size: 12px;
      font-weight: 400;
      color: #a1a1aa;
      margin-left: 6px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
      transition: all 0.3s ease;
    }
    .badge.online {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fbbf24;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .badge.online .pulse-dot { background: #34d399; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(0.9); } }
    .hero-card {
      margin-top: 24px;
      position: relative;
      overflow: hidden;
      border-radius: 16px;
      border: 1px solid #27272a;
      background: rgba(24, 24, 27, 0.65);
      padding: 24px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    @media (min-width: 640px) { .hero-card { padding: 32px; } }
    .glow {
      position: absolute;
      top: -40px;
      right: -40px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.12);
      filter: blur(48px);
      pointer-events: none;
    }
    .hero-flex {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .icon-box {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fbbf24;
      flex-shrink: 0;
    }
    .hero-title {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.02em;
      margin-top: 4px;
    }
    .hero-eyebrow {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #fbbf24;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .hero-desc {
      font-size: 13px;
      line-height: 1.6;
      color: #a1a1aa;
      margin-top: 8px;
    }
    .hero-desc strong { color: #f4f4f5; font-weight: 600; }
    .reconnect-bar {
      margin-top: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 12px;
      background: rgba(9, 9, 11, 0.7);
      border: 1px solid #27272a;
      font-size: 12px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .reconnect-status {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #d4d4d8;
    }
    .btn-check {
      background: #18181b;
      color: #e4e4e7;
      border: 1px solid #3f3f46;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-check:hover {
      background: #27272a;
      color: #fff;
      border-color: #52525b;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #71717a;
      margin: 28px 0 12px 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    @media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
    .nav-card {
      padding: 18px;
      border-radius: 14px;
      border: 1px solid #27272a;
      background: rgba(24, 24, 27, 0.45);
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      transition: all 0.2s ease;
    }
    .nav-card:hover {
      background: rgba(39, 39, 42, 0.6);
      border-color: rgba(245, 158, 11, 0.4);
      transform: translateY(-1px);
    }
    .nav-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-icon.amber {
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }
    .card-icon.blue {
      background: rgba(59, 130, 246, 0.12);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.25);
    }
    .card-icon.emerald {
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .card-icon.purple {
      background: rgba(168, 85, 247, 0.12);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.25);
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }
    .card-desc {
      font-size: 12px;
      color: #a1a1aa;
      margin-top: 4px;
      line-height: 1.4;
    }
    .diag-card {
      margin-top: 20px;
      padding: 18px;
      border-radius: 14px;
      border: 1px solid #27272a;
      background: rgba(24, 24, 27, 0.35);
      font-size: 12px;
    }
    .diag-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .diag-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    @media (min-width: 640px) { .diag-grid { grid-template-columns: repeat(3, 1fr); } }
    .diag-item {
      padding: 10px;
      border-radius: 10px;
      background: rgba(9, 9, 11, 0.6);
      border: 1px solid #27272a;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .diag-label {
      font-size: 11px;
      color: #71717a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .diag-val {
      font-size: 12px;
      font-weight: 500;
      color: #e4e4e7;
    }
    .diag-val.ok { color: #34d399; }
    .footer {
      max-width: 720px;
      margin: 32px auto 0;
      width: 100%;
      padding-top: 16px;
      border-top: 1px solid #27272a;
      text-align: center;
      font-size: 11px;
      color: #52525b;
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="brand">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2c2 3.5 3 6.5 3 9a6 6 0 0 1-12 0c0-2.5 1-5.5 3-9 1 2 2 3.5 3 3.5s2-1.5 3-3.5z"/>
          <path d="M18 10c1.5 2 2 4 2 5.5a4 4 0 0 1-8 0c0-1.5.5-3.5 2-5.5.7 1.3 1.3 2 2 2s1.3-.7 2-2z"/>
        </svg>
        <span class="brand-title">Hanva POS<span class="brand-sub">| Autonomous Operating System</span></span>
      </div>
      <div id="statusBadge" class="badge">
        <span class="pulse-dot"></span>
        <span id="badgeText">Offline Mode Active</span>
      </div>
    </header>

    <main>
      <div class="hero-card">
        <div class="glow"></div>
        <div class="hero-flex">
          <div class="icon-box">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
          </div>
          <div>
            <div class="hero-eyebrow">Offline Emergency Hub</div>
            <h1 class="hero-title">Cloud Network Disconnected</h1>
            <p class="hero-desc">
              Your internet connection dropped, but <strong>your restaurant operations will not stop</strong>.
              Offline billing, tableside ordering, and local thermal printer KOTs are running uninterrupted.
            </p>
          </div>
        </div>

        <div class="reconnect-bar">
          <div class="reconnect-status">
            <svg id="statusIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <line x1="12" y1="20" x2="12.01" y2="20"/>
            </svg>
            <span id="countdownMsg">Auto-checking connection in <strong id="secTimer">5</strong>s...</span>
          </div>
          <button id="checkBtn" class="btn-check" onclick="triggerCheck()">
            <svg id="btnSpinIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
            <span>Check Now</span>
          </button>
        </div>
      </div>

      <div class="section-title">Continue Working in Offline Mode</div>
      <div class="grid">
        <a href="/pos" class="nav-card">
          <div class="nav-card-top">
            <div class="card-icon amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                <path d="M2 7h20"/>
              </svg>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <div>
            <div class="card-title">Point of Sale (Biller)</div>
            <div class="card-desc">Punch orders, print customer receipts, and manage billing counter offline.</div>
          </div>
        </a>

        <a href="/captain" class="nav-card">
          <div class="nav-card-top">
            <div class="card-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
                <path d="M12 18h.01"/>
              </svg>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <div>
            <div class="card-title">Captain App (Waiter PWA)</div>
            <div class="card-desc">Full tableside ordering with cached menu, offline KOT, and table layout.</div>
          </div>
        </a>

        <a href="/tables" class="nav-card">
          <div class="nav-card-top">
            <div class="card-icon emerald">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v18"/>
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M3 15h18"/>
              </svg>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <div>
            <div class="card-title">Table Status & Management</div>
            <div class="card-desc">Check active dining tables, guest counts, running orders, and table transfers.</div>
          </div>
        </a>

        <a href="/login" class="nav-card">
          <div class="nav-card-top">
            <div class="card-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M16 16v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>
                <polyline points="15 12 19 8 19 16"/>
              </svg>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <div>
            <div class="card-title">Login / Switch Staff</div>
            <div class="card-desc">Return to staff authentication or switch user accounts when back online.</div>
          </div>
        </a>
      </div>

      <div class="diag-card">
        <div class="diag-header">
          <span style="font-weight: 600; color: #e4e4e7; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Hardware &amp; Local Storage Status
          </span>
          <button id="copyBtn" onclick="copyDiag()" style="background: none; border: none; color: #a1a1aa; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span id="copyTxt">Copy Diagnostics</span>
          </button>
        </div>
        <div class="diag-grid">
          <div class="diag-item">
            <span class="diag-label">Local Storage</span>
            <span id="idbVal" class="diag-val ok">Operational (Safe)</span>
          </div>
          <div class="diag-item">
            <span class="diag-label">Thermal Print Engine</span>
            <span class="diag-val">WebUSB / LAN Spooler</span>
          </div>
          <div class="diag-item">
            <span class="diag-label">Service Worker</span>
            <span class="diag-val ok">Offline Shell Active</span>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 11px; color: #71717a; border-top: 1px solid #27272a; padding-top: 8px;">
          💡 <strong>Pro-Tip:</strong> Any orders taken or modified while offline are securely stored in your device's IndexedDB and will automatically synchronize with cloud analytics as soon as your internet restores.
        </div>
      </div>
    </main>

    <footer class="footer">
      Hanva POS Autonomous Operating System &middot; Built for High-Volume Fine Dine &amp; QSR Restaurants
    </footer>
  </div>

  <script>
    var countdown = 5;
    var timerInterval;
    var isChecking = false;

    if (!('indexedDB' in window)) {
      var idbEl = document.getElementById('idbVal');
      if (idbEl) { idbEl.innerText = 'Unavailable'; idbEl.className = 'diag-val'; }
    }

    function updateOnlineState(online) {
      var badge = document.getElementById('statusBadge');
      var badgeTxt = document.getElementById('badgeText');
      var countMsg = document.getElementById('countdownMsg');
      if (online) {
        if (badge) { badge.className = 'badge online'; }
        if (badgeTxt) { badgeTxt.innerText = 'Back Online · Reconnecting'; }
        if (countMsg) { countMsg.innerHTML = '<strong>Connected!</strong> Synchronizing and reloading...'; }
        setTimeout(function() { window.location.reload(); }, 600);
      } else {
        if (badge) { badge.className = 'badge'; }
        if (badgeTxt) { badgeTxt.innerText = 'Offline Mode Active'; }
      }
    }

    window.addEventListener('online', function() { updateOnlineState(true); });
    window.addEventListener('offline', function() { updateOnlineState(false); });

    function triggerCheck() {
      if (isChecking) return;
      isChecking = true;
      var spin = document.getElementById('btnSpinIcon');
      if (spin) spin.className = 'spin';

      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 3000);

      fetch('/manifest.json?_t=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: controller.signal })
        .then(function(res) {
          clearTimeout(timeoutId);
          if (res.ok) {
            updateOnlineState(true);
          } else {
            updateOnlineState(false);
          }
        })
        .catch(function() {
          updateOnlineState(false);
        })
        .finally(function() {
          isChecking = false;
          if (spin) spin.className = '';
        });
    }

    timerInterval = setInterval(function() {
      if (navigator.onLine === false || !navigator.onLine) {
        countdown--;
        var secEl = document.getElementById('secTimer');
        if (secEl) secEl.innerText = countdown;
        if (countdown <= 0) {
          countdown = 5;
          triggerCheck();
        }
      }
    }, 1000);

    function copyDiag() {
      var diag = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        indexedDB: ('indexedDB' in window) ? 'Available' : 'Unavailable',
        serviceWorker: ('serviceWorker' in navigator) ? 'Active' : 'Unavailable'
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(diag, null, 2)).then(function() {
          var copyTxt = document.getElementById('copyTxt');
          if (copyTxt) {
            copyTxt.innerText = 'Copied!';
            setTimeout(function() { copyTxt.innerText = 'Copy Diagnostics'; }, 2000);
          }
        });
      }
    }
  </script>
</body>
</html>`;

// Install Event: pre-cache core application shell with resilient individual caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Pre-cache all core assets safely without letting one failure break install
        await Promise.allSettled(
          PRECACHE_ASSETS.map((asset) =>
            cache.add(asset).catch((err) => {
              console.warn(`[SW-POS] Skipped pre-caching ${asset}:`, err.message || err);
            }),
          ),
        );
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW-POS] Pre-caching encountered an error:', err);
      }),
  );
});

// Activate Event: clear old cache versions and claim immediate client control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

// Fetch Event: handle requests with Cache-First or Stale-While-Revalidate strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept GET requests and standard HTTP/HTTPS schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Never cache API calls in SW — managed by application layer & IndexedDB
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Static Assets (Next.js chunks, fonts, images, css, js)
  // Strategy: Cache-First with background revalidation
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|woff2?|ttf|eot|ico|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // In background, fetch fresh copy to keep cache up to date
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Ignore background fetch failure when offline
            });
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      }),
    );
    return;
  }

  // 2. Navigation / HTML pages (e.g. /pos, /captain, /login, /tables, /offline)
  // Strategy: Stale-While-Revalidate with rich offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed: attempt to serve cached page
          const cached = await caches.match(request);
          if (cached) return cached;

          // Route fallback for /pos
          if (url.pathname.startsWith('/pos')) {
            const posFallback = await caches.match('/pos');
            if (posFallback) return posFallback;
          }

          // Route fallback for /captain
          if (url.pathname.startsWith('/captain')) {
            const captainFallback = await caches.match('/captain');
            if (captainFallback) return captainFallback;
          }

          // Route fallback for /login
          if (url.pathname.startsWith('/login')) {
            const loginFallback = await caches.match('/login');
            if (loginFallback) return loginFallback;
          }

          // Route fallback for /tables
          if (url.pathname.startsWith('/tables')) {
            const tablesFallback = await caches.match('/tables');
            if (tablesFallback) return tablesFallback;
          }

          // Route fallback for Next.js /offline page
          const offlineFallback = await caches.match('/offline');
          if (offlineFallback) return offlineFallback;

          // Complete self-contained offline emergency hub HTML (Zero external dependencies)
          return new Response(OFFLINE_HUB_HTML, {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }),
    );
    return;
  }
});
