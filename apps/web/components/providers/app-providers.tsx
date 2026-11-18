"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { I18nProvider } from "@/lib/i18n/context";
import { Toaster } from "@/components/ui/sonner";
import { LoginTransitionProvider } from "@/components/providers/login-transition";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, retry: 1 },
        },
      }),
  );

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw-pos.js")
          .then((registration) => {
            registration.update();
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
            registration.addEventListener("updatefound", () => {
              const installing = registration.installing;
              if (installing) {
                installing.addEventListener("statechange", () => {
                  if (installing.state === "installed" && navigator.serviceWorker.controller) {
                    installing.postMessage({ type: "SKIP_WAITING" });
                  }
                });
              }
            });
          })
          .catch((err) => console.warn("[SW] Registration skipped or failed:", err));

        // When a new service worker takes over and purges old cache versions
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[SW] Controller changed to new version.");
        });
      });
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <LoginTransitionProvider>
            {children}
          </LoginTransitionProvider>
          <Toaster />
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
