"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Zap,
  Smartphone,
  Store,
  Database,
  Printer,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  LayoutGrid,
  LogIn,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const [copied, setCopied] = useState<boolean>(false);
  const [idbStatus, setIdbStatus] = useState<string>("Checking...");

  // Detect online / offline events
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : false);

    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check IndexedDB capability
    if (typeof window !== "undefined" && "indexedDB" in window) {
      setIdbStatus("Operational (Orders Safe)");
    } else {
      setIdbStatus("Unavailable");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Periodic auto-check ping
  useEffect(() => {
    if (isOnline) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          checkConnection();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOnline]);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("/manifest.json?_t=" + Date.now(), {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setIsOnline(true);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopyDiagnostics = () => {
    const diag = {
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "",
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      indexedDB: idbStatus,
    };
    navigator.clipboard.writeText(JSON.stringify(diag, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-amber-500/30">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>Hanva POS</span>
              <span className="text-xs font-normal text-zinc-400">| Autonomous Operating System</span>
            </h1>
          </div>
        </div>

        <div>
          {isOnline ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Back Online &middot; Reconnecting</span>
            </Badge>
          ) : (
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Offline Mode Active</span>
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto w-full py-8 sm:py-12 flex flex-col gap-6">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <WifiOff className="h-8 w-8" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono">
                  Offline Emergency Hub
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Cloud Network Disconnected
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Your internet connection dropped, but <strong>your restaurant operations will not stop</strong>.
                Offline billing, tableside ordering, and local thermal printer KOTs are running uninterrupted.
              </p>
            </div>
          </div>

          {/* Auto Reconnect Banner */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              {isChecking ? (
                <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />
              ) : (
                <Wifi className="h-3.5 w-3.5 text-zinc-400" />
              )}
              <span>
                {isOnline
                  ? "Connected! Synchronizing data..."
                  : `Auto-checking connection in ${countdown}s...`}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={isChecking}
              onClick={checkConnection}
              className="h-7 text-xs border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${isChecking ? "animate-spin" : ""}`} />
              Check Now
            </Button>
          </div>
        </div>

        {/* Action Navigation Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
            Continue Working in Offline Mode
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* POS Card */}
            <Link
              href="/pos"
              className="group p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Store className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                  Point of Sale (Biller)
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Punch orders, print customer receipts, and manage billing counter offline.
                </p>
              </div>
            </Link>

            {/* Captain App Card */}
            <Link
              href="/captain"
              className="group p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Smartphone className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Captain App (Waiter PWA)
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Full tableside ordering with cached menu, offline KOT, and table layout.
                </p>
              </div>
            </Link>

            {/* Table Management Card */}
            <Link
              href="/tables"
              className="group p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  Table Status &amp; Management
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Check active dining tables, guest counts, running orders, and table transfers.
                </p>
              </div>
            </Link>

            {/* Login / Switch Staff Card */}
            <Link
              href="/login"
              className="group p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-purple-500/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <LogIn className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">
                  Login / Switch Staff
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Return to staff authentication or switch user accounts when back online.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Hardware & Diagnostics Status */}
        <Card className="p-4 sm:p-5 rounded-xl border-zinc-800 bg-zinc-900/30 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-300 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Hardware &amp; Local Storage Status
            </span>
            <button
              onClick={handleCopyDiagnostics}
              className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Copy diagnostic information"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy Diagnostics"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-amber-400" /> Local Storage
              </span>
              <span className="font-medium text-zinc-200">{idbStatus}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Printer className="h-3 w-3 text-blue-400" /> Thermal Print Engine
              </span>
              <span className="font-medium text-zinc-200">WebUSB / LAN Spooler</span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex flex-col gap-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-emerald-400" /> Service Worker
              </span>
              <span className="font-medium text-emerald-400">Offline Shell Active</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60 leading-normal">
            💡 <strong>Pro-Tip:</strong> Any orders taken or modified while offline are securely stored in your device&apos;s IndexedDB and will automatically synchronize with cloud analytics as soon as your internet restores.
          </div>
        </Card>
      </div>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center text-xs text-zinc-600 border-t border-zinc-800/80">
        Hanva POS Autonomous Operating System &middot; Built for High-Volume Fine Dine &amp; QSR Restaurants
      </footer>
    </main>
  );
}
