"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Box, Sparkles } from "lucide-react";
import { useCulinarySound } from "@/components/login/sound-effects";

// Dynamically import Spline to prevent SSR / WebGL execution on the server
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

export function Spline3DStage() {
  const [hasSplineLoaded, setHasSplineLoaded] = useState(false);
  const [splineError, setSplineError] = useState(false);
  const { playIceClink } = useCulinarySound();

  // 3D Gyroscope / Mouse tracking for the 3D stage
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 200, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 200, damping: 20 });

  const rotateY = useTransform(springX, [-0.5, 0.5], [-24, 24]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [20, -20]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="flex flex-col items-center select-none">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={playIceClink}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: 800 }}
        className="relative w-24 h-28 flex items-center justify-center cursor-pointer group"
      >
        {/* Ambient 3D Light Glow */}
        <div className="absolute inset-1 rounded-full bg-indigo-500/15 blur-xl opacity-60 group-hover:opacity-90 transition-all -z-10" />

        {/* 1. Spline 3D Scene Viewport (Dynamic WebGL) */}
        {!splineError && (
          <div className={`absolute inset-0 w-full h-full overflow-hidden rounded-2xl ${hasSplineLoaded ? "block" : "hidden"}`}>
            <Spline
              scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
              onLoad={() => setHasSplineLoaded(true)}
              onError={() => setSplineError(true)}
            />
          </div>
        )}

        {/* 2. Interactive 3D CSS Perspective Cloche (Active during load or fallback) */}
        {(!hasSplineLoaded || splineError) && (
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            className="w-full h-full flex items-center justify-center"
          >
            <svg viewBox="0 0 100 110" className="w-full h-full overflow-visible">
              {/* 3D Pedestal Base */}
              <ellipse cx="50" cy="82" rx="34" ry="10" className="fill-zinc-300 dark:fill-zinc-800 stroke-zinc-400 dark:stroke-zinc-700" strokeWidth="1.5" />
              <ellipse cx="50" cy="80" rx="30" ry="8" className="fill-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-300 fill-zinc-200 dark:fill-zinc-700" />

              {/* 3D Polished Cloche Dome */}
              <motion.path
                d="M24 76 C24 38, 76 38, 76 76 Z"
                className="fill-amber-400 stroke-amber-600 dark:stroke-amber-500"
                strokeWidth="2"
              />

              {/* Cloche 3D Specular Highlight */}
              <path
                d="M32 60 C36 44, 60 42, 68 56"
                className="stroke-amber-100 fill-none opacity-80"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* 3D Gold Finial Ring Handle */}
              <circle cx="50" cy="36" r="4.5" className="fill-amber-300 stroke-amber-600" strokeWidth="1.5" />
              <circle cx="50" cy="36" r="2" className="fill-background" />

              {/* Floating Sparkles in 3D Space */}
              <motion.circle
                cx="30"
                cy="32"
                r="1.8"
                className="fill-amber-300"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <motion.circle
                cx="72"
                cy="36"
                r="1.5"
                className="fill-amber-300"
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
              />
            </svg>
          </motion.div>
        )}
      </motion.div>

      <div className="flex flex-col items-center gap-1 mt-1 text-center">
        <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <Box className="w-3.5 h-3.5 text-indigo-500" />
          <span>Spline 3D Stage</span>
        </div>
        <p className="text-[11px] text-muted-foreground max-w-[180px] leading-tight">
          Spatial 3D depth, gyro tilt & WebGL rendering
        </p>
      </div>
    </div>
  );
}
