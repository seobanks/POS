import assert from "node:assert/strict";
import test from "node:test";
import { compressImage } from "./image-compress.ts";

test("compressImage returns non-image file unchanged", async () => {
  const textFile = new File(["hello world"], "test.txt", { type: "text/plain" });
  const result = await compressImage(textFile);
  assert.equal(result, textFile);
});

test("compressImage returns svg file unchanged to preserve vector graphics", async () => {
  const svgFile = new File(["<svg></svg>"], "logo.svg", { type: "image/svg+xml" });
  const result = await compressImage(svgFile);
  assert.equal(result, svgFile);
});

test("compressImage gracefully returns file when running outside browser DOM", async () => {
  const pngFile = new File([new Uint8Array([137, 80, 78, 71])], "logo.png", { type: "image/png" });
  const result = await compressImage(pngFile);
  assert.equal(result, pngFile);
});
