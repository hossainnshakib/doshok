-- Payment-independent abandoned checkout foundation.
-- Evolves the previous abandoned checkout draft table into checkout-intent recovery.

DROP TABLE IF EXISTS "RecoveryCheckoutToken";

ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "address";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "color";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "contacted";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "deliveryZone";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "landingSlug";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "productId";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "size";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "source";
ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "variantId";

DROP INDEX IF EXISTS "AbandonedCheckout_draftToken_idx";
DROP INDEX IF EXISTS "AbandonedCheckout_draftToken_key";

ALTER TABLE "AbandonedCheckout" RENAME COLUMN "draftToken" TO "token";
ALTER TABLE "AbandonedCheckout" RENAME COLUMN "lastSeenAt" TO "lastActivityAt";
ALTER TABLE "AbandonedCheckout" RENAME COLUMN "step" TO "lastStep";

ALTER TABLE "AbandonedCheckout" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AbandonedCheckout" ADD COLUMN IF NOT EXISTS "cartItems" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "AbandonedCheckout" ADD COLUMN IF NOT EXISTS "checkoutData" TEXT;
ALTER TABLE "AbandonedCheckout" ADD COLUMN IF NOT EXISTS "deliveryFee" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AbandonedCheckout" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "AbandonedCheckout" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "AbandonedCheckout" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

UPDATE "AbandonedCheckout"
SET "checkoutData" = COALESCE("data", '{}')
WHERE "checkoutData" IS NULL;

UPDATE "AbandonedCheckout"
SET "lastActivityAt" = COALESCE("lastActivityAt", "updatedAt", "createdAt", CURRENT_TIMESTAMP);

UPDATE "AbandonedCheckout"
SET "expiresAt" = COALESCE("expiresAt", "createdAt" + INTERVAL '7 days');

ALTER TABLE "AbandonedCheckout" ALTER COLUMN "lastActivityAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AbandonedCheckout" ALTER COLUMN "lastActivityAt" SET NOT NULL;

ALTER TABLE "AbandonedCheckout" DROP COLUMN IF EXISTS "data";

CREATE UNIQUE INDEX "AbandonedCheckout_token_key" ON "AbandonedCheckout"("token");
CREATE INDEX "AbandonedCheckout_status_idx" ON "AbandonedCheckout"("status");
CREATE INDEX "AbandonedCheckout_phone_idx" ON "AbandonedCheckout"("phone");
CREATE INDEX "AbandonedCheckout_userId_idx" ON "AbandonedCheckout"("userId");
CREATE INDEX "AbandonedCheckout_lastActivityAt_idx" ON "AbandonedCheckout"("lastActivityAt");
CREATE INDEX "AbandonedCheckout_expiresAt_idx" ON "AbandonedCheckout"("expiresAt");
