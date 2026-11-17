"use client";

import confetti from "canvas-confetti";

// Gourmet culinary confetti effects
export function triggerRecipeCompleteConfetti() {
  if (typeof window === "undefined") return;

  // Star and sparkle blast from left & right
  const count = 40;
  const defaults = {
    origin: { y: 0.65 },
    colors: ["#F59E0B", "#EF4444", "#10B981", "#FBBF24", "#F43F5E", "#FFFFFF"],
    disableForReducedMotion: true,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    shapes: ["star"],
    scalar: 1.2,
  });

  fire(0.2, {
    spread: 60,
    shapes: ["circle"],
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    shapes: ["circle"],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    shapes: ["star"],
  });
}

// Grand celebratory restaurant cannon (when clicking "Enter Dining Room")
export function triggerDiningRoomEntryConfetti() {
  if (typeof window === "undefined") return;

  const duration = 1.8 * 1000;
  const animationEnd = Date.now() + duration;

  const interval: ReturnType<typeof setInterval> = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 45 * (timeLeft / duration);

    // Left cannon
    confetti({
      particleCount,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.75 },
      colors: ["#F59E0B", "#D97706", "#FBBF24", "#FFFFFF", "#10B981"],
      shapes: ["circle", "star"],
      disableForReducedMotion: true,
    });

    // Right cannon
    confetti({
      particleCount,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.75 },
      colors: ["#F59E0B", "#D97706", "#FBBF24", "#FFFFFF", "#10B981"],
      shapes: ["circle", "star"],
      disableForReducedMotion: true,
    });
  }, 250);
}

// Small sparkle burst for service bell click
export function triggerBellSparkles(event?: React.MouseEvent) {
  if (typeof window === "undefined") return;

  let origin = { x: 0.5, y: 0.35 };
  if (event) {
    origin = {
      x: event.clientX / window.innerWidth,
      y: event.clientY / window.innerHeight,
    };
  }

  confetti({
    particleCount: 28,
    spread: 45,
    startVelocity: 28,
    origin,
    colors: ["#FBBF24", "#F59E0B", "#FDE68A", "#FFFFFF"],
    shapes: ["star"],
    scalar: 1.1,
    disableForReducedMotion: true,
  });
}
