# UI/UX & ARCHITECTURE AUDIT: COMPLETE RESTAURANT POS PLATFORM

**Audit Date:** November 2026  
**System Identity:** Hanva Fine Dine / Nodedr OrderRestro Platform  
**Target Environments:** Windows Desktop (WinForms + Edge WebView2), Web Management (Desktop / Tablet / Mobile), Progressive Web App (PWA)

---

## 1. Executive Summary

This architecture and UI/UX audit investigates the complete technology stack, deployment modalities, design systems, operational billing workflows, hardware integrations, and back-office management capabilities of the restaurant management platform.

The application serves two critical operational archetypes:
1. **High-Speed Desktop & Touch POS Terminal (`/pos`, `/captain`, `/kds`, `/tables`):** Designed for frontline cashiers, captains, and kitchen staff who demand sub-second latency, zero clutter, instant keyboard navigation, thermal printer dispatch, and continuous operation under high-stress lunch/dinner rushes.
2. **Executive Web Management Application (`/(dashboard)/...`):** Designed for restaurant owners, general managers, and accountants requiring dense, high-signal reporting, menu engineering, procurement tracking, staff attendance, granular permissions, and multi-branch control.

---

## 2. Comprehensive Technology Identification

| Dimension | Specification | Verification Details |
|---|---|---|
| **Frontend Framework** | **Next.js 16.4.2 (App Router)** | TypeScript 5.9.3, React 19.2.8, Turbopack enabled (`apps/web/package.json`). |
| **Backend Framework** | **NestJS 11.2.6** | Modular architecture with 20+ product domains, dependency injection, REST API (`/api/v1`), Swagger/OpenAPI 8.1, Throttler, and Socket.IO gateways (`apps/backend/package.json`). |
| **Desktop Framework** | **Dual Modality: WinForms + Microsoft Edge WebView2** & **PWA** | • Windows Desktop: Packaged as MSIX (`windows/msix/Launcher`) and InnoSetup installer (`windows/installer/launcher`) utilizing .NET WinForms + WebView2 runtime.<br>• Tablet/Touch: Progressive Web App with dedicated Service Worker (`sw-pos.js`) and manifests (`/manifest.json`, `/captain/manifest.webmanifest`). |
| **Frontend Sharing** | **100% Shared Frontend** | Desktop application and web browser access the exact same Next.js frontend code in `apps/web`. The desktop shell launches either against localhost (embedded server) or LAN server address (thin client). |
| **Package Manager & Monorepo** | **pnpm workspaces + Turborepo 2.10.9** | Monorepo layout containing `apps/backend`, `apps/web`, and shared library `packages/types` (`pnpm-workspace.yaml`, `turbo.json`). |
| **UI Component Architecture** | **@base-ui/react 1.7.0 + Owned shadcn primitives** | Clean headless interactive primitives from Base UI / Radix styled with Tailwind CSS in `apps/web/components/ui/`. Zero bloated vendor libraries. |
| **Styling System** | **Tailwind CSS v4.3.3** | Modern `@import "tailwindcss"` with `@theme inline` design tokens in `apps/web/app/globals.css`. Supports reactive light and dark modes via `next-themes`. |
| **Routing Structure** | **Next.js App Router Route Groups** | • `/(dashboard)/...`: Back-office app shell with responsive sidebar.<br>• Full-bleed operational routes: `/pos`, `/captain`, `/tables`, `/kds`, `/customer-display`, `/kiosk/[token]`, `/offline`.<br>• Authentication: `/login`, `/signup`, `/forgot-password`, `/reset-password`. |
| **Authentication & AuthZ** | **JWT (httpOnly cookie) + PIN Switch + TOTP 2FA** | Multi-tier security: Session tokens stored in secure cookies, quick-switch 4-digit PIN for till cashiers (`/auth/pin`), Google Authenticator 2FA, and 8-category granular RBAC (`RolePermission`). |
| **State Management** | **TanStack Query v5 + Context + Offline DB** | Server state cached with `@tanstack/react-query` v5; UI context via `BranchProvider`, `I18nProvider`; local drafts in IndexedDB (`pos-drafts.ts`, `offline-db.ts`). |
| **Realtime Push Engine** | **Socket.IO Client 4.8.3** | WebSockets connected to backend gateways (`/kds`, `/tables`, `/orders`) with automatic reconnection and fallback refetching (`useRealtime`). |
| **Database & ORM** | **Prisma ORM 6.19.3 + PostgreSQL (Neon / Local)** | 42+ sequential SQL migrations, full relational schema (Orders, KOTs, MenuItems, Modifiers, Inventory, StockMovement, Tax, Tables, Users, Roles). |
| **Printing & Hardware** | **Triple Transport Engine** | 1. **OS Spooler / Web Print:** `window.print()` rendering vector PDF receipts for all Windows thermal printers (Epson, Star, Citizen, TVS, Xprinter).<br>2. **ESC/POS Network:** TCP raw socket printing to kitchen KOT printers (`escpos-network.ts`).<br>3. **Direct-USB ESC/POS:** Linux `/dev/usb/lp0` raw char-device kernel transport (`escpos-usb.ts`).<br>4. **Cash Drawer:** Standard ESC/POS kick pulse `\x1b\x70\x00\x19\xfa`.<br>5. **Barcode Scanners:** Standard HID USB keyboard emulation. |
| **Build & Packaging** | **Multi-Target Pipelines** | Windows MSIX (`build-windows-msix.ps1`), Windows Exe (`HanvaPOS.iss`), Linux `.deb` (`packaging/deb/`), Docker Compose (`docker-compose.yml`), and Vercel Serverless (`vercel.json`). |

---

## 3. Desktop Application Architecture Verification

The desktop solution was analyzed to resolve whether it is a separate application, a wrapper, or a shared operating system:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   WINDOWS DESKTOP RUNTIME (MSIX / EXE)                 │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   OrderRestro.Launcher (C# WinForms + WebView2 Core)           │   │
│   │   • Window management (Min size 900x600, default 1360x860)     │   │
│   │   • System tray integration (ServerSupervisor lifecycle)       │   │
│   │   • Edge Chromium rendering engine (hardware accelerated)      │   │
│   │   • Windows Print Spooler native hook via window.print()       │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│              Operating Modes:      ▼                                   │
│    ┌─────────────────────────────────┬───────────────────────────────┐ │
│    │ Mode A: Thin Client Terminal    │ Mode B: Embedded Standalone   │ │
│    │ Points WebView2 to LAN / Cloud  │ Supervises child processes:   │ │
│    │ Server URL (http://192.168.x.x) │ • Embedded PostgreSQL         │ │
│    │ Zero local database requirement │ • NestJS API (:3001)          │ │
│    │ Ideal for multiple till nodes   │ • Next.js Web (:1995)         │ │
│    └─────────────────────────────────┴───────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

**Conclusion:** The desktop application is **a native Windows shell hosting the unified Next.js web application via Microsoft Edge WebView2**. Any improvements made to `apps/web` instantly enhance both the web portal and the native Windows desktop client.

---

## 4. UI/UX Heuristic Evaluation & Usability Friction Points

### 4.1 POS Billing Interface (`/pos`)
- **Strengths:** Support for Dine-in, Takeaway, Delivery, multi-table unsent cart preservation (`pos-drafts.ts`), KOT printing, half-portion pricing, split billing, customer search, and cash denomination calculations.
- **Identified Usability Deficiencies:**
  1. *Category Navigation Density:* In standard desktop resolutions (1366×768 and 1920×1080), the vertical category list took excessive horizontal margin, stealing space from menu tiles.
  2. *Product Card Hierarchy:* The cards lacked strong typographic contrast between item names and prices; short codes were not visibly highlighted for fast cashier keyboard lookup.
  3. *Action Button Sizing:* Key POS checkout triggers (KOT, Print, Pay) need to be oversized (minimum 52px height) with unmistakable color-coded semantic cues (amber for KOT, slate for Save, emerald for Complete Settlement).
  4. *Modifier Dialog Speed:* Customization options required too many clicks; quick modifier chips and keyboard Enter confirmation are necessary for peak-hour throughput.

### 4.2 Web Management Dashboard (`/(dashboard)/dashboard`)
- **Strengths:** Real data integration with backend accounting and reporting; multi-shift business tracking; 7-day weather/event demand forecast; covers and RevPC metrics.
- **Identified Usability Deficiencies:**
  1. *Visual Polish:* KPI cards used standard card borders without executive visual weight. Needs high-contrast stat typography, micro trend indicators, and refined sparklines.
  2. *Bento Grid Layout:* The arrangement needed tighter spatial grouping so owners can see sales, shifts, order queues, and inventory alerts at a single glance without scrolling.

### 4.3 Data Tables & Catalog Management (`/menu`, `/orders`, `/inventory`, `/reports`)
- **Strengths:** Rich functional depth including Petpooja 9 Quick Tools, Z-Report / X-Report, Menu Engineering BCG matrix, and hourly heatmaps.
- **Identified Usability Deficiencies:**
  1. *Table Spacing:* Rows in data-dense views (orders, inventory movements) needed a compact density mode for desktop management alongside the standard touch mode.
  2. *Status Tag Consistency:* Order status pills (`NEW`, `PREPARING`, `READY`, `PAID`, `CANCELLED`) must have a unified design token system across tables, KDS, and receipts.

---

## 5. Architectural Guardrails & Non-Negotiables

1. **Zero Database Drift:** Maintain full backward compatibility with PostgreSQL Prisma schema; additive safe DDL only.
2. **Preserve Hardware Communication:** Never alter `window.print()` formatting or ESC/POS binary buffers (`apps/web/lib/print.ts`, `apps/backend/src/modules/orders/escpos-network.ts`).
3. **No Artificial AI Slop:** Reject gratuitous gradient cards, glowing borders, blurry backdrop filters that destroy POS frame rates, and fake empty state illustrations.
4. **Desktop Resolution Matrix:** Flawless rendering at 1920×1080, 1600×900, 1440×900, 1366×768, and 1280×800.
