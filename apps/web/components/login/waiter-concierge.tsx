"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sparkles, Utensils } from "lucide-react";
import { useCulinarySound } from "@/components/login/sound-effects";

export type WaiterMood =
  | "idle"
  | "username"
  | "password"
  | "submitting"
  | "error"
  | "success";

interface WaiterConciergeProps {
  mood: WaiterMood;
  isPasswordVisible?: boolean;
  charCount?: number;
  bellRingsCount?: number;
}

export function WaiterConcierge({
  mood,
  isPasswordVisible = false,
  charCount = 0,
  bellRingsCount = 0,
}: WaiterConciergeProps) {
  const prefersReduced = useReducedMotion();
  const { playWhoosh, playBellRing } = useCulinarySound();
  const prevVisibleRef = useRef(isPasswordVisible);
  const prevMoodRef = useRef(mood);
  const [isWinking, setIsWinking] = useState(false);
  const [clickedReaction, setClickedReaction] = useState(false);

  // Play napkin rustle / whoosh when password focus changes or visibility toggles
  useEffect(() => {
    if (mood === "password" && prevMoodRef.current !== "password") {
      playWhoosh();
    }
    if (prevVisibleRef.current !== isPasswordVisible && mood === "password") {
      playWhoosh();
    }
    prevVisibleRef.current = isPasswordVisible;
    prevMoodRef.current = mood;
  }, [mood, isPasswordVisible, playWhoosh]);

  // Periodic natural blink
  useEffect(() => {
    if (mood === "password") return;
    const interval = setInterval(() => {
      setIsWinking(true);
      setTimeout(() => setIsWinking(false), 220);
    }, 4500);
    return () => clearInterval(interval);
  }, [mood]);

  // Eye gaze direction based on character count when typing username
  const gazeX = useMemo(() => {
    if (mood !== "username") return 0;
    // Map character count 0..25 to -4.5px .. 4.5px
    const clamped = Math.min(Math.max(charCount, 0), 25);
    return (clamped / 25) * 9 - 4.5;
  }, [mood, charCount]);

  // Speech bubble prompt text
  const speechText = useMemo(() => {
    if (clickedReaction) return "Yes, Chef! Service is ready. ✨";
    if (bellRingsCount > 0 && bellRingsCount % 2 === 1) return "Right away, table reserved! 🛎️";
    switch (mood) {
      case "username":
        return "Welcome to service! Enter your staff ID or email.";
      case "password":
        return isPasswordVisible
          ? "Peeking at your secret code! 👀"
          : "Discretion guaranteed! Eyes covered. 🙈";
      case "submitting":
        return "Sending KOT ticket to kitchen… 🍳";
      case "error":
        return "Credentials not found in ledger. Try again!";
      case "success":
        return "Table ready! Enjoy your service. 🍷";
      case "idle":
      default:
        return "The Grand Concierge is ready to seat you.";
    }
  }, [mood, isPasswordVisible, clickedReaction, bellRingsCount]);

  const handleMascotClick = () => {
    setClickedReaction(true);
    playWhoosh();
    setTimeout(() => setClickedReaction(false), 2000);
  };

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Speech Bubble Pill */}
      <motion.div
        key={speechText}
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="mb-3 px-3 py-1 rounded-full bg-card/90 border border-amber-500/30 text-[11px] font-medium text-amber-700 dark:text-amber-300 shadow-sm flex items-center gap-1.5 backdrop-blur-xs text-center"
      >
        <Sparkles className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
        <span>{speechText}</span>
      </motion.div>

      {/* Interactive Stylized Waiter Character Mascot (SVG) */}
      <motion.div
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleMascotClick}
        title="Click Maitre D' for a greeting"
        className="relative w-28 h-28 flex items-center justify-center cursor-pointer group"
      >
        {/* Ambient Halo Glow */}
        <div className="absolute inset-2 rounded-full bg-amber-500/10 blur-xl -z-10 group-hover:bg-amber-500/20 transition-colors" />

        <svg
          viewBox="0 0 120 120"
          className="w-full h-full drop-shadow-md overflow-visible"
        >
          {/* 1. Waiter Chef Hat (Toque Blanche) with Spring Bob */}
          <motion.g
            animate={
              clickedReaction
                ? { y: [-6, 2, 0], rotate: [-8, 6, 0] }
                : mood === "submitting"
                  ? { y: [-2, 2, -2] }
                  : mood === "error"
                    ? { rotate: [-4, 4, -4] }
                    : { y: 0 }
            }
            transition={{
              duration: clickedReaction ? 0.5 : 0.6,
              repeat: clickedReaction ? 0 : Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Hat Puffs */}
            <path
              d="M38 34 C35 22, 50 16, 60 18 C70 16, 85 22, 82 34 Z"
              className="fill-white dark:fill-zinc-100 stroke-zinc-400 dark:stroke-zinc-300"
              strokeWidth="2"
            />
            <path
              d="M48 24 C54 18, 66 18, 72 24"
              className="stroke-zinc-300 dark:stroke-zinc-400 fill-none"
              strokeWidth="1.5"
            />
            {/* Hat Band with Gold Trim */}
            <rect
              x="42"
              y="32"
              width="36"
              height="7"
              rx="1.5"
              className="fill-amber-500 stroke-amber-600"
              strokeWidth="1"
            />
          </motion.g>

          {/* 2. Head / Face */}
          <g>
            <circle
              cx="60"
              cy="52"
              r="22"
              className="fill-[#FCE7D2] dark:fill-[#ECC8A8] stroke-[#E0B28C]"
              strokeWidth="1.5"
            />
            {/* Rosy Cheeks */}
            <circle cx="46" cy="56" r="3.5" className="fill-rose-400/40" />
            <circle cx="74" cy="56" r="3.5" className="fill-rose-400/40" />

            {/* Eyes Section */}
            {mood === "password" && !isPasswordVisible ? (
              /* Eyes tightly closed / squinting happily */
              <g className="stroke-zinc-800 dark:stroke-zinc-900" strokeWidth="2.5" strokeLinecap="round">
                <path d="M48 49 Q51 46 54 49" fill="none" />
                <path d="M66 49 Q69 46 72 49" fill="none" />
              </g>
            ) : mood === "password" && isPasswordVisible ? (
              /* Peeking wide eyes */
              <g>
                <circle cx="51" cy="48" r="4.5" className="fill-white stroke-zinc-700" strokeWidth="1" />
                <circle cx="69" cy="48" r="4.5" className="fill-white stroke-zinc-700" strokeWidth="1" />
                <circle cx="51" cy="49" r="2.2" className="fill-zinc-900" />
                <circle cx="69" cy="49" r="2.2" className="fill-zinc-900" />
              </g>
            ) : isWinking ? (
              /* Playful blink */
              <g className="stroke-zinc-800 dark:stroke-zinc-900" strokeWidth="2.2" strokeLinecap="round">
                <path d="M47 49 Q51 46 55 49" fill="none" />
                <path d="M65 49 Q69 46 73 49" fill="none" />
              </g>
            ) : (
              /* Normal Interactive Eyes (following text input horizontally) */
              <motion.g animate={{ x: gazeX }} transition={{ type: "spring", stiffness: 350, damping: 20 }}>
                {/* Left Eye */}
                <circle cx="51" cy="48" r="4" className="fill-white stroke-zinc-600 dark:stroke-zinc-800" strokeWidth="0.8" />
                <circle cx="51" cy="48.5" r="2" className="fill-zinc-900" />
                <circle cx="50" cy="47.5" r="0.8" className="fill-white" />

                {/* Right Eye */}
                <circle cx="69" cy="48" r="4" className="fill-white stroke-zinc-600 dark:stroke-zinc-800" strokeWidth="0.8" />
                <circle cx="69" cy="48.5" r="2" className="fill-zinc-900" />
                <circle cx="68" cy="47.5" r="0.8" className="fill-white" />
              </motion.g>
            )}

            {/* Dapper Mustache / Smile */}
            <path
              d="M54 58 Q60 62 66 58"
              className="fill-none stroke-zinc-800 dark:stroke-zinc-900"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Small Petite Mustache */}
            <motion.path
              animate={charCount > 0 ? { rotate: [-2, 2, -2] } : { rotate: 0 }}
              transition={{ duration: 0.3, repeat: charCount > 0 ? 2 : 0 }}
              style={{ transformOrigin: "60px 56px" }}
              d="M52 56 Q56 54 60 56 Q64 54 68 56"
              className="fill-none stroke-amber-950 dark:stroke-amber-900"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>

          {/* 3. Torso: Tuxedo Vest & Bow Tie */}
          <g>
            {/* White Collar Shirt */}
            <polygon points="50,72 70,72 60,82" className="fill-white" />
            {/* Vest Body */}
            <path
              d="M40 73 L50 72 L60 84 L70 72 L80 73 L82 105 L38 105 Z"
              className="fill-zinc-900 dark:fill-zinc-950 stroke-zinc-700"
              strokeWidth="1.5"
            />
            {/* Red / Amber Bow Tie */}
            <polygon points="55,73 65,73 60,76" className="fill-amber-600" />
            <polygon points="55,79 65,79 60,76" className="fill-amber-600" />
            <circle cx="60" cy="76" r="2.2" className="fill-amber-700" />
            {/* Vest Brass Buttons */}
            <circle cx="60" cy="88" r="1.5" className="fill-amber-400" />
            <circle cx="60" cy="96" r="1.5" className="fill-amber-400" />
          </g>

          {/* 4. Arms & Hands with Service Towel */}
          {mood === "password" && !isPasswordVisible ? (
            /* Hands covering eyes with white linen towel */
            <motion.g
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
            >
              {/* White Cloth Napkin draped across face */}
              <rect
                x="34"
                y="41"
                width="52"
                height="15"
                rx="6"
                className="fill-white stroke-zinc-300 dark:stroke-zinc-500 shadow-lg"
                strokeWidth="1.5"
              />
              <path
                d="M40 48 L80 48"
                className="stroke-amber-500/40 fill-none"
                strokeDasharray="2,2"
                strokeWidth="1"
              />
              {/* Two cartoon hands holding towel */}
              <circle cx="36" cy="48" r="5" className="fill-[#FCE7D2] stroke-[#E0B28C]" strokeWidth="1" />
              <circle cx="84" cy="48" r="5" className="fill-[#FCE7D2] stroke-[#E0B28C]" strokeWidth="1" />
            </motion.g>
          ) : mood === "password" && isPasswordVisible ? (
            /* Hands slightly lowered, peeking over napkin */
            <motion.g
              initial={{ y: 0 }}
              animate={{ y: 8 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
            >
              <rect
                x="36"
                y="48"
                width="48"
                height="12"
                rx="5"
                className="fill-white stroke-zinc-300 dark:stroke-zinc-500"
                strokeWidth="1.5"
              />
              <circle cx="38" cy="54" r="4.5" className="fill-[#FCE7D2] stroke-[#E0B28C]" strokeWidth="1" />
              <circle cx="82" cy="54" r="4.5" className="fill-[#FCE7D2] stroke-[#E0B28C]" strokeWidth="1" />
            </motion.g>
          ) : (
            /* Normal Waiter Arms: Holding silver platter tray on left */
            <g>
              {/* Left Arm holding silver tray */}
              <motion.path
                animate={clickedReaction ? { d: "M40 76 Q30 70 25 65" } : { d: "M40 76 Q30 84 25 80" }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="fill-none stroke-zinc-900 dark:stroke-zinc-950"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* Silver Serving Tray / Cloche */}
              <motion.g
                animate={clickedReaction ? { y: -12 } : { y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <ellipse
                  cx="22"
                  cy="76"
                  rx="14"
                  ry="3.5"
                  className="fill-zinc-300 dark:fill-zinc-400 stroke-zinc-500"
                  strokeWidth="1"
                />
                {/* Golden Cloche Dome */}
                <path
                  d="M13 75 C13 65, 31 65, 31 75 Z"
                  className="fill-amber-400/90 stroke-amber-600"
                  strokeWidth="1"
                />
                <circle cx="22" cy="65" r="1.8" className="fill-amber-600" />
              </motion.g>

              {/* Right Arm with Folded White Napkin */}
              <path
                d="M80 76 Q90 85 86 94"
                className="fill-none stroke-zinc-900 dark:stroke-zinc-950"
                strokeWidth="5"
                strokeLinecap="round"
              />
              {/* White Napkin folded over right arm */}
              <path
                d="M84 84 L93 86 L91 103 L83 100 Z"
                className="fill-white stroke-zinc-300"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      </motion.div>
    </div>
  );
}
