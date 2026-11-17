"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Bell, Sparkles } from "lucide-react";
import { useCulinarySound } from "@/components/login/sound-effects";
import { triggerBellSparkles } from "@/components/login/confetti-effects";

interface DiningBellProps {
  onRing?: () => void;
}

export function DiningBell({ onRing }: DiningBellProps) {
  const { playBellRing } = useCulinarySound();
  const [ringsCount, setRingsCount] = useState(0);
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    setIsPressed(true);
    playBellRing();
    triggerBellSparkles(e);
    setRingsCount((c) => c + 1);
    if (onRing) onRing();
    setTimeout(() => setIsPressed(false), 200);
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Interactive Desk Service Bell */}
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        title="Ring Service Bell for Waiter"
        aria-label="Ring Service Bell for Waiter"
        className="group relative flex items-center justify-center p-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        {/* Glow pulse on hover */}
        <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Realistic SVG Brass Bell */}
        <svg viewBox="0 0 48 48" className="w-8 h-8 drop-shadow overflow-visible">
          {/* Base Plate */}
          <ellipse cx="24" cy="40" rx="19" ry="4" className="fill-amber-900/60 stroke-amber-950" strokeWidth="1" />
          <ellipse cx="24" cy="38" rx="17" ry="3.5" className="fill-gradient-to-r from-amber-600 via-amber-400 to-amber-700 fill-amber-500" />

          {/* Bell Dome */}
          <motion.path
            d="M9 36 C10 18, 38 18, 39 36 Z"
            animate={isPressed ? { scaleY: 0.88, y: 3 } : { scaleY: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="fill-gradient-to-b from-amber-300 via-amber-400 to-amber-600 fill-amber-400 stroke-amber-600"
            strokeWidth="1.2"
          />

          {/* Dome Specular Highlight */}
          <path
            d="M16 28 C18 22, 28 20, 32 24"
            className="stroke-amber-100 fill-none opacity-80"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Plunger / Button on Top */}
          <motion.g
            animate={isPressed ? { y: 4 } : { y: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 20 }}
          >
            <rect x="22" y="12" width="4" height="6" rx="1" className="fill-amber-700 stroke-amber-800" strokeWidth="0.8" />
            <ellipse cx="24" cy="12" rx="4.5" ry="2" className="fill-amber-200 stroke-amber-500" strokeWidth="0.8" />
          </motion.g>
        </svg>

        {/* Small Ring Hint Pill on Hover */}
        <span className="hidden sm:inline-block ml-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
          Ring Bell
        </span>
      </motion.button>

      {/* Floating ding feedback bubble */}
      {ringsCount > 0 && (
        <motion.div
          key={ringsCount}
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], y: -24, scale: 1 }}
          transition={{ duration: 1.2, times: [0, 0.2, 0.8, 1] }}
          className="pointer-events-none absolute -top-4 px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-lg flex items-center gap-1"
        >
          <span>Ding!</span>
          <Sparkles className="w-2.5 h-2.5" />
        </motion.div>
      )}
    </div>
  );
}
