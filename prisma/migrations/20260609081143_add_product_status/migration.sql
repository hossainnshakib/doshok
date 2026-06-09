-- Add status column as nullable first
ALTER TABLE "Product" ADD COLUMN "status" TEXT;

-- Migrate existing data: published=true → Active, published=false → Draft
UPDATE "Product" SET "status" = CASE WHEN "published" = true THEN 'Active' ELSE 'Draft' END;

-- Make status required with default
ALTER TABLE "Product" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'Draft';

-- Drop the old published column
ALTER TABLE "Product" DROP COLUMN "published";
