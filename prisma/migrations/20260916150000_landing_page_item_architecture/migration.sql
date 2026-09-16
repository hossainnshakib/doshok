-- Migration: Landing Page Item Architecture
-- Replaces LandingPageProduct junction with independent LandingPageItem.
-- This migration preserves production data by joining with Product for fallback values.

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
-- Join with Product to get fallback values for name, description, price, compareAtPrice, images.
-- Preserve IDs exactly so LandingPageOfferItem references remain valid.
-- Set isPrimary=true for the first item per landingPage (by sortOrder, then id).
-- Set stock to a high default (999999) for migrated items to preserve purchasability.
-- This is a one-time migration snapshot; admins should review and configure proper stock levels.
WITH ranked_items AS (
    SELECT
        lpp."id",
        lpp."landingPageId",
        lpp."productId",
        lpp."sortOrder",
        lpp."displayTitle",
        lpp."displayDescription",
        lpp."displayImage",
        lpp."overridePrice",
        lpp."ctaLabel",
        lpp."createdAt",
        lpp."updatedAt",
        p."name" AS product_name,
        p."description" AS product_description,
        p."shortDescription" AS product_short_description,
        p."price" AS product_price,
        p."oldPrice" AS product_old_price,
        p."images" AS product_images,
        ROW_NUMBER() OVER (PARTITION BY lpp."landingPageId" ORDER BY lpp."sortOrder" ASC, lpp."id" ASC) AS rn
    FROM "LandingPageProduct" lpp
    INNER JOIN "Product" p ON lpp."productId" = p."id"
)
INSERT INTO "LandingPageItem" (
    "id", "landingPageId", "name", "description", "shortDescription",
    "price", "compareAtPrice", "images", "sku", "sortOrder",
    "isPrimary", "active", "ctaLabel", "stock", "reservedStock",
    "importedFromProductId", "createdAt", "updatedAt"
)
SELECT
    "id",
    "landingPageId",
    COALESCE(NULLIF("displayTitle", ''), product_name) AS "name",
    COALESCE(NULLIF("displayDescription", ''), product_description) AS "description",
    product_short_description AS "shortDescription",
    COALESCE("overridePrice", product_price) AS "price",
    CASE WHEN "overridePrice" IS NOT NULL THEN NULL ELSE product_old_price END AS "compareAtPrice",
    CASE
        WHEN "displayImage" IS NOT NULL AND "displayImage" != '' THEN ARRAY["displayImage"]
        ELSE product_images
    END AS "images",
    NULL AS "sku",
    "sortOrder",
    CASE WHEN rn = 1 THEN true ELSE false END AS "isPrimary",
    true AS "active",
    "ctaLabel",
    999999 AS "stock",
    0 AS "reservedStock",
    "productId" AS "importedFromProductId",
    "createdAt",
    "updatedAt"
FROM ranked_items;

-- Step 4: Migrate OfferItem references (old FK points to LandingPageProduct.id = LandingPageItem.id)
UPDATE "LandingPageOfferItem"
SET "landingPageItemId" = "landingPageProductId";

-- Step 5: Verify all offer item references have a corresponding LandingPageItem
-- This will fail the migration if any reference is orphaned, preventing silent data loss.
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM "LandingPageOfferItem" loi
    LEFT JOIN "LandingPageItem" li ON loi."landingPageItemId" = li."id"
    WHERE loi."landingPageItemId" IS NOT NULL AND li."id" IS NULL;

    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Migration aborted: % LandingPageOfferItem references have no corresponding LandingPageItem', orphaned_count;
    END IF;
END $$;

-- Step 6: Drop old foreign keys and indexes
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";
ALTER TABLE "LandingPageProduct" DROP CONSTRAINT IF EXISTS "LandingPageProduct_landingPageId_fkey";
ALTER TABLE "LandingPageProduct" DROP CONSTRAINT IF EXISTS "LandingPageProduct_productId_fkey";
ALTER TABLE "LandingPageOfferItem" DROP CONSTRAINT IF EXISTS "LandingPageOfferItem_landingPageProductId_fkey";
DROP INDEX IF EXISTS "LandingPageOfferItem_landingPageProductId_idx";
DROP INDEX IF EXISTS "LandingPageOfferItem_offerId_landingPageProductId_key";

-- Step 7: Drop old column and table
ALTER TABLE "LandingPageOfferItem" DROP COLUMN "landingPageProductId";
DROP TABLE "LandingPageProduct";

-- Step 8: Create indexes
CREATE INDEX "LandingPageItem_importedFromProductId_idx" ON "LandingPageItem"("importedFromProductId");
CREATE INDEX "LandingPageItem_landingPageId_idx" ON "LandingPageItem"("landingPageId");
CREATE INDEX "LandingPageItemVariant_landingPageItemId_idx" ON "LandingPageItemVariant"("landingPageItemId");
CREATE UNIQUE INDEX "LandingPageItemVariant_landingPageItemId_size_color_key" ON "LandingPageItemVariant"("landingPageItemId", "size", "color");
CREATE INDEX "LandingPageOfferItem_landingPageItemId_idx" ON "LandingPageOfferItem"("landingPageItemId");
CREATE UNIQUE INDEX "LandingPageOfferItem_offerId_landingPageItemId_key" ON "LandingPageOfferItem"("offerId", "landingPageItemId");
CREATE INDEX "OrderItem_landingPageItemId_idx" ON "OrderItem"("landingPageItemId");
CREATE INDEX "OrderItem_landingPageItemVariantId_idx" ON "OrderItem"("landingPageItemVariantId");

-- Step 9: Add foreign keys
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_landingPageItemId_fkey" FOREIGN KEY ("landingPageItemId") REFERENCES "LandingPageItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_landingPageItemVariantId_fkey" FOREIGN KEY ("landingPageItemVariantId") REFERENCES "LandingPageItemVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LandingPageOfferItem" ADD CONSTRAINT "LandingPageOfferItem_landingPageItemId_fkey" FOREIGN KEY ("landingPageItemId") REFERENCES "LandingPageItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandingPageItem" ADD CONSTRAINT "LandingPageItem_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandingPageItemVariant" ADD CONSTRAINT "LandingPageItemVariant_landingPageItemId_fkey" FOREIGN KEY ("landingPageItemId") REFERENCES "LandingPageItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;