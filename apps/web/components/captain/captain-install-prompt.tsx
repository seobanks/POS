"use client";

import { useEffect, useState } from "react";
import { Download, MonitorSmartphone, Moon, Share, Sparkles, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function CaptainInstallPrompt() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Check if already installed / standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      return;
    }

    // 2. Check iOS
    const userAgent = window.navigator.userAgent || "";
    const isAppleDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isAppleDevice);

    // 3. Listen for Chromium/Android install prompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 4. Pop up if not dismissed in this session
    const dismissed = sessionStorage.getItem("captain_install_prompt_dismissed");
    if (!dismissed) {
      // Small timeout so user sees the captain screen load before prompt appears
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsOpen(false);
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem("captain_install_prompt_dismissed", "true");
    setIsOpen(false);
  };

  if (!mounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-md w-[92vw] sm:w-full rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 text-zinc-900 dark:text-zinc-100 shadow-2xl">
        <DialogHeader className="items-center text-center space-y-3">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
            <MonitorSmartphone className="h-8 w-8 stroke-[1.75]" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
              ✓
            </span>
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Install Hanva Captain
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Install Captain on this device for instant full-screen tableside ordering, lightning-fast KOT punch, and offline reliability.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Theme Switching Option */}
        <div className="my-2 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Display Theme
              </span>
            </div>
            <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-300/50 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  resolvedTheme === "light"
                    ? "bg-white text-zinc-900 shadow-xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  resolvedTheme === "dark"
                    ? "bg-zinc-950 text-white shadow-xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>

        {/* iOS step-by-step instructions */}
        {showIosGuide && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 animate-in fade-in slide-in-from-top-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Share className="h-3.5 w-3.5" /> Tap Share in Safari
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              Tap the <strong>Share</strong> icon in the bottom Safari toolbar, scroll down, and select <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2">
          <Button
            onClick={handleInstallClick}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Install Captain App</span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full h-9 rounded-xl text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Continue in Browser
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
