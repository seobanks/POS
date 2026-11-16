# UI LIBRARY EVALUATION & ARCHITECTURAL SELECTION

**Product:** Complete Restaurant POS & Management Platform  
**Target:** High-Performance Desktop Terminal & Premium Web Management

---

## 1. Candidate Repository Inspection & Architectural Fit Analysis

We inspected the required GitHub repositories and evaluated them against the strict performance, bundle size, accessibility, and offline durability requirements of a mission-critical restaurant POS.

| Repository | Status & Architecture | Evaluation & Decision | Rationale |
|---|---|---|---|
| **smooth-code/smooth-ui** | **Archived & Deprecated** (React 16 era, styled-components) | **REJECTED** | Smooth UI was officially deprecated and archived in 2020. Introducing it into a Next.js 16 / React 19 App Router environment with Tailwind CSS v4 would introduce severe dependency conflicts, broken SSR hydration, and unmaintained bundle bloat. |
| **saas-js/saas-ui** | Active (Chakra UI v2 / Ark UI base) | **REJECTED for Core Stack** | Saas UI relies heavily on Chakra UI's CSS-in-JS runtime engine. In high-frequency operational screens (POS menu grids with 500+ items and live WebSocket table updates), runtime CSS-in-JS style injection incurs measurable CPU overhead on budget POS hardware (Intel Celeron / Core i3 till terminals). |
| **magicuidesign/magicui** | Active (Tailwind + Framer Motion components) | **SELECTIVE ADOPTION** | Selected components (e.g. number tickers for revenue metrics, refined border beams, subtle dock animations) offer polish without runtime baggage. We adopt only pure Tailwind/motion patterns where they enhance readability, strictly omitting heavy neon/glow AI artifacts. |
| **shadcn-ui/ui** | Industry Standard (Owned source, Tailwind-first) | **PRIMARY FOUNDATION (Selected)** | Already the core philosophy of `apps/web/components/ui/`. Components ship as readable, editable source code inside the repository. This grants 100% control over accessibility, touch sizing, keyboard events, and zero black-box package lock-in. |
| **radix-ui/primitives** & **@base-ui/react** | Production-Grade Headless ARIA Primitives | **ACCESSIBILITY ENGINE (Selected)** | `@base-ui/react` 1.7.0 and Radix primitives handle complex focus traps, keyboard navigation (Escape, Arrow keys, Enter), screen reader announcements, and portal rendering for dialogs, popovers, tooltips, and dropdowns. |
| **lucide-icons/lucide** | Active (Clean, geometric, consistent icons) | **ICONOGRAPHY STANDARD (Selected)** | `lucide-react` 0.469.0 is already installed and proven. Every icon across the POS and Web Management adheres to 24px/16px geometric grids, consistent stroke weights (1.75 - 2px), and clear semantic metaphors. |

---

## 2. Selected Coherent Component Architecture

To guarantee the fastest possible render cycles, sub-second POS interactions, and a distinct, premium visual personality (Toast + Square + Linear caliber), our unified component architecture is established as:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED COMPONENT STACK                         │
├────────────────────────────────────────────────────────────────────────┤
│  Layer 1: Design Tokens & Theming                                      │
│  Tailwind CSS v4 (`@theme inline`) with CSS variables                  │
│  Obsidian Charcoal, Warm Bone Porcelain, Brass/Amber Hospitality Accent│
├────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Headless Accessibility Primitives                            │
│  @base-ui/react 1.7.0 + Radix UI Core                                  │
│  (Dialog, DropdownMenu, Tabs, Switch, Tooltip, Popover, Select)        │
├────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Owned Design System Primitives (`components/ui/*`)          │
│  CVA (Class Variance Authority) + clsx + tailwind-merge                │
│  Button, Input, Card, Table, Badge, Tabs, Dialog, Drawer, Sheet        │
├────────────────────────────────────────────────────────────────────────┤
│  Layer 4: Specialized Operational POS & Data Components               │
│  • Touch-Optimized POS Station (ProductGrid, CartLine, QuickTender)    │
│  • DataGrid & Analytics (TanStack Table v8, Recharts v2)              │
│  • Micro-Interactions via Motion (Framer Motion v13)                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Design Principles Enforced

1. **Zero Runtime Overhead:** No styled-components or runtime CSS parsing. Pure static utility classes compiled by Tailwind v4.
2. **Accessible by Default:** Full keyboard shortcuts (`F1`–`F12`, `Ctrl+K`, `Enter`, `Escape`) and ARIA roles for screen reader compliance.
3. **Touch-First Ergonomics:** All primary POS buttons maintain a minimum tap target of **48×48px** (up to **56×64px** for critical payment triggers).
4. **Resilient Hardware Hook:** Print components bypass virtual DOM manipulation and render clean vector HTML/CSS directly to `window.print()` and ESC/POS TCP sockets.
