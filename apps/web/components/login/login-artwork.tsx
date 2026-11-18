"use client";

import React from "react";

export function ChefHatOutline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M17 31C11.5 30.5 7.5 25.8 8.2 20.2C8.8 15.2 13.1 11.7 18 12C20.2 6.8 25.5 3.5 31.5 4.2C36.6 4.8 40.7 8.4 42.1 13.2C47.1 13 51.4 16.9 51.6 22C51.8 27.1 47.9 31.3 42.8 31.8L40.5 46.5C40.3 48 39 49 37.5 49H18.5C17 49 15.8 47.9 15.6 46.4L14.2 35.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.4 40.5H41.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M23.5 34.5V40.5M30 33.5V40.5M36.5 34.5V40.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function BlueSwooshUnderline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hanvaSwoosh" x1="0" y1="9" x2="220" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.15" />
          <stop offset="35%" stopColor="#3B82F6" />
          <stop offset="85%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        d="M4 14.5C64 5.5 144 2.5 216 7.5"
        stroke="url(#hanvaSwoosh)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PosBillingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {/* Receipt paper emerging from top */}
      <path
        d="M13 13V6.5C13 5.7 13.7 5 14.5 5H25.5C26.3 5 27 5.7 27 6.5V13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16.5 8.5H23.5M16.5 11.5H21.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      {/* POS Machine Body */}
      <rect x="9" y="13" width="22" height="22" rx="3.5" stroke="currentColor" strokeWidth="2.1" />
      {/* Screen */}
      <rect x="13" y="16.5" width="14" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      {/* Keypad dots */}
      <circle cx="14.5" cy="26" r="1.2" fill="currentColor" />
      <circle cx="20" cy="26" r="1.2" fill="currentColor" />
      <circle cx="25.5" cy="26" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="30.5" r="1.2" fill="currentColor" />
      <circle cx="20" cy="30.5" r="1.2" fill="currentColor" />
      <circle cx="25.5" cy="30.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function DineInClocheIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {/* Finial handle */}
      <circle cx="20" cy="11" r="2.3" stroke="currentColor" strokeWidth="2" />
      {/* Dome */}
      <path
        d="M8.5 27C8.5 19.8 13.7 14 20 14C26.3 14 31.5 19.8 31.5 27"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Subtle inner highlight */}
      <path
        d="M13 22.5C14.2 19.5 16.5 17.8 19 17.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Platter base */}
      <path d="M5.5 27.5H34.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M9.5 31H30.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export function DeliveryScooterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {/* Delivery box */}
      <rect x="7" y="13" width="9" height="8" rx="1.6" stroke="currentColor" strokeWidth="2" />
      {/* Handlebar & front shield */}
      <path
        d="M24 12.5H27.5L30.5 23.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Scooter body & seat */}
      <path
        d="M8.5 24.5H19L23.5 18.5H28.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 21H21.5L25 27H16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Wheels */}
      <circle cx="12" cy="28.5" r="3.6" stroke="currentColor" strokeWidth="2.1" />
      <circle cx="29.5" cy="28.5" r="3.6" stroke="currentColor" strokeWidth="2.1" />
      {/* Motion lines */}
      <path d="M4.5 16H6M4 19.5H5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

export function ReportsAnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {/* Axis */}
      <path d="M7.5 32H32.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      {/* Bars */}
      <rect x="9.5" y="23" width="4.5" height="9" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="17.5" y="18.5" width="4.5" height="13.5" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="25.5" y="14" width="4.5" height="18" rx="1" fill="currentColor" opacity="0.9" />
      {/* Upward trend line */}
      <path
        d="M10 18.5L17.5 13L22 15.5L30.5 8.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 8.5H30.5V13"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsControlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path
        d="M17.2 7.5C17.5 6.3 18.7 5.5 20 5.5C21.3 5.5 22.5 6.3 22.8 7.5L23.3 9.2C24.2 9.5 25.1 9.9 25.9 10.4L27.5 9.6C28.6 9 30 9.3 30.8 10.3C31.6 11.3 31.7 12.7 31 13.8L30 15.3C30.4 16.2 30.7 17.1 30.9 18.1L32.6 18.6C33.8 18.9 34.5 20.1 34.5 21.4C34.5 22.7 33.8 23.9 32.6 24.2L30.9 24.7C30.7 25.7 30.4 26.6 30 27.5L31 29C31.7 30.1 31.6 31.5 30.8 32.5C30 33.5 28.6 33.8 27.5 33.2L25.9 32.4C25.1 32.9 24.2 33.3 23.3 33.6L22.8 35.3C22.5 36.5 21.3 37.3 20 37.3C18.7 37.3 17.5 36.5 17.2 35.3L16.7 33.6C15.8 33.3 14.9 32.9 14.1 32.4L12.5 33.2C11.4 33.8 10 33.5 9.2 32.5C8.4 31.5 8.3 30.1 9 29L10 27.5C9.6 26.6 9.3 25.7 9.1 24.7L7.4 24.2C6.2 23.9 5.5 22.7 5.5 21.4C5.5 20.1 6.2 18.9 7.4 18.6L9.1 18.1C9.3 17.1 9.6 16.2 10 15.3L9 13.8C8.3 12.7 8.4 11.3 9.2 10.3C10 9.3 11.4 9 12.5 9.6L14.1 10.4C14.9 9.9 15.8 9.5 16.7 9.2L17.2 7.5Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="21.4" r="4.6" stroke="currentColor" strokeWidth="2.1" />
    </svg>
  );
}

/**
 * Decorative bottom illustration inside the white login card:
 * Left: subtle blue line-art dining table + chairs & steaming serving cloche.
 * Right: layered smooth blue wave shapes sweeping into the bottom-right corner.
 */
export function LoginCardFooterWaves({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cardWaveBack" x1="180" y1="20" x2="460" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#60A5FA" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.52" />
        </linearGradient>
        <linearGradient id="cardWaveMid" x1="210" y1="36" x2="460" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.52" />
          <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.72" />
        </linearGradient>
        <linearGradient id="cardWaveLine" x1="210" y1="60" x2="460" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Subtle Dining Table & Two Chairs (Bottom-Left) */}
      <g stroke="#6A9FD8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
        {/* Left chair */}
        <path d="M28 60L33 90H56L54 110" />
        <path d="M35 90L33 110" />
        <path d="M35 96H55" />
        {/* Table */}
        <path d="M52 74H112" strokeWidth="2.3" />
        <path d="M82 74V109" strokeWidth="2.3" />
        <path d="M70 109H94" strokeWidth="2.3" />
        {/* Right chair */}
        <path d="M136 60L131 90H108L110 110" />
        <path d="M129 90L131 110" />
        <path d="M109 96H129" />
      </g>

      {/* Steaming Serving Cloche (Center-Left) */}
      <g stroke="#3B79C4" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.88">
        {/* Steam lines */}
        <path d="M174 44C172 39 176 35 174 30" strokeWidth="1.7" />
        <path d="M181 42C179 37 183 33 181 28" strokeWidth="1.7" />
        <path d="M188 44C186 39 190 35 188 30" strokeWidth="1.7" />
        {/* Finial */}
        <circle cx="181" cy="53" r="3" />
        {/* Dome */}
        <path d="M161 74C161 63 170 56 181 56C192 56 201 63 201 74" />
        <path d="M167 68C169 63.5 173 61 177.5 60.5" strokeWidth="1.5" opacity="0.65" />
        {/* Platter */}
        <path d="M155 75.5H207" strokeWidth="2.3" />
        <path d="M161 80H201" strokeWidth="1.9" opacity="0.7" />
      </g>

      {/* Flowing Translucent Blue Waves (Right side) */}
      <path
        d="M210 112C242 82 276 62 320 68C362 74 390 22 440 8C449 5.5 456 5 460 6V112H210Z"
        fill="url(#cardWaveBack)"
      />
      <path
        d="M262 112C302 88 338 82 374 62C408 43 430 22 460 18V112H262Z"
        fill="url(#cardWaveMid)"
      />
      <path
        d="M220 96C258 68 294 60 332 68C370 76 402 30 456 14"
        stroke="url(#cardWaveLine)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
