"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

interface TransitionPayload {
  userName?: string | null;
  destination: string;
}

type TransitionPhase = "idle" | "entering" | "holding" | "exiting";

interface LoginTransitionContextValue {
  isTransitioning: boolean;
  startLoginTransition: (payload: TransitionPayload) => void;
}

const LoginTransitionContext = createContext<LoginTransitionContextValue>({
  isTransitioning: false,
  startLoginTransition: () => {},
});

export function useLoginTransition() {
  return useContext(LoginTransitionContext);
}

function getFirstName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] || null;
}

export function LoginTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [payload, setPayload] = useState<TransitionPayload | null>(null);

  const startedAtRef = useRef<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const triggerExit = useCallback(() => {
    setPhase((current) => {
      if (current === "idle" || current === "exiting") return current;
      return "exiting";
    });
    const exitDuration = prefersReducedMotion ? 220 : 580;
    schedule(() => {
      setPhase("idle");
      setPayload(null);
    }, exitDuration);
  }, [prefersReducedMotion, schedule]);

  const startLoginTransition = useCallback(
    (nextPayload: TransitionPayload) => {
      clearTimers();
      startedAtRef.current = Date.now();
      setPayload(nextPayload);
      setPhase("entering");

      const navigateDelay = prefersReducedMotion ? 160 : 520;
      schedule(() => {
        setPhase("holding");
        router.replace(nextPayload.destination);
      }, navigateDelay);

      // Hard fallback: if client navigation somehow stalls while still on /login,
      // fall back to full navigation so the user is never stuck.
      schedule(() => {
        if (typeof window !== "undefined" && window.location.pathname === "/login") {
          window.location.href = nextPayload.destination;
        } else {
          triggerExit();
        }
      }, 2400);
    },
    [clearTimers, prefersReducedMotion, router, schedule, triggerExit],
  );

  // As soon as the route actually changes away from /login, finish the minimum
  // visual beat and smoothly lift the curtain to reveal the live dashboard.
  useEffect(() => {
    if ((phase === "entering" || phase === "holding") && pathname && pathname !== "/login") {
      const elapsed = Date.now() - startedAtRef.current;
      const minDisplayMs = prefersReducedMotion ? 280 : 960;
      const remaining = Math.max(120, minDisplayMs - elapsed);
      const id = schedule(() => {
        triggerExit();
      }, remaining);
      return () => clearTimeout(id);
    }
  }, [phase, pathname, prefersReducedMotion, schedule, triggerExit]);

  const isTransitioning = phase !== "idle";
  const firstName = getFirstName(payload?.userName);
  const isCaptainDest = payload?.destination?.startsWith("/captain");

  return (
    <LoginTransitionContext.Provider value={{ isTransitioning, startLoginTransition }}>
      {children}

      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            key="hanva-login-curtain"
            aria-live="polite"
            role="status"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { clipPath: "circle(0% at 74% 56%)", opacity: 1 }
            }
            animate={
              phase === "exiting"
                ? prefersReducedMotion
                  ? { opacity: 0 }
                  : {
                      clipPath: "circle(150% at 50% 50%)",
                      y: "-104%",
                      opacity: 1,
                    }
                : prefersReducedMotion
                  ? { opacity: 1 }
                  : {
                      clipPath: "circle(150% at 50% 50%)",
                      y: "0%",
                      opacity: 1,
                    }
            }
            transition={
              phase === "exiting"
                ? { duration: prefersReducedMotion ? 0.2 : 0.56, ease: [0.76, 0, 0.24, 1] }
                : { duration: prefersReducedMotion ? 0.18 : 0.52, ease: [0.22, 1, 0.36, 1] }
            }
            className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none ${
              phase === "exiting" ? "pointer-events-none" : "pointer-events-auto"
            }`}
            style={{
              background:
                "linear-gradient(145deg, #06152B 0%, #0D2D5A 48%, #1565C0 100%)",
            }}
          >
            {/* Ambient radial glow layers */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-[#60A5FA]/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-40 -left-32 h-[460px] w-[460px] rounded-full bg-[#38BDF8]/15 blur-3xl"
            />

            {/* Subtle architectural grid texture */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Center Emblem & Welcome Choreography */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9, y: 14 }}
              animate={
                phase === "exiting"
                  ? { opacity: 0, scale: 1.06, y: -18 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              transition={{
                duration: phase === "exiting" ? 0.26 : 0.42,
                delay: phase === "exiting" ? 0 : 0.14,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative z-10 flex flex-col items-center text-center px-6"
            >
              {/* Luminous Ring + Hanva White Logo */}
              <div className="relative flex h-28 w-28 items-center justify-center">
                {/* Soft expanding pulse halo */}
                {!prefersReducedMotion && (
                  <motion.div
                    initial={{ scale: 0.75, opacity: 0.6 }}
                    animate={{ scale: 1.38, opacity: 0 }}
                    transition={{ duration: 1.15, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-[#60A5FA]/50"
                  />
                )}

                {/* Glass badge backing */}
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/25 shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
                  <Image
                    src="/hanva-logo-white.png"
                    alt="Hanva Technologies"
                    width={62}
                    height={62}
                    priority
                    unoptimized
                    className="h-[62px] w-[62px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
                  />

                  {/* Orbiting sheen SVG arc */}
                  {!prefersReducedMotion && (
                    <motion.svg
                      viewBox="0 0 100 100"
                      className="pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)]"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="47"
                        fill="none"
                        stroke="url(#hanvaOrbitGrad)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="78 220"
                      />
                      <defs>
                        <linearGradient id="hanvaOrbitGrad" x1="0" y1="0" x2="100" y2="100">
                          <stop offset="0%" stopColor="#93C5FD" />
                          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                    </motion.svg>
                  )}

                  {/* Verified Check Pill */}
                  <motion.span
                    initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 20,
                      delay: 0.24,
                    }}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_6px_18px_rgba(16,185,129,0.55)] ring-3 ring-[#0D2D5A]"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                  </motion.span>
                </div>
              </div>

              {/* Greeting Text */}
              <motion.h2
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.2 }}
                className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm"
              >
                {firstName ? `Welcome back, ${firstName}` : "Welcome Back"}
              </motion.h2>

              <motion.p
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: 0.28 }}
                className="mt-2 text-sm font-medium text-blue-100/85"
              >
                {isCaptainDest
                  ? "Opening Captain Service Terminal…"
                  : "Opening your Restaurant Dashboard…"}
              </motion.p>

              {/* Sleek Loading Progress Bar */}
              <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
                  className="h-full w-full rounded-full bg-gradient-to-r from-[#60A5FA] via-[#38BDF8] to-white"
                />
              </div>

              <p className="mt-5 text-[11px] font-semibold tracking-[0.16em] uppercase text-blue-200/60">
                HANVA TECHNOLOGIES &middot; POS SUITE
              </p>
            </motion.div>

            {/* Curved translucent wave along the bottom trailing edge of the curtain */}
            <svg
              aria-hidden="true"
              viewBox="0 0 1440 80"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 sm:h-16 w-full opacity-25"
            >
              <path
                d="M0 40C360 85 720 0 1080 42C1260 63 1368 50 1440 36V80H0V40Z"
                fill="#93C5FD"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </LoginTransitionContext.Provider>
  );
}
