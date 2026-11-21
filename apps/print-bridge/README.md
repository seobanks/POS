# Hanva POS — Local Print Bridge 🖨️
> **Cloud-to-LAN Silent Multi-Printer Service (Petpooja Style)**

This lightweight utility runs in the background on the cashier's computer. It connects to your cloud-hosted Hanva POS (`https://api.hanva.in`) and automatically routes print jobs to multiple printers on your local network or USB:
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

## 🚀 Step-by-Step Setup (1 Minute)

### Step 1: Run the Setup Wizard
On the cashier Windows PC, double-click **`setup.bat`**.

It will ask you:
1. Your Hanva POS Cashier login (Email & Password)
2. Automatically show all detected printers on the PC:
   ```
   [1] RP3160 GOLD(U) 1
   [2] southindian kot
   ```
3. Select which one is for **Cashier Bills** (e.g. `1`)
4. Select which one is for **Kitchen KOTs** (e.g. `2`)
5. It will send a test slip to both printers and save `config.json` automatically!

---

### Step 2: Keep it Running
Double-click **`start-bridge.bat`**.

Whenever this is running, all bills and KOTs print silently in under 0.1 seconds!

> **Tip (Windows Startup):** Press `Win + R`, type `shell:startup`, and drop a shortcut to `start-bridge.bat` there so it starts automatically whenever the computer turns on.
