# DESKTOP POS BILLING STATION REDESIGN REPORT
**Project:** Hanva POS (Petpooja Enterprise Tier)  
**Surface:** Desktop Restaurant POS (Operational Biller)  
**Caliber Target:** Toast POS, Square Register, Linear-grade speed & density  
**Author:** Principal Frontend Architect & Restaurant POS Specialist  

---

## 1. Executive Summary & Design Mission

The Desktop Restaurant POS is the operational lifeblood of the restaurant. During peak rush hours (8:00 PM – 10:30 PM), cashier and captain throughput directly determines table turns, guest satisfaction, and gross revenue. Every unnecessary click, layout shift, or slow modal interaction costs precious seconds.

Our mission was to transform the legacy 2-column billing layout into a **precision 3-column operational cockpit** engineered for 60-second table-to-receipt billing, zero-mouse keyboard muscle memory, and high-density touchscreens across legacy and modern POS hardware.

---

## 2. Desktop Packaging & Operating Modality

The desktop operational biller is packaged and delivered via a dual-mode WinForms + Microsoft Edge WebView2 runtime wrapper (`windows/msix/Launcher` and `windows/installer/launcher`), complemented by an installable Progressive Web App (`sw-pos.js` Service Worker with Cache v5):

```
+-------------------------------------------------------------------------+
|                  DESKTOP POS HARDWARE ENVIRONMENT                       |
+-------------------------------------------------------------------------+
| Mode A: Standalone Station       | Mode B: Thin Till Client             |
| - Local PostgreSQL Engine        | - Connects over high-speed LAN       |
| - Local NestJS REST/Socket Core  | - Remote POS Gateway                 |
| - WebView2 Embedded Browser      | - WebView2 or Chromium PWA           |
+-------------------------------------------------------------------------+
| Shared Application Runtime: Next.js 16.4.2 App Router (Turbopack)       |
+-------------------------------------------------------------------------+
```

---

## 3. The 3-Column Cockpit Architecture

On operational screens ($\ge 1280\text{px}$ width), the interface expands into three specialized operational columns designed to minimize visual scanning distance:

```
+-----------------------------------------------------------------------------------------------+
| TOP BAR: Branch Switcher | Shift Sales Quick Badge | Fullscreen (F11) | Hardware Status (ESC/POS) |
+------------------------------------+--------------------------+-------------------------------+
| COLUMN 1: PRODUCT CATALOG (1fr)    | COLUMN 2: CENTER (300px) | COLUMN 3: LIVE CART (380px)   |
|------------------------------------+--------------------------+-------------------------------|
| - Search Bar (Hot-key: `/`)        | - Live Portion Selector  | - Order Type Tabs:            |
|   with quick dietary filters       |   [Full Price] [Half]    |   [Dine-In F1] [Takeaway F2]  |
| - Category Scroll Bar              | - Modifier Add-ons       |   [Delivery F3]               |
| - Fast-Tender Product Grid:        |   (Extra Cheese, Olives) | - Table & Waiter Status Pill  |
|   * High-contrast food badges      | - Kitchen Instructions   | - High-Density Line Items:    |
|   * Short-code tags (`#gt30`)      |   Presets ("No Onions",  |   * Line name & portion       |
|   * Portion pills                  |   "Less Spicy", "Extra") |   * Modifier sub-tags         |
|   * Real-time 86 stock status      | - Quantity Stepper       |   * Tactile [-] [Qty] [+]     |
|   * Tactile active press state     | - Keyboard 'Enter' to Add| - Subtotal, Taxes & Discounts |
|                                    |                          | - ACTION BAR:                 |
|                                    |                          |   [ Print Bill F8 ]           |
|                                    |                          |   [ Kitchen KOT F7 ]          |
|                                    |                          |   [ Settle & Pay Space/F9 ]   |
+------------------------------------+--------------------------+-------------------------------+
```

### Breakdown of Column Responsibilities

### Column 1: Fast-Tender Product Catalog (`1fr`)
- **Quick-Search with Autofocus:** Pressing `/` instantly brings focus to the search input with instant debounced matching.
- **Dietary Filter Switches:** Instant filter switches for Pure Veg (`🌱`), Non-Veg (`🍖`), and Star/Best-Seller items (`⭐`).
- **Product Card Density:**
  - Card minimum height reduced from $120\text{px}$ to $88\text{px}$, allowing $24\text{--}36$ visible products without scrolling on standard $1920\times1080$ and $1366\times768$ tills.
  - Short-code pills (e.g., `#B12`, `#GT30`) for cashier numeric keypad indexing.
  - Dual price display for products with portions (e.g., `Full ₹280` / `Half ₹160`).

### Column 2: Live Portion & Customizer Cockpit (`300px`)
- Eliminates disruptive popup modals for standard item modifications.
- Clicking any customizable menu item docks its options directly into the center column.
- **Portion Switcher:** Segmented control toggles between Full and Half portion pricing in real time.
- **Modifier Multi-Select:** Toggle add-on groups (cheeses, toppings, dips) with instant price differential recalculation.
- **Cooking Instruction Quick-Chips:** 1-tap presets (`Less Spicy`, `No Garlic/Onion`, `Extra Crispy`, `Well Done`, `Pack Separate`) plus custom notes.
- **Immediate Commitment:** Pressing `Enter` adds the item with all selections directly to the cart and returns focus to catalog search.

### Column 3: High-Density Cart & Settlement Engine (`380px`)
- **Order Type Switchers:** 1-tap pills with physical keyboard shortcuts (`F1: Dine-In`, `F2: Takeaway`, `F3: Delivery`).
- **Table Indicator:** Displays active table number, dining floor, and live elapsed timer with overdue status (`>45m` alert, `>60m` overdue pulse).
- **Line Item Steppers:** High-contrast `+` / `-` buttons with $40\text{px}$ touch targets meeting ISO 9241 touch ergonomic criteria.
- **Financial Summary:** Subtotal, SGST/CGST breakdown, service charges, discounts, and rounding with tabular figures (`font-variant-numeric: tabular-nums`).
- **One-Tap Action Bar:**
  - `F7`: Send KOT to Kitchen Display / Thermal ESC/POS Kitchen Printer.
  - `F8`: Print Customer Bill (ESC/POS 80mm / 58mm).
  - `Space` / `F9`: Trigger Instant Checkout Panel.

---

## 4. Quick-Tender Cash & Checkout Drawer

When settling an order, the cashier needs to process transactions in under 5 seconds:

- **Exact Tender Button:** 1-click pays full balance.
- **Quick Denomination Pills:** `+₹50`, `+₹100`, `₹500`, `₹1000`, `₹2000` buttons instantly compute cash received.
- **High-Contrast Change Due Box:** Large amber/emerald callout displaying exact change due to guest with bold tabular typography.
- **Quick Discount Presets:** `5%`, `10%`, `15%`, `20%` chips and custom cash discount input.
- **Multi-Tender Capabilities:** Split payments across Cash, Card, UPI QR, and Customer Credit with remaining balance computation.

---

## 5. Physical Keyboard Shortcut Matrix

Designed for seasoned cashiers who operate without ever touching the mouse or touchscreen:

| Shortcut | Action | Operational Target |
| :--- | :--- | :--- |
| **`/`** | Focus Product Search | Instant text search for menu items |
| **`Esc`** | Clear Search / Close Drawers | Return to default station state |
| **`F1`** | Set Order Type: Dine-In | Switch context to table dining |
| **`F2`** | Set Order Type: Takeaway | Switch context to counter parcel |
| **`F3`** | Set Order Type: Delivery | Switch context to dispatch |
| **`F7`** | Kitchen KOT Fire | Send new items to kitchen printer & KDS |
| **`F8`** | Print Pro-Forma Bill | Print customer bill to receipt printer |
| **`Space`** or **`F9`** | Settle & Pay | Open quick tender payment panel |
| **`F11`** | Fullscreen Toggle | Maximize till workspace, hide OS borders |
| **`Enter`** | Confirm Line Customization | Commit configured product to order line |

---

## 6. Supported Viewports & Touch Ergonomics

| Viewport Resolution | Common Hardware Profile | Cockpit Layout Adaptation |
| :--- | :--- | :--- |
| **$1920 \times 1080$** | Modern Touch Terminals (Elo, Posiflex, Sunmi) | Full 3-Column Cockpit ($1\text{fr} : 300\text{px} : 380\text{px}$) |
| **$1600 \times 900$** | High-end All-in-One Windows Tills | Full 3-Column Cockpit ($1\text{fr} : 280\text{px} : 360\text{px}$) |
| **$1440 \times 900$** | 16:10 Touch Monitors & Laptops | Full 3-Column Cockpit ($1\text{fr} : 260\text{px} : 340\text{px}$) |
| **$1366 \times 768$** | Standard Indian Restaurant Hardware Till | Responsive 2-Column Mode + Centered Customizer Drawer |
| **$1280 \times 800$** | Compact Counter Tablets & Embedded Tills | Responsive 2-Column Mode with Slide-over Cart Panel |

---

## 7. Printer & Hardware Integration Integrity

All physical hardware printing mechanisms have been verified and preserved without regression:
1. **Raw ESC/POS Thermal Printing (Port 9100):** Network receipt printers continue to receive raw byte streams via NestJS `EscposNetworkService`.
2. **Direct Linux USB Spooler (`/dev/usb/lp0`):** Preserved for POS terminals running Linux/Debian kiosks.
3. **Windows Spooler (`window.print()`):** Clean `@media print` CSS styles with monospace receipt formatting and page-break isolation.
