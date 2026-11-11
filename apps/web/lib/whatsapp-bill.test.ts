import assert from "node:assert/strict";
import { test } from "node:test";
import { generateWhatsAppBillText } from "./whatsapp-bill.ts";

test("generateWhatsAppBillText formats digital bill with items, discount, and tax", () => {
  const order = {
    orderNumber: "1001",
    createdAt: "2026-11-11T10:00:00.000Z",
    items: [
      { quantity: 2, nameSnapshot: "Butter Chicken", lineTotal: "700.00" },
      { quantity: 3, nameSnapshot: "Garlic Naan", lineTotal: "180.00" },
    ],
    subtotal: "880.00",
    discountAmount: "50.00",
    taxAmount: "41.50",
    totalAmount: "871.50",
    status: "PAID",
  };

  const text = generateWhatsAppBillText(order, "Hanva Fine Dine");

  assert.ok(text.includes("🧾 *Hanva Fine Dine*"));
  assert.ok(text.includes("Order: #1001"));
  assert.ok(text.includes("• 2x Butter Chicken - ₹700.00"));
  assert.ok(text.includes("• 3x Garlic Naan - ₹180.00"));
  assert.ok(text.includes("Subtotal: ₹880.00"));
  assert.ok(text.includes("Discount: -₹50.00"));
  assert.ok(text.includes("Taxes: ₹41.50"));
  assert.ok(text.includes("*Grand Total: ₹871.50*"));
  assert.ok(text.includes("Status: PAID ✅"));
  assert.ok(text.includes("Thank you for dining with us! 🙏"));
});

test("generateWhatsAppBillText omits discount and tax when 0 and shows Payment Due for unpaid orders", () => {
  const order = {
    orderNumber: "1002",
    createdAt: "2026-11-11T10:00:00.000Z",
    items: [{ quantity: 1, nameSnapshot: "Masala Dosa", lineTotal: "120.00" }],
    subtotal: "120.00",
    discountAmount: "0",
    taxAmount: "0",
    totalAmount: "120.00",
    status: "OPEN",
  };

  const text = generateWhatsAppBillText(order);

  assert.ok(text.includes("🧾 *Hanva Fine Dine*"));
  assert.ok(text.includes("• 1x Masala Dosa - ₹120.00"));
  assert.ok(!text.includes("Discount:"));
  assert.ok(!text.includes("Taxes:"));
  assert.ok(text.includes("Status: Payment Due ⏳"));
});
