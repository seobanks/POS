-- AlterTable: Add Petpooja menu item fields
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "shortCode" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "onlineDisplayName" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "isHighlighted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "qrOrderingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "restrictChargesAndTax" BOOLEAN NOT NULL DEFAULT false;
