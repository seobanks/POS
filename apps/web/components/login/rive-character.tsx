"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Rive, Alignment, Fit, Layout } from "@rive-app/canvas";
import { Award } from "lucide-react";
import { useCulinarySound } from "@/components/login/sound-effects";

export function RiveConciergeBadge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveRef = useRef<Rive | null>(null);
  const [isRiveReady, setIsRiveReady] = useState(false);
  const { playWhoosh } = useCulinarySound();

  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined") return;

    try {
      const rive = new Rive({
        src: "https://cdn.rive.app/animations/vehicles.riv",
        canvas: canvasRef.current,
        autoplay: true,
        layout: new Layout({
          fit: Fit.Contain,
          alignment: Alignment.Center,
        }),
        onLoad: () => {
          setIsRiveReady(true);
        },
        onLoadError: () => {
          setIsRiveReady(false);
        },
      });

      riveRef.current = rive;

      return () => {
        try {
          rive.cleanup();
        } catch {
          // ignore cleanup errors
        }
      };
    } catch {
      setIsRiveReady(false);
    }
  }, []);

  const handleClick = () => {
    playWhoosh();
  };

  return (
    <div className="flex flex-col items-center select-none">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className="relative w-24 h-28 flex items-center justify-center cursor-pointer group"
      >
        <div className="absolute inset-1 rounded-full bg-blue-500/15 blur-xl opacity-60 group-hover:opacity-90 transition-all -z-10" />

        {/* 1. Rive WASM Canvas Target */}
        <canvas
          ref={canvasRef}
          width={96}
          height={110}
          className={`w-full h-full object-contain ${isRiveReady ? "block" : "hidden"}`}
        />

        {/* 2. Resilient Vector Medal / Cloche (if offline or loading) */}
        {!isRiveReady && (
          <svg viewBox="0 0 100 110" className="w-full h-full overflow-visible">
            {/* Michelin Star & Gold Service Ribbon */}
            <g className="fill-amber-500 stroke-amber-600" strokeWidth="1">
              <circle cx="50" cy="50" r="26" className="fill-amber-400/90 shadow-md" />
              <circle cx="50" cy="50" r="21" className="fill-amber-500/20 stroke-amber-300" strokeDasharray="3,2" />
            </g>

            {/* Service Fork & Knife Emblems */}
            <path
              d="M44 40 L44 60 M41 40 L41 48 Q44 50 44 52"
              className="stroke-amber-950 fill-none"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M56 40 L56 60 Q53 48 56 42 Z"
              className="fill-amber-950 stroke-amber-950"
              strokeWidth="1.5"
            />

            {/* Five Golden Michelin Rating Stars */}
            <g className="fill-amber-300">
              <polygon points="50,28 52,32 56,33 53,36 54,40 50,38 46,40 47,36 44,33 48,32" />
            </g>

            {/* Bottom Silk Ribbons */}
            <polygon points="40,74 34,94 44,88 50,94 48,74" className="fill-rose-600 stroke-rose-700" strokeWidth="0.8" />
            <polygon points="60,74 66,94 56,88 50,94 52,74" className="fill-rose-600 stroke-rose-700" strokeWidth="0.8" />
          </svg>
        )}
      </motion.div>

      <div className="flex flex-col items-center gap-1 mt-1 text-center">
        <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <Award className="w-3.5 h-3.5 text-blue-500" />
          <span>Rive State Engine</span>
        </div>
        <p className="text-[11px] text-muted-foreground max-w-[180px] leading-tight">
          Interactive character rigging & WASM state machine
        </p>
      </div>
    </div>
  );
}
