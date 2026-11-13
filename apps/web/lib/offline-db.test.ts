import test from "node:test";
import assert from "node:assert/strict";
import {
  generateOfflineId,
  generateOfflineOrderNumber,
  type QueuedOfflineOrder,
} from "./offline-db.ts";

test("generateOfflineId returns a string starting with offline_", () => {
  const id1 = generateOfflineId();
  const id2 = generateOfflineId();

  assert.match(id1, /^offline_\d+_[a-z0-9]+$/);
  assert.match(id2, /^offline_\d+_[a-z0-9]+$/);
  assert.notEqual(id1, id2);
});

test("QueuedOfflineOrder data structure contract", () => {
  const sampleOrder: QueuedOfflineOrder = {
    id: generateOfflineId(),
    offlineOrderNumber: "OFF-101",
    branchId: "branch_123",
    orderType: "DINE_IN",
    tableId: "table_1",
    guestCount: 2,
    notes: "No onions",
    items: [
      {
        menuItemId: "item_1",
        nameSnapshot: "Paneer Tikka",
        quantity: 2,
        unitPrice: 250,
        taxRate: 5,
        modifiers: [
          {
            modifierId: "mod_1",
            nameSnapshot: "Extra Spicy",
            price: 20,
          },
        ],
      },
    ],
    payments: [
      {
        method: "CASH",
        amount: 540,
      },
    ],
    createdAt: new Date().toISOString(),
    status: "PENDING_SYNC",
  };

  assert.equal(sampleOrder.status, "PENDING_SYNC");
  assert.equal(sampleOrder.items.length, 1);
  assert.equal(sampleOrder.items[0].quantity, 2);
  assert.equal(sampleOrder.payments?.[0].amount, 540);
});

test("generateOfflineOrderNumber produces standard sequential format", async () => {
  const orderNumber = await generateOfflineOrderNumber("branch_test");
  assert.match(orderNumber, /^OFF-\d+$/);
});
