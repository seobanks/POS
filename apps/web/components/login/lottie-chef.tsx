"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { DotLottie } from "@lottiefiles/dotlottie-web";
import { ChefHat, Flame, Sparkles } from "lucide-react";
import { useCulinarySound } from "@/components/login/sound-effects";

interface LottieChefStationProps {
  progress?: number;
}

export function LottieChefStation({ progress = 0 }: LottieChefStationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotLottieRef = useRef<DotLottie | null>(null);
  const [isLottieReady, setIsLottieReady] = useState(false);
  const { playIceClink, playCherryPop } = useCulinarySound();

  useEffect(() => {
    if (!canvasRef.current || typeof window === "undefined") return;

    try {
      // Initialize DotLottie player on canvas
      const dotLottie = new DotLottie({
        canvas: canvasRef.current,
        // High quality chef cooking & food celebration animation from LottieFiles CDN
        src: "https://assets9.lottiefiles.com/packages/lf20_tll0j46n.json",
        autoplay: true,
        loop: true,
      });

      dotLottie.addEventListener("load", () => {
        setIsLottieReady(true);
      });

      dotLottieRef.current = dotLottie;

      return () => {
        try {
          dotLottie.destroy();
        } catch {
          // ignore cleanup errors
        }
      };
    } catch {
      // Fallback gracefully to animated vector stage
      setIsLottieReady(false);
    }
  }, []);

  const handleInteract = () => {
    playIceClink();
    if (dotLottieRef.current) {
      if (dotLottieRef.current.isPlaying) {
        dotLottieRef.current.setSpeed(1.6);
        setTimeout(() => dotLottieRef.current?.setSpeed(1.0), 1200);
      }
    }
  };

  return (
    <div className="flex flex-col items-center select-none">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleInteract}
        className="relative w-24 h-28 flex items-center justify-center cursor-pointer group"
      >
        {/* Ambient Warm Kitchen Flame Glow */}
        <div className="absolute inset-1 rounded-full bg-amber-500/20 blur-xl opacity-60 group-hover:opacity-90 group-hover:bg-orange-500/30 transition-all duration-300 -z-10" />

        {/* 1. DotLottie Canvas Rendering Target */}
        <canvas
          ref={canvasRef}
          width={96}
          height={110}
          className={`w-full h-full object-contain ${isLottieReady ? "block" : "hidden"}`}
        />

        {/* 2. Resilient Vector Culinary Stage (Active while loading or if offline) */}
        {!isLottieReady && (
          <svg viewBox="0 0 100 110" className="w-full h-full overflow-visible">
            {/* Rising Savory Kitchen Steam */}
            <g className="stroke-amber-400/60 dark:stroke-amber-300/60 fill-none" strokeWidth="1.5" strokeLinecap="round">
              <motion.path
                d="M44 38 Q42 28 46 20 Q50 14 46 8"
                animate={{ y: [-2, -8], opacity: [0.2, 0.9, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.path
                d="M52 38 Q56 28 52 20 Q48 14 52 8"
                animate={{ y: [-2, -10], opacity: [0.3, 0.95, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
              <motion.path
                d="M60 38 Q58 28 62 20 Q66 14 62 8"
                animate={{ y: [-2, -8], opacity: [0.2, 0.85, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 0.9 }}
              />
            </g>

            {/* Sizzling Gourmet Cast-Iron Skillet */}
            <ellipse cx="50" cy="65" rx="32" ry="12" className="fill-zinc-800 dark:fill-zinc-900 stroke-zinc-700" strokeWidth="2" />
            <ellipse cx="50" cy="64" rx="28" ry="9" className="fill-amber-600/30" />

            {/* Sizzling food ingredients inside skillet */}
            <motion.circle
              cx="42"
              cy="64"
              r="4"
              className="fill-amber-500"
              animate={{ y: [-1, 1, -1] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
            <motion.circle
              cx="58"
              cy="65"
              r="3.5"
              className="fill-rose-500"
              animate={{ y: [1, -1, 1] }}
              transition={{ duration: 0.45, repeat: Infinity, delay: 0.1 }}
            />
            <motion.circle
              cx="50"
              cy="62"
              r="3"
              className="fill-emerald-500"
              animate={{ y: [-0.8, 0.8, -0.8] }}
              transition={{ duration: 0.38, repeat: Infinity, delay: 0.2 }}
            />

            {/* Skillet Brass Handle */}
            <path
              d="M18 65 L4 62"
              className="stroke-amber-700 fill-none"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Stove Burner Flame Ring */}
            <g className="fill-amber-500/80">
              <motion.polygon
                points="40,78 44,72 48,78"
                animate={{ scaleY: [1, 1.4, 0.9, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              <motion.polygon
                points="48,79 52,70 56,79"
                animate={{ scaleY: [1.2, 0.9, 1.5, 1.2] }}
                transition={{ duration: 0.45, repeat: Infinity, delay: 0.1 }}
              />
              <motion.polygon
                points="56,78 60,73 64,78"
                animate={{ scaleY: [0.9, 1.3, 1, 0.9] }}
                transition={{ duration: 0.52, repeat: Infinity, delay: 0.2 }}
              />
            </g>
          </svg>
        )}
      </motion.div>

      {/* Station Subtitle */}
      <div className="flex flex-col items-center gap-1 mt-1 text-center">
        <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
          <span>Hot Kitchen Station</span>
        </div>
        <p className="text-[11px] text-muted-foreground max-w-[180px] leading-tight">
          Sizzling KOT orders & DotLottie culinary engine
        </p>
      </div>
    </div>
  );
}
