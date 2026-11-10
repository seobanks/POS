import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { resolveWsUrl } from "./ws-url.ts";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  delete (globalThis as any).window;
});

afterEach(() => {
  process.env = { ...originalEnv };
  delete (globalThis as any).window;
});

test("returns null when NEXT_PUBLIC_ENABLE_REALTIME is false", () => {
  process.env.NEXT_PUBLIC_ENABLE_REALTIME = "false";
  assert.equal(resolveWsUrl(), null);
});

test("returns custom URL when NEXT_PUBLIC_WS_URL is provided", () => {
  process.env.NEXT_PUBLIC_WS_URL = "https://custom-ws.example.com";
  assert.equal(resolveWsUrl(), "https://custom-ws.example.com");
});

test("returns null when NEXT_PUBLIC_WS_URL is set to disabled/false/none", () => {
  process.env.NEXT_PUBLIC_WS_URL = "disabled";
  assert.equal(resolveWsUrl(), null);
  process.env.NEXT_PUBLIC_WS_URL = "false";
  assert.equal(resolveWsUrl(), null);
  process.env.NEXT_PUBLIC_WS_URL = "none";
  assert.equal(resolveWsUrl(), null);
});

test("returns null on Vercel preview/production domains", () => {
  (globalThis as any).window = {
    location: {
      hostname: "pos-lovat-nine.vercel.app",
      origin: "https://pos-lovat-nine.vercel.app",
    },
  };
  assert.equal(resolveWsUrl(), null);
});

test("returns custom WS URL even when on Vercel domain", () => {
  process.env.NEXT_PUBLIC_WS_URL = "https://railway-backend.up.railway.app";
  (globalThis as any).window = {
    location: {
      hostname: "pos-lovat-nine.vercel.app",
      origin: "https://pos-lovat-nine.vercel.app",
    },
  };
  assert.equal(resolveWsUrl(), "https://railway-backend.up.railway.app");
});

test("returns window.location.origin on local LAN / Docker deployments", () => {
  (globalThis as any).window = {
    location: {
      hostname: "192.168.1.100",
      origin: "http://192.168.1.100:1995",
    },
  };
  assert.equal(resolveWsUrl(), "http://192.168.1.100:1995");
});

test("returns localhost:4001 on server-side when window is undefined", () => {
  assert.equal(resolveWsUrl(), "http://localhost:4001");
});
