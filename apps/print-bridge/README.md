# Hanva POS — Local Print Bridge 🖨️
> **Cloud-to-LAN Silent Multi-Printer Service (Petpooja Style)**

This lightweight utility runs in the background on the cashier's Windows computer. It connects to your cloud-hosted Hanva POS (`https://api.hanva.in`) and automatically routes print jobs to multiple printers on your local network or USB:
* **Cashier Bills** ➔ Sent directly to your Counter Printer (e.g. `RP3160 GOLD(U) 1` via USB).
* **Kitchen KOTs** ➔ Sent directly to your Kitchen Printer (e.g. `southindian kot` via LAN IP or USB).
* **Captain Apps** ➔ When any captain takes an order on their phone, the KOT prints **instantly in the kitchen**!

---

## ⚡ How It Works (Petpooja Style)

```
[ Captain's Phone / Mobile App ]
             │ (Punch Order)
             ▼
[ Hanva Cloud (api.hanva.in) ]
             │ (Realtime WebSocket)
             ▼
[ Hanva Print Bridge (Cashier PC) ]
             │
     ┌───────┴────────────────────────┐
     ▼                                ▼
[ Cashier USB Printer ]     [ Kitchen KOT Printer ]
  "RP3160 GOLD(U) 1"           "southindian kot"
  Customer Bills              Auto-prints Captain KOTs
```

1. **No Default Printer Limitation:** You do NOT need to set either printer as the Windows Default. The bridge sends jobs directly to each named printer.
2. **Instant Automatic KOTs:** When a Captain takes an order on their phone, the kitchen printer prints the KOT within 50ms automatically — cashiers don't need to click anything.
3. **Outbound Connection:** No router port forwarding or static public IPs needed.

---

## 🚀 Easy 1-Minute Setup (Windows Desktop GUI)

### Option 1 (Recommended): Double-Click `HanvaPOS-Printer.hta`
1. Double-click **`HanvaPOS-Printer.hta`** (or `Launch-Hanva-Printer.bat`).
2. A desktop window will open displaying all detected Windows printers.
3. Select your **Cashier Printer** (`RP3160 GOLD(U) 1`) and **Kitchen KOT Printer** (`southindian kot`).
4. Click **"Test Cashier Bill"** and **"Test Kitchen KOT"** to verify printing.
5. Click **"Start Silent Print Service"** & **"Start on Windows Boot"**.
Done! Everything will now print automatically in the background with zero clicks.

---

### Option 2: Console Setup Wizard
Double-click **`setup.bat`**:
1. Enter your Cashier login (Email & Password).
2. Choose your Cashier and Kitchen printers from the numbered list.
3. Done! Start the service anytime with **`start-bridge.bat`** or **`silent-start.vbs`**.
