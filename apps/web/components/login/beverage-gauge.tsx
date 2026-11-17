"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";
import { Sparkles, Cherry, CheckCircle2 } from "lucide-react";
import { useCulinarySound } from "@/components/login/sound-effects";
import { triggerRecipeCompleteConfetti } from "@/components/login/confetti-effects";

interface BeverageGaugeProps {
  progress: number; // 0 to 100
  flavor?: "mango" | "coffee" | "berry";
}

export function BeverageGauge({ progress, flavor = "mango" }: BeverageGaugeProps) {
  const prefersReduced = useReducedMotion();
  const { playIceClink, playCherryPop } = useCulinarySound();
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  // Track previous milestones to fire sound and confetti effects exactly once
  const prevProgressRef = useRef(0);
  const celebratedRef = useRef(false);

  // Interactive mouse slosh physics across the liquid surface
  const mouseSlosh = useMotionValue(0);
  const smoothSlosh = useSpring(mouseSlosh, { stiffness: 300, damping: 20 });
  const waveTilt = useTransform(smoothSlosh, [-1, 1], [-8, 8]);

  useEffect(() => {
    const prev = prevProgressRef.current;
    if (prev < 45 && clampedProgress >= 45) {
      playIceClink();
    }
    if (prev < 95 && clampedProgress >= 95 && !celebratedRef.current) {
      celebratedRef.current = true;
      playCherryPop();
      triggerRecipeCompleteConfetti();
    }
    if (clampedProgress < 90) {
      celebratedRef.current = false;
    }
    prevProgressRef.current = clampedProgress;
  }, [clampedProgress, playIceClink, playCherryPop]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normalizedX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    mouseSlosh.set(normalizedX * 2);
  };

  const handleMouseLeave = () => {
    mouseSlosh.set(0);
  };

  // Status message based on liquid level
  const statusMessage = useMemo(() => {
    if (clampedProgress === 0) return "Glass empty · Enter your username to pour";
    if (clampedProgress < 50) return "Pouring artisan beverage…";
    if (clampedProgress < 90) return "Adding cold ice & secret password blend…";
    return "Gourmet recipe complete! Ready to serve. ✨";
  }, [clampedProgress]);

  // Color schemes for liquid
  const colors = useMemo(() => {
    switch (flavor) {
      case "coffee":
        return {
          liquidPrimary: "fill-amber-900/90",
          liquidSecondary: "fill-amber-950/80",
          foam: "fill-[#F5E6D3]",
          glow: "rgba(120, 53, 15, 0.45)",
          accent: "text-amber-800",
        };
      case "berry":
        return {
          liquidPrimary: "fill-rose-500/85",
          liquidSecondary: "fill-rose-700/80",
          foam: "fill-pink-100",
          glow: "rgba(244, 63, 94, 0.45)",
          accent: "text-rose-500",
        };
      case "mango":
      default:
        return {
          liquidPrimary: "fill-amber-500/90",
          liquidSecondary: "fill-amber-600/80",
          foam: "fill-amber-100",
          glow: "rgba(245, 158, 11, 0.45)",
          accent: "text-amber-600",
        };
    }
  }, [flavor]);

  // Liquid height in SVG coordinates (glass bottom y=85, top y=25, height=60)
  const liquidY = 85 - (clampedProgress / 100) * 60;

  return (
    <div className="flex flex-col items-center select-none">
      {/* Visual Glass Container with Interactive Hover Slosh */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-24 h-28 flex items-center justify-center cursor-pointer group"
      >
        {/* Ambient Glass Glow */}
        <div
          className="absolute inset-2 rounded-full blur-xl opacity-50 transition-colors duration-500 -z-10 group-hover:opacity-75"
          style={{
            backgroundColor: clampedProgress > 20 ? colors.glow : "rgba(100, 116, 139, 0.15)",
          }}
        />

        <svg viewBox="0 0 100 110" className="w-full h-full overflow-visible">
          <defs>
            {/* Glass Clip Path to contain liquid inside tapered tumbler */}
            <clipPath id="tumblerClip">
              <path d="M28 24 L34 86 Q35 90 40 90 L60 90 Q65 90 66 86 L72 24 Z" />
            </clipPath>
          </defs>

          {/* 1. Glass Tumbler Outer Rim & Shadow */}
          <path
            d="M26 23 L33 87 Q35 93 40 93 L60 93 Q65 93 67 87 L74 23 Z"
            className="fill-card/40 stroke-border/70 dark:stroke-zinc-700"
            strokeWidth="2"
          />
          {/* Glass Base Pedestal */}
          <ellipse cx="50" cy="93" rx="14" ry="2.5" className="fill-muted-foreground/30" />

          {/* 2. Liquid Layer (Clipped to glass interior) */}
          <g clipPath="url(#tumblerClip)">
            {/* Background Liquid Wave */}
            <motion.path
              d={`M15 ${liquidY + 2} Q35 ${liquidY - 2} 50 ${liquidY + 2} T85 ${liquidY + 2} L85 95 L15 95 Z`}
              className={colors.liquidSecondary}
              style={{
                rotate: waveTilt,
                transformOrigin: `50px ${liquidY}px`,
              }}
              animate={
                prefersReduced
                  ? {}
                  : {
                      d: [
                        `M15 ${liquidY + 2} Q35 ${liquidY - 3} 50 ${liquidY + 2} T85 ${liquidY + 2} L85 95 L15 95 Z`,
                        `M15 ${liquidY + 2} Q35 ${liquidY + 3} 50 ${liquidY + 2} T85 ${liquidY + 2} L85 95 L15 95 Z`,
                        `M15 ${liquidY + 2} Q35 ${liquidY - 3} 50 ${liquidY + 2} T85 ${liquidY + 2} L85 95 L15 95 Z`,
                      ],
                    }
              }
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Foreground Liquid Wave */}
            <motion.path
              d={`M15 ${liquidY} Q35 ${liquidY + 3} 50 ${liquidY} T85 ${liquidY} L85 95 L15 95 Z`}
              className={colors.liquidPrimary}
              style={{
                rotate: waveTilt,
                transformOrigin: `50px ${liquidY}px`,
              }}
              animate={
                prefersReduced
                  ? {}
                  : {
                      d: [
                        `M15 ${liquidY} Q35 ${liquidY + 3} 50 ${liquidY} T85 ${liquidY} L85 95 L15 95 Z`,
                        `M15 ${liquidY} Q35 ${liquidY - 3} 50 ${liquidY} T85 ${liquidY} L85 95 L15 95 Z`,
                        `M15 ${liquidY} Q35 ${liquidY + 3} 50 ${liquidY} T85 ${liquidY} L85 95 L15 95 Z`,
                      ],
                    }
              }
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Rising Carbonation Fizz / Bubbles */}
            {clampedProgress > 15 && (
              <g className="fill-white/70">
                <motion.circle
                  cx="42"
                  cy="75"
                  r="1.8"
                  animate={{ y: [-2, -28], opacity: [0.8, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.circle
                  cx="56"
                  cy="80"
                  r="1.4"
                  animate={{ y: [-2, -32], opacity: [0.9, 0] }}
                  transition={{ duration: 2.3, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                />
                <motion.circle
                  cx="48"
                  cy="70"
                  r="2"
                  animate={{ y: [-2, -24], opacity: [0.7, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                />
              </g>
            )}

            {/* Floating Ice Cubes when progress >= 45% */}
            {clampedProgress >= 45 && (
              <g className="fill-white/40 stroke-white/60" strokeWidth="0.8">
                {/* Cube 1 with slight bobbing */}
                <motion.rect
                  x="38"
                  y={Math.max(liquidY + 4, 34)}
                  width="11"
                  height="11"
                  rx="2"
                  transform="rotate(12 43 40)"
                  animate={prefersReduced ? {} : { y: [-1, 1.5, -1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Cube 2 */}
                <motion.rect
                  x="52"
                  y={Math.max(liquidY + 8, 38)}
                  width="10"
                  height="10"
                  rx="2"
                  transform="rotate(-15 57 43)"
                  animate={prefersReduced ? {} : { y: [1.5, -1, 1.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              </g>
            )}

            {/* Velvety Cream Foam Cap when progress >= 70% */}
            {clampedProgress >= 70 && (
              <motion.path
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                d={`M25 ${liquidY} Q38 ${liquidY - 5} 50 ${liquidY - 2} Q62 ${liquidY - 5} 75 ${liquidY} L75 ${liquidY + 5} L25 ${liquidY + 5} Z`}
                className={colors.foam}
              />
            )}
          </g>

          {/* 3. Glass Specular Highlights */}
          <path
            d="M32 26 L37 84"
            className="stroke-white/40 fill-none"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* 4. Cherry on Top when 95%+ complete with bouncy spring entrance */}
          {clampedProgress >= 95 && (
            <motion.g
              initial={{ y: -30, scale: 0, opacity: 0 }}
              animate={{ y: liquidY - 2, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 450, damping: 14 }}
            >
              {/* Cherry Body */}
              <circle cx="50" cy="0" r="4.8" className="fill-red-600 stroke-red-800" strokeWidth="0.8" />
              <circle cx="48.5" cy="-1.5" r="1.2" className="fill-white/80" />
              {/* Stem */}
              <path
                d="M50 -4 Q58 -14 62 -12"
                className="fill-none stroke-amber-900"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </motion.g>
          )}

          {/* 5. Striped Straw */}
          <path
            d="M62 10 L54 85"
            className="stroke-red-500 fill-none opacity-80"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="4,4"
          />
        </svg>
      </motion.div>

      {/* Progress Metric & Status Text */}
      <div className="flex flex-col items-center gap-1 mt-1 text-center">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {clampedProgress >= 95 ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Recipe Ready (100%)
            </span>
          ) : (
            <span className="text-muted-foreground font-mono">
              Blending: {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground max-w-[180px] leading-tight">
          {statusMessage}
        </p>
      </div>
    </div>
  );
}
