-- Add landingPageItemVariantId to OrderItem for precise landing variant attribution.
-- This column tracks which LandingPageItemVariant was reserved, enabling accurate
-- stock lifecycle management (reservation release, finalization, return/restore).

ALTER TABLE "OrderItem" ADD COLUMN "landingPageItemVariantId" TEXT;

CREATE INDEX "OrderItem_landingPageItemVariantId_idx" ON "OrderItem"("landingPageItemVariantId");

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_landingPageItemVariantId_fkey" 
  FOREIGN KEY ("landingPageItemVariantId") REFERENCES "LandingPageItemVariant"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
