"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";

interface InteractiveCard3DProps {
  children: React.ReactNode;
  className?: string;
}

export function InteractiveCard3D({ children, className }: InteractiveCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Mouse coordinates normalized -0.5 to 0.5
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for rotation
  const springConfig = { damping: 25, stiffness: 220 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // 3D rotations (gentle tilt: max ~4 degrees)
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);

  // Specular sheen light gradient position
  const sheenX = useTransform(smoothX, [-0.5, 0.5], ["0%", "100%"]);
  const sheenY = useTransform(smoothY, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      style={{ perspective: 1200 }}
      className="w-full flex justify-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        ref={cardRef}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={className}
      >
        {/* Subtle dynamic sheen reflection over the glass card */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-20 dark:opacity-10 mix-blend-overlay transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 350px at ${sheenX.get()} ${sheenY.get()}, rgba(255,255,255,0.8), transparent 70%)`,
          }}
        />
        {children}
      </motion.div>
    </div>
  );
}
