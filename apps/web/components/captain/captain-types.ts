export interface CaptainCartLine {
  key: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  isVeg: boolean;
  modifierIds: string[];
  modifierLabels: string[];
  kitchenNote?: string;
  portion?: "HALF" | "FULL" | "CUSTOM";
  customPrice?: number;
  customLabel?: string;
}

export function generateCaptainCartKey(
  menuItemId: string,
  modifierIds: string[] = [],
  portion?: string,
  kitchenNote?: string,
): string {
  const sortedMods = [...modifierIds].sort().join(",");
  const p = portion ?? "";
  const note = kitchenNote ? kitchenNote.trim().toLowerCase() : "";
  return `${menuItemId}::${sortedMods}::${p}::${note}`;
}
