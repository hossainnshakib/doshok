-- Compatibility migration for landingPageItemVariantId on OrderItem.
--
-- Migration 1 (20260916150000_landing_page_item_architecture) already introduces:
--   - landingPageItemVariantId column on OrderItem
--   - OrderItem_landingPageItemVariantId_idx index
--   - OrderItem_landingPageItemVariantId_fkey foreign key
--
-- This migration is a no-op when Migration 1 has already run.
-- It uses idempotent PostgreSQL statements so it can run safely
-- on both fresh databases (after Migration 1) and production databases
-- that may be at different migration states.
--
-- DO NOT DELETE this migration file — it preserves migration history
-- and ensures the chain is deployable to production.

-- Idempotent column addition (PostgreSQL 9.6+)
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "landingPageItemVariantId" TEXT;

-- Idempotent index creation (PostgreSQL 9.5+)
CREATE INDEX IF NOT EXISTS "OrderItem_landingPageItemVariantId_idx" ON "OrderItem"("landingPageItemVariantId");

-- Idempotent foreign key creation - only if both tables exist
-- Avoids regclass cast which fails if table doesn't exist at parse time
DO $$
BEGIN
    -- Only create FK if both tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'OrderItem')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'LandingPageItemVariant')
    THEN
        -- Check if FK already exists using information_schema (safe, no regclass cast)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'OrderItem_landingPageItemVariantId_fkey'
              AND table_name = 'OrderItem'
              AND constraint_type = 'FOREIGN KEY'
        ) THEN
            ALTER TABLE "OrderItem"
            ADD CONSTRAINT "OrderItem_landingPageItemVariantId_fkey"
            FOREIGN KEY ("landingPageItemVariantId") REFERENCES "LandingPageItemVariant"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;