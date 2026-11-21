# Hanva POS — Local Print Bridge 🖨️
> **Cloud-to-LAN 1-Click Silent Thermal Printer Service (Petpooja Style)**

This lightweight utility runs in the background on the cashier's computer. It connects to your cloud-hosted Hanva POS server (`https://api.hanva.in`) and automatically routes print jobs to thermal printers on your restaurant's local Wi-Fi or USB.

---

## ⚡ How It Works

```
[ Cloud Server (pos.hanva.in) ]
               │ (Outbound WebSocket)
               ▼
[ Local Print Bridge (Cashier PC) ] 
               │
       ┌───────┴────────────────────────┐
       ▼                                ▼
[ Network LAN / Wi-Fi ]       [ Windows USB Spooler ]
  192.168.1.x:9100              winspool.drv / USB
 (Kitchen KOT / Counter)      (Counter Bill Printer)
```

1. **Pure Cloud Architecture:** Your software stays 100% hosted in the cloud.
2. **Zero Inbound Port Forwarding Needed:** The bridge connects **outbound** from the restaurant to the cloud, bypassing NAT and router firewalls automatically.
3. **1-Click Silent Printing:** In under 40 milliseconds, customer receipts and kitchen KOT tickets print and auto-cut without opening any browser dialogs.

---

## 🚀 Quick Setup (2 Minutes)

### Step 1: Configuration (`config.json`)
Copy `config.example.json` to `config.json` and enter your details:

```json
{
  "cloudUrl": "https://api.hanva.in",
  "branchId": "YOUR_BRANCH_ID",
  "username": "cashier@restaurant.com",
  "password": "yourpassword",
  "defaultPrinterIp": "192.168.1.87",
  "defaultPrinterPort": 9100,
  "fallbackToWindowsPrinter": true,
  "windowsPrinterName": ""
}
```

* **`defaultPrinterIp`**: The local IP address of your printer (e.g. `192.168.1.87`).
* **`defaultPrinterPort`**: Standard ESC/POS raw port (`9100`).
* **`fallbackToWindowsPrinter`**: If `true`, on Windows it can also print directly to any USB or default Windows printer queue silently.

---

### Step 2: Start the Bridge

* **On Windows:** Double-click **`start-bridge.bat`**.
* **On macOS / Linux:**
  ```bash
  npm install
  npm start
  ```

---

### Step 3: Test Print
To verify that the bridge can speak to your thermal printer immediately:
* **On Windows:** Double-click **`test-print.bat`**.
* **Or run:**
  ```bash
  node bridge.js --test
  ```
The printer will immediately print a sample test slip and cut the paper!
