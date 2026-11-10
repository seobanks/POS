export interface BulkMenuItemInput {
  category: string;
  name: string;
  price: number;
  halfPrice?: number | null;
  foodType?: string;
  isVeg?: boolean;
  taxRatePercent?: number;
  description?: string;
  sku?: string;
  barcode?: string;
  spiceLevel?: "NONE" | "MILD" | "MEDIUM" | "HOT" | "EXTRA_HOT";
}

/**
 * Robust RFC-4180 compliant CSV line tokenizer.
 * Properly handles quoted fields, inner commas, and escaped quotes ("").
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const cleanText = text.replace(/^\uFEFF/, ""); // Remove BOM if present

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentField += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++; // handle CRLF
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // Push remainder
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export interface ParsedMenuResult {
  items: BulkMenuItemInput[];
  errors: string[];
  totalParsed: number;
}

export function parseMenuCsv(csvText: string): ParsedMenuResult {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    return { items: [], errors: ["CSV file is empty."], totalParsed: 0 };
  }

  const headerRow = rows[0].map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));
  const findColIndex = (...candidates: string[]) => {
    return headerRow.findIndex((h) =>
      candidates.some((c) => h === c || h.includes(c)),
    );
  };

  const catIdx = findColIndex("category", "categoryname");
  const nameIdx = findColIndex("itemname", "name", "item");
  const priceIdx = findColIndex("price", "fullprice", "rate");
  const halfPriceIdx = findColIndex("halfprice", "half");
  const typeIdx = findColIndex("foodtype", "veg", "isveg", "type");
  const taxIdx = findColIndex("taxrate", "taxratepercent", "tax", "taxpercent");
  const descIdx = findColIndex("description", "desc");
  const skuIdx = findColIndex("sku", "code", "itemcode");
  const barcodeIdx = findColIndex("barcode");
  const spiceIdx = findColIndex("spicylevel", "spicelevel", "spice");

  if (nameIdx === -1 || priceIdx === -1) {
    return {
      items: [],
      errors: [
        'Missing required columns: CSV must contain at least "Item Name" and "Price" headers.',
      ],
      totalParsed: 0,
    };
  }

  const items: BulkMenuItemInput[] = [];
  const errors: string[] = [];

  for (let line = 1; line < rows.length; line++) {
    const row = rows[line];
    const rawName = row[nameIdx]?.trim();
    if (!rawName) continue; // skip blank line

    const rawCategory = catIdx !== -1 && row[catIdx]?.trim() ? row[catIdx].trim() : "General";
    const rawPrice = row[priceIdx]?.replace(/[^0-9.]/g, "").trim();
    const priceNum = parseFloat(rawPrice || "0");

    if (isNaN(priceNum) || priceNum <= 0) {
      errors.push(`Row ${line + 1} ("${rawName}"): Invalid or zero price (${row[priceIdx] || "empty"}).`);
      continue;
    }

    let halfPriceNum: number | null = null;
    if (halfPriceIdx !== -1 && row[halfPriceIdx]) {
      const parsedHalf = parseFloat(row[halfPriceIdx].replace(/[^0-9.]/g, ""));
      if (!isNaN(parsedHalf) && parsedHalf > 0) {
        halfPriceNum = parsedHalf;
      }
    }

    let isVeg = true;
    if (typeIdx !== -1 && row[typeIdx]) {
      const typeVal = row[typeIdx].toLowerCase().trim();
      if (
        typeVal.includes("non") ||
        typeVal === "nv" ||
        typeVal === "false" ||
        typeVal === "0" ||
        typeVal === "n" ||
        typeVal === "no"
      ) {
        isVeg = false;
      } else if (
        typeVal.includes("veg") ||
        typeVal === "true" ||
        typeVal === "1" ||
        typeVal === "y" ||
        typeVal === "yes"
      ) {
        isVeg = true;
      }
    }

    let taxRatePercent = 5;
    if (taxIdx !== -1 && row[taxIdx]) {
      const parsedTax = parseFloat(row[taxIdx].replace(/[^0-9.]/g, ""));
      if (!isNaN(parsedTax) && parsedTax >= 0) {
        taxRatePercent = parsedTax;
      }
    }

    let spiceLevel: "NONE" | "MILD" | "MEDIUM" | "HOT" | "EXTRA_HOT" = "NONE";
    if (spiceIdx !== -1 && row[spiceIdx]) {
      const rawSpice = row[spiceIdx].toUpperCase().trim();
      if (["NONE", "MILD", "MEDIUM", "HOT", "EXTRA_HOT"].includes(rawSpice)) {
        spiceLevel = rawSpice as any;
      }
    }

    items.push({
      category: rawCategory,
      name: rawName,
      price: priceNum,
      halfPrice: halfPriceNum,
      isVeg,
      taxRatePercent,
      description: descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : undefined,
      sku: skuIdx !== -1 && row[skuIdx] ? row[skuIdx].trim() : undefined,
      barcode: barcodeIdx !== -1 && row[barcodeIdx] ? row[barcodeIdx].trim() : undefined,
      spiceLevel,
    });
  }

  return {
    items,
    errors,
    totalParsed: items.length,
  };
}

export const SAMPLE_MENU_CSV = [
  "Category,Item Name,Price,Half Price,Food Type,Tax Rate %,Description,SKU,Barcode,Spicy Level",
  "Starters,Paneer Tikka,280,160,Veg,5,Marinated cottage cheese grilled in tandoor,PT-01,,MEDIUM",
  "Starters,Chicken Tikka,340,190,Non-Veg,5,Succulent chicken chunks roasted with tandoori spices,CT-01,,HOT",
  "Main Course,Butter Chicken,380,220,Non-Veg,5,Tender chicken simmered in rich buttery tomato gravy,BC-01,,MILD",
  "Main Course,Dal Makhani,260,150,Veg,5,Slow-cooked black lentils with cream and butter,DM-01,,NONE",
  "Breads,Butter Naan,60,,Veg,5,Traditional clay oven flatbread with butter,BN-01,,NONE",
  "Breads,Garlic Naan,80,,Veg,5,Tandoori flatbread topped with minced garlic and coriander,GN-01,,NONE",
  "Rice & Biryani,Hyderabadi Chicken Biryani,350,,Non-Veg,5,Aromatic basmati rice cooked with spiced chicken and saffron,HB-01,,HOT",
  "Desserts,Gulab Jamun,120,,Veg,5,Warm milk dumplings soaked in cardamom sugar syrup,GJ-01,,NONE",
  "Beverages,Sweet Lassi,90,,Veg,5,Traditional churned sweet yogurt drink,SL-01,,NONE",
].join("\n");
