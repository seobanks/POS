import test from "node:test";
import assert from "node:assert/strict";
import { LOCALES, LOCALE_LABELS, isLocale } from "./i18n/locales.ts";
import en from "./i18n/dictionaries/en.json" with { type: "json" };
import te from "./i18n/dictionaries/te.json" with { type: "json" };

test("Telugu (te) is registered in supported locales", () => {
  assert.ok(LOCALES.includes("te"));
  assert.equal(LOCALE_LABELS.te, "తెలుగు");
  assert.equal(isLocale("te"), true);
});

test("Telugu dictionary has essential navigation and order translations", () => {
  assert.equal(te["nav.menu"], "మెనూ");
  assert.equal(te["nav.dashboard"], "డాష్‌బోర్డ్");
  assert.equal(te["nav.pos"], "పాయింట్ ఆఫ్ సేల్ (POS)");
  assert.equal(te["nav.tables"], "టేబుల్స్");
  assert.equal(te["nav.orders"], "ఆర్డర్‌లు");
  assert.equal(te["common.save"], "సేవ్ చేయండి");
  assert.equal(te["common.cancel"], "రద్దు చేయండి");
});

test("Telugu dictionary covers all top-level keys from en.json", () => {
  const enKeys = Object.keys(en);
  const teKeys = Object.keys(te);

  const missingKeys = enKeys.filter((k) => !teKeys.includes(k));
  assert.deepEqual(missingKeys, [], `Missing keys in te.json: ${missingKeys.join(", ")}`);
});
