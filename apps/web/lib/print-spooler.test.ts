import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeEscposBase64, sendRawToWebUsbDevice } from "./print.ts";

test("decodeEscposBase64 decodes base64 string to Uint8Array bytes", () => {
  const original = "Hello ESC/POS!";
  const base64 = Buffer.from(original).toString("base64");
  const bytes = decodeEscposBase64(base64);

  assert.equal(bytes instanceof Uint8Array, true);
  const text = Buffer.from(bytes).toString("utf-8");
  assert.equal(text, original);
});

test("sendRawToWebUsbDevice handles missing or closed device safely", async () => {
  const resultNull = await sendRawToWebUsbDevice(null, new Uint8Array([0x1b, 0x40]));
  assert.equal(resultNull, false);

  const mockDevice = {
    opened: false,
    open: async () => {},
    configuration: null,
    selectConfiguration: async () => {},
    claimInterface: async () => {},
    transferOut: async () => ({ status: "ok" }),
  };

  const success = await sendRawToWebUsbDevice(mockDevice, new Uint8Array([0x1b, 0x40]));
  assert.equal(success, true);
});

test("sendRawToWebUsbDevice handles device errors gracefully without throwing", async () => {
  const failingDevice = {
    opened: false,
    open: async () => {
      throw new Error("Device disconnected");
    },
  };

  const success = await sendRawToWebUsbDevice(failingDevice, new Uint8Array([0x1b, 0x40]));
  assert.equal(success, false);
});
