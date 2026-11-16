# THE GRAND ATELIER: DESIGN SYSTEM & TOKEN SPECIFICATION

**Product:** Complete Restaurant POS & Business Management Platform  
**Design Reference Caliber:** Toast POS, Square POS, Linear, Stripe Dashboard  
**Aesthetic Philosophy:** Warm Hospitality Heritage meets Precision High-Throughput Engineering

---

## 1. Visual Personality & Design Tenets

The design language moves away from generic cold SaaS blues and purple gradients into a **distinctive, confident hospitality palette**:

- **Warm Neutrals & Obsidian Slate:** Charcoal and deep graphite darks paired with warm porcelain and crisp bone whites.
- **Warm Brass & Amber Accent:** A refined golden-amber accent (`#D97706` / `#F59E0B`) that evokes brass bar rails, warm restaurant lighting, and hospitality craftsmanship.
- **Tactile High-Density Controls:** Designed for cashier muscle memory and grease-resistant touchscreens. Clear button bevels, unmistakable press states, and zero ambiguous clickable areas.
- **Strictly No "AI Slop":**
  - NO random floating gradient cards.
  - NO excessive blurry glassmorphism that lowers FPS on budget POS hardware.
  - NO neon borders or glowing elements.
  - NO oversized headings wasting operational real estate.
  - NO decorative placeholder charts that communicate no business metrics.
  - YES to tight typographic grids, high-contrast numbers, and instantaneous responsiveness.

---

## 2. Color Palette & Token System

### 2.1 CSS Variables & Semantic Mapping

```css
:root {
  /* Surface & Base - Warm Porcelain Light Mode */
  --background: #F8F9FA;
  --foreground: #0F172A;
  
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --card-border: #E2E8F0;
  
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  
  /* Brand Accent - Warm Brass & Amber Hospitality */
  --primary: #B45309;             /* Warm Amber-700 for high light-mode contrast */
  --primary-foreground: #FFFFFF;
  --primary-hover: #92400E;
  
  --secondary: #F1F5F9;
  --secondary-foreground: #1E293B;
  
  --muted: #F1F5F9;
  --muted-foreground: #64748B;
  
  --accent: #FEF3C7;              /* Amber tint for active selection */
  --accent-foreground: #92400E;
  
  /* Semantic Status Indicators */
  --destructive: #DC2626;         /* Crimson Red (Alert / Void / Cancel) */
  --destructive-foreground: #FFFFFF;
  
  --success: #16A34A;             /* Emerald Green (Paid / Served / KOT Ready) */
  --success-foreground: #FFFFFF;
  
  --warning: #D97706;             /* Warm Amber (Pending / Table Overdue >45m) */
  --warning-foreground: #FFFFFF;
  
  --critical: #DC2626;           /* Table Critical Turnover Alert >60m */
  
  --border: #E2E8F0;
  --input: #E2E8F0;
  --ring: #D97706;
  
  /* Sidebar Specific */
  --sidebar: #0F172A;             /* Deep Obsidian Midnight for executive contrast */
  --sidebar-foreground: #F8FAFC;
  --sidebar-primary: #F59E0B;
  --sidebar-primary-foreground: #0F172A;
  --sidebar-accent: #1E293B;
  --sidebar-accent-foreground: #F8FAFC;
  --sidebar-border: #1E293B;
  --sidebar-ring: #F59E0B;
  
  --radius: 0.625rem;            /* 10px - balanced, modern, not overly pill-shaped */
}

.dark {
  /* Surface & Base - Obsidian Slate Dark Mode */
  --background: #0B0E14;
  --foreground: #F1F5F9;
  
  --card: #121721;
  --card-foreground: #F1F5F9;
  --card-border: #1E2638;
  
  --popover: #121721;
  --popover-foreground: #F1F5F9;
  
  /* Brand Accent - Radiant Brass Amber */
  --primary: #F59E0B;             /* Bright Amber-500 for crisp dark contrast */
  --primary-foreground: #0B0E14;
  --primary-hover: #FBBF24;
  
  --secondary: #1A2130;
  --secondary-foreground: #F1F5F9;
  
  --muted: #1A2130;
  --muted-foreground: #94A3B8;
  
  --accent: #262115;
  --accent-foreground: #F59E0B;
  
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  
  --success: #22C55E;
  --success-foreground: #0B0E14;
  
  --warning: #F59E0B;
  --warning-foreground: #0B0E14;
  
  --border: #1E2638;
  --input: #1E2638;
  --ring: #F59E0B;
  
  --sidebar: #080A0F;
  --sidebar-foreground: #F1F5F9;
  --sidebar-primary: #F59E0B;
  --sidebar-primary-foreground: #080A0F;
  --sidebar-accent: #151A24;
  --sidebar-accent-foreground: #F1F5F9;
  --sidebar-border: #151A24;
  --sidebar-ring: #F59E0B;
}
```

---

## 3. Typography & Numerical Precision

- **Font Family:** `Geist Sans`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Inter`, `sans-serif`.
- **Monospace Family (Receipts, Codes, KOTs):** `Geist Mono`, `SFMono-Regular`, `Consolas`, `monospace`.
- **Numerical Rule:** Every price, order count, invoice total, timer, and table capacity **must** apply `font-variant-numeric: tabular-nums` (class `tabular-nums`) to prevent jittering during live re-renders.

| Scale Token | Font Size | Line Height | Weight | Typical Application |
|---|---|---|---|---|
| `text-xs` | 11px (0.6875rem) | 16px | 500 / Medium | Badge labels, short codes, table seats |
| `text-sm` | 13px (0.8125rem) | 18px | 400 / 500 | Table cell text, secondary metrics, form hints |
| `text-base` | 15px (0.9375rem) | 22px | 500 / 600 | Menu item names, button labels, navigation |
| `text-lg` | 18px (1.125rem) | 24px | 600 / Semibold | Section headings, dialog titles, cart line total |
| `text-xl` | 20px (1.25rem) | 28px | 700 / Bold | Panel headers, modal titles, KPI subheadings |
| `text-2xl` | 24px (1.5rem) | 32px | 700 / Bold | Page headers, quick tender buttons |
| `text-3xl` | 32px (2rem) | 36px | 800 / Extrabold | Executive revenue figures, grand total bill |

---

## 4. Operational Touch & Sizing Guidelines

In a restaurant POS, missed touches cost real operational seconds. All interactive controls follow strict touch standards:

- **Critical Action Triggers (Pay, Complete, Settle):** Minimum height **54px - 60px**, full width of the cart panel, high-contrast background with bold label and keyboard badge (`[Space]` / `[Enter]`).
- **Standard POS Buttons (KOT, Hold, Split, Discount):** Height **42px - 46px**, min tap width 48px.
- **Product Tiles (Menu Grid):** Minimum height **96px - 110px** with generous spacing, clear tap feedback (`active:scale-[0.98]`), and visible portion chips.
- **Quantity Steppers (`-`, `+`):** Minimum **36×36px** with high-contrast borders to prevent fat-finger mistakes.

---

## 5. POS Operational Keyboard Shortcut Matrix

| Shortcut | Action | Operational Purpose |
|---|---|---|
| `/` or `Ctrl+K` | **Search Menu** | Instant focus into search input without touching mouse |
| `F1` | **Switch to Dine-In** | Select Table and assign covers |
| `F2` | **Switch to Takeaway** | Fast over-the-counter quick order |
| `F3` | **Switch to Delivery** | Input phone, address, and dispatch details |
| `F4` | **Hold / Save Bill** | Stash active draft and free the till for next customer |
| `F7` | **Print KOT** | Dispatch order lines to kitchen printers |
| `F8` | **Print Bill Receipt** | Trigger customer bill slip preview & print |
| `F9` or `Space` | **Complete Payment** | Open Quick Tender settlement flyout |
| `Escape` | **Cancel / Dismiss** | Close dialogs, modifier drawer, or clear search |
