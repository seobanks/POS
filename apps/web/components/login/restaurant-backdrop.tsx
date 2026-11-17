"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export function RestaurantBackdrop() {
  const prefersReduced = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (prefersReduced) return;
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse between -1 and 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReduced]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none -z-10"
    >
      {/* 1. Deep Atmospheric Vignette & Mood Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />

      {/* Warm Ambient Radial Lighting (Simulating warm brass chandelier glow) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full blur-3xl opacity-35 dark:opacity-25 transition-transform duration-700 ease-out"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(245, 158, 11, 0.45), rgba(217, 119, 6, 0.15), transparent 70%)",
          transform: `translate(calc(-50% + ${mousePos.x * 25}px), ${mousePos.y * 15}px)`,
        }}
      />

      {/* 2. Hanging Restaurant Pendant Lamps with Subtle Parallax */}
      <div className="absolute top-0 inset-x-0 flex justify-between px-6 sm:px-20 md:px-32 max-w-7xl mx-auto opacity-70 dark:opacity-60">
        {/* Left Pendant Lamp */}
        <motion.div
          animate={prefersReduced ? {} : { rotate: [-1.2, 1.2, -1.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top center" }}
          className="flex flex-col items-center"
        >
          {/* Wire */}
          <div className="w-[1.5px] h-24 sm:h-36 bg-gradient-to-b from-border/80 via-amber-700/60 to-amber-600/80" />
          {/* Brass Cap */}
          <div className="w-5 h-2.5 rounded-t-sm bg-gradient-to-b from-amber-700 to-amber-900 shadow-sm" />
          {/* Shade */}
          <div className="w-12 h-6 rounded-b-xl bg-gradient-to-b from-amber-900 to-amber-950 border border-amber-600/40 relative shadow-lg">
            {/* Bulb & Glow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-300 shadow-[0_0_24px_10px_rgba(251,191,36,0.6)] animate-pulse" />
          </div>
        </motion.div>

        {/* Center-Right Secondary Pendant Lamp */}
        <motion.div
          animate={prefersReduced ? {} : { rotate: [1.5, -1.5, 1.5] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{ transformOrigin: "top center" }}
          className="hidden md:flex flex-col items-center"
        >
          {/* Wire */}
          <div className="w-[1px] h-16 sm:h-28 bg-gradient-to-b from-border/70 via-amber-700/50 to-amber-600/70" />
          {/* Shade */}
          <div className="w-9 h-5 rounded-b-lg bg-gradient-to-b from-amber-900 to-amber-950 border border-amber-600/40 relative shadow-md">
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-300 shadow-[0_0_20px_8px_rgba(251,191,36,0.5)] animate-pulse" />
          </div>
        </motion.div>

        {/* Right Pendant Lamp */}
        <motion.div
          animate={prefersReduced ? {} : { rotate: [-1, 1.3, -1] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{ transformOrigin: "top center" }}
          className="flex flex-col items-center"
        >
          {/* Wire */}
          <div className="w-[1.5px] h-28 sm:h-44 bg-gradient-to-b from-border/80 via-amber-700/60 to-amber-600/80" />
          {/* Shade */}
          <div className="w-14 h-7 rounded-b-2xl bg-gradient-to-b from-amber-900 to-amber-950 border border-amber-600/40 relative shadow-lg">
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-amber-300 shadow-[0_0_28px_12px_rgba(251,191,36,0.6)] animate-pulse" />
          </div>
        </motion.div>
      </div>

      {/* 3. Background Restaurant Silhouettes: Dining Tables, Wine Bar & Steaming Cups */}
      <div className="absolute bottom-0 inset-x-0 h-44 sm:h-56 pointer-events-none opacity-30 dark:opacity-20 flex items-end justify-between px-4 sm:px-16 overflow-hidden">
        {/* Left Side: Dining Table with Wine Glasses & Candle */}
        <div className="hidden sm:flex flex-col items-center shrink-0">
          {/* Candle & Flame */}
          <div className="flex flex-col items-center mb-1">
            <motion.div
              animate={{ scale: [1, 1.25, 0.95, 1.15, 1], opacity: [0.8, 1, 0.7, 0.95, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-2 h-3.5 rounded-full bg-gradient-to-t from-amber-500 to-amber-200 shadow-[0_0_12px_4px_rgba(245,158,11,0.6)]"
            />
            <div className="w-1.5 h-4 bg-muted-foreground/50 rounded-sm" />
          </div>
          {/* Glasses */}
          <div className="flex gap-4 items-end mb-1">
            <div className="w-3 h-5 border-t border-x border-foreground/30 rounded-t-sm" />
            <div className="w-2.5 h-6 border-t border-x border-foreground/30 rounded-t-sm" />
          </div>
          {/* Table Top */}
          <div className="w-32 h-2.5 rounded-full bg-foreground/25" />
          {/* Pedestal & Base */}
          <div className="w-3 h-16 bg-foreground/20" />
          <div className="w-20 h-2 rounded-t-md bg-foreground/30" />
        </div>

        {/* Center: Animated Waiter Silhouette Moving Across the Background */}
        <motion.div
          animate={
            prefersReduced
              ? {}
              : {
                  x: ["-120%", "280%"],
                  opacity: [0, 0.8, 0.85, 0],
                }
          }
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "linear",
            delay: 2,
          }}
          className="absolute bottom-6 flex items-end gap-1.5"
        >
          {/* Waiter Figure Walking with Serving Tray */}
          <div className="flex flex-col items-center">
            {/* Tray with Cloche */}
            <div className="flex flex-col items-center -mb-0.5">
              <div className="w-3 h-1.5 rounded-t-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
              <div className="w-6 h-1 rounded-sm bg-foreground/60" />
            </div>
            {/* Head with Chef/Host Cap */}
            <div className="w-4 h-4 rounded-full bg-foreground/40 mb-0.5" />
            {/* Torso & Apron */}
            <div className="w-5 h-9 rounded-t-md bg-foreground/35 relative">
              {/* Arm holding tray */}
              <div className="absolute -top-1.5 -left-1.5 w-4 h-1.5 bg-foreground/45 rotate-[-30deg]" />
            </div>
            {/* Legs */}
            <div className="flex gap-1">
              <div className="w-1.5 h-8 bg-foreground/40 rounded-b-sm" />
              <div className="w-1.5 h-8 bg-foreground/40 rounded-b-sm" />
            </div>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/40 tracking-wider">order up</span>
        </motion.div>

        {/* Right Side: Artisan Coffee Machine / Cocktail Shaker Bar */}
        <div className="hidden md:flex flex-col items-center shrink-0">
          {/* Rising Steam */}
          <div className="flex gap-2 mb-1">
            <motion.div
              animate={{ y: [-2, -14], opacity: [0, 0.7, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
              className="w-1.5 h-4 rounded-full bg-foreground/30 blur-[0.5px]"
            />
            <motion.div
              animate={{ y: [-2, -18], opacity: [0, 0.8, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
              className="w-1.5 h-5 rounded-full bg-foreground/30 blur-[0.5px]"
            />
          </div>
          {/* Espresso Cups & Bottles */}
          <div className="flex gap-2 items-end mb-1">
            <div className="w-3 h-7 rounded-t-md bg-foreground/30" />
            <div className="w-4 h-9 rounded-t-md bg-foreground/35" />
            <div className="w-3.5 h-3 rounded-b-md bg-foreground/40" />
          </div>
          {/* Counter Shelf */}
          <div className="w-40 h-3 rounded-t-md bg-foreground/25 border-t border-foreground/30" />
          <div className="w-40 h-16 bg-foreground/15" />
        </div>
      </div>
    </div>
  );
}
