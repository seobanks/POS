"use client";

import { motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { useCulinarySound } from "@/components/login/sound-effects";
import { cn } from "@/lib/utils";

interface SoundToggleProps {
  className?: string;
}

export function SoundToggle({ className }: SoundToggleProps) {
  const { isMuted, toggleMute } = useCulinarySound();

  return (
    <motion.button
      type="button"
      onClick={toggleMute}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isMuted ? "Unmute culinary sounds (pour, ice clink, bell)" : "Mute culinary sounds"}
      aria-label={isMuted ? "Unmute culinary sounds" : "Mute culinary sounds"}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shadow-xs backdrop-blur-xs select-none",
        isMuted
          ? "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
          : "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25",
        className,
      )}
    >
      {isMuted ? (
        <>
          <VolumeX className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Sound Off</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline text-[11px]">SFX On</span>
          {/* Subtle animated sound wave bars */}
          <div className="flex items-center gap-0.5 ml-0.5 h-2.5">
            <motion.span
              animate={{ height: ["30%", "100%", "40%"] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-0.5 rounded-full bg-amber-500"
            />
            <motion.span
              animate={{ height: ["80%", "20%", "90%"] }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
              className="w-0.5 rounded-full bg-amber-500"
            />
            <motion.span
              animate={{ height: ["40%", "90%", "30%"] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="w-0.5 rounded-full bg-amber-500"
            />
          </div>
        </>
      )}
    </motion.button>
  );
}
