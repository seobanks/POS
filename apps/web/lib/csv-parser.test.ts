import test from "node:test";
import assert from "node:assert/strict";
import { parseCsvRows, parseMenuCsv, exportMenuToCsv, SAMPLE_MENU_CSV } from "./csv-parser.ts";

test("parseCsvRows handles quotes and commas correctly", () => {
  const input = `Name,Price,Desc\n"Chicken, Tikka",250,"Juicy, tender chicken"`;
  const rows = parseCsvRows(input);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ["Name", "Price", "Desc"]);
  assert.deepEqual(rows[1], ["Chicken, Tikka", "250", "Juicy, tender chicken"]);
});

test("parseMenuCsv parses sample menu CSV successfully", () => {
  const result = parseMenuCsv(SAMPLE_MENU_CSV);
  assert.equal(result.errors.length, 0);
  assert.equal(result.items.length, 9);

  const paneerTikka = result.items[0];
  assert.equal(paneerTikka.category, "Starters");
  assert.equal(paneerTikka.name, "Paneer Tikka");
  assert.equal(paneerTikka.price, 280);
  assert.equal(paneerTikka.halfPrice, 160);
  assert.equal(paneerTikka.isVeg, true);
  assert.equal(paneerTikka.spiceLevel, "MEDIUM");

  const chickenTikka = result.items[1];
  assert.equal(chickenTikka.name, "Chicken Tikka");
  assert.equal(chickenTikka.isVeg, false);
  assert.equal(chickenTikka.spiceLevel, "HOT");
});

test("parseMenuCsv returns error if required columns are missing", () => {
  const invalid = "Item,Description\nBurger,Good";
  const result = parseMenuCsv(invalid);
  assert.equal(result.items.length, 0);
  assert.match(result.errors[0], /Missing required columns/);
});

test("parseMenuCsv handles various veg/non-veg synonyms", () => {
  const csv = `Item,Price,Food Type\nSalad,150,Veg\nFish,250,Non-Veg\nMutton,350,no\nTofu,180,yes`;
  const result = parseMenuCsv(csv);
  assert.equal(result.items.length, 4);
  assert.equal(result.items[0].isVeg, true);
  assert.equal(result.items[1].isVeg, false);
  assert.equal(result.items[2].isVeg, false);
  assert.equal(result.items[3].isVeg, true);
});

test("exportMenuToCsv produces valid CSV with escaped fields", () => {
  const items = [
    {
      name: 'Paneer, "Special" Tikka',
      category: { name: "Starters" },
      price: 280,
      halfPrice: 160,
      isVeg: true,
      taxRatePercent: 5,
      description: "Rich marinade, cottage cheese",
      sku: "PT-01",
      barcode: "",
      spiceLevel: "MEDIUM",
    },
  ];

  const csv = exportMenuToCsv(items);
  assert.match(csv, /^Category,Item Name,Price/);
  assert.match(csv, /"Paneer, ""Special"" Tikka"/);
  assert.match(csv, /"Rich marinade, cottage cheese"/);

  // Round-trip parse test
  const parsed = parseMenuCsv(csv);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].name, 'Paneer, "Special" Tikka');
  assert.equal(parsed.items[0].price, 280);
  assert.equal(parsed.items[0].isVeg, true);
});
