-- Migration: Landing Page Item Architecture
-- Replaces LandingPageProduct junction with independent LandingPageItem.
-- This migration is forward-only and safe for both shadow DB and production.

-- Step 1: Create new tables first
CREATE TABLE "LandingPageItem" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "price" INTEGER NOT NULL,
    "compareAtPrice" INTEGER,
    "images" TEXT[],
    "sku" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ctaLabel" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "importedFromProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LandingPageItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingPageItemVariant" (
    "id" TEXT NOT NULL,
    "landingPageItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "colorHex" TEXT,
    "sku" TEXT,
    "priceOverride" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LandingPageItemVariant_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add new columns to existing tables BEFORE migrating data
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN "landingPageItemId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "landingPageItemVariantId" TEXT;
ALTER TABLE "LandingPageOfferItem" ADD COLUMN "landingPageItemId" TEXT;

-- Step 3: Migrate data from LandingPageProduct to LandingPageItem
INSERT INTO "LandingPageItem" ("id", "landingPageId", "name", "description", "price", "compareAtPrice", "images", "sku", "sortOrder", "isPrimary", "active", "ctaLabel", "stock", "reservedStock", "importedFromProductId", "createdAt", "updatedAt")
SELECT 
    "id",
    "landingPageId",
    COALESCE("displayTitle", 'Imported Product') AS "name",
    "displayDescription" AS "description",
    COALESCE("overridePrice", 0) AS "price",
    NULL AS "compareAtPrice",
    CASE WHEN "displayImage" IS NOT NULL THEN ARRAY["displayImage"] ELSE '{}'::text[] END AS "images",
    NULL AS "sku",
    "sortOrder",
    false AS "isPrimary",
    true AS "active",
    "ctaLabel",
    0 AS "stock",
    0 AS "reservedStock",
    "productId" AS "importedFromProductId",
    "createdAt",
    "updatedAt"
FROM "LandingPageProduct"
ON CONFLICT DO NOTHING;

-- Step 4: Migrate OfferItem references (old FK still points to LandingPageProduct.id = LandingPageItem.id)
UPDATE "LandingPageOfferItem" 
SET "landingPageItemId" = "landingPageProductId";

-- Step 5: Drop old foreign keys and indexes
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";
ALTER TABLE "LandingPageProduct" DROP CONSTRAINT IF EXISTS "LandingPageProduct_landingPageId_fkey";
ALTER TABLE "LandingPageProduct" DROP CONSTRAINT IF EXISTS "LandingPageProduct_productId_fkey";
ALTER TABLE "LandingPageOfferItem" DROP CONSTRAINT IF EXISTS "LandingPageOfferItem_landingPageProductId_fkey";
DROP INDEX IF EXISTS "LandingPageOfferItem_landingPageProductId_idx";
DROP INDEX IF EXISTS "LandingPageOfferItem_offerId_landingPageProductId_key";

-- Step 6: Drop old column and table
ALTER TABLE "LandingPageOfferItem" DROP COLUMN "landingPageProductId";
DROP TABLE "LandingPageProduct";

-- Step 7: Create indexes
CREATE INDEX "LandingPageItem_importedFromProductId_idx" ON "LandingPageItem"("importedFromProductId");
CREATE INDEX "LandingPageItem_landingPageId_idx" ON "LandingPageItem"("landingPageId");
CREATE INDEX "LandingPageItemVariant_landingPageItemId_idx" ON "LandingPageItemVariant"("landingPageItemId");
CREATE UNIQUE INDEX "LandingPageItemVariant_landingPageItemId_size_color_key" ON "LandingPageItemVariant"("landingPageItemId", "size", "color");
CREATE INDEX "LandingPageOfferItem_landingPageItemId_idx" ON "LandingPageOfferItem"("landingPageItemId");
CREATE UNIQUE INDEX "LandingPageOfferItem_offerId_landingPageItemId_key" ON "LandingPageOfferItem"("offerId", "landingPageItemId");
CREATE INDEX "OrderItem_landingPageItemId_idx" ON "OrderItem"("landingPageItemId");
CREATE INDEX "OrderItem_landingPageItemVariantId_idx" ON "OrderItem"("landingPageItemVariantId");

-- Step 8: Add foreign keys
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_landingPageItemId_fkey" FOREIGN KEY ("landingPageItemId") REFERENCES "LandingPageItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_landingPageItemVariantId_fkey" FOREIGN KEY ("landingPageItemVariantId") REFERENCES "LandingPageItemVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LandingPageOfferItem" ADD CONSTRAINT "LandingPageOfferItem_landingPageItemId_fkey" FOREIGN KEY ("landingPageItemId") REFERENCES "LandingPageItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandingPageItem" ADD CONSTRAINT "LandingPageItem_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandingPageItemVariant" ADD CONSTRAINT "LandingPageItemVariant_landingPageItemId_fkey" FOREIGN KEY ("landingPageItemId") REFERENCES "LandingPageItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
