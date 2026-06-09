-- Add security fields to AbandonedCheckout
-- draftToken: unique token for client-side auth
-- source: where the checkout originated (checkout, landing)
-- lastSeenAt: when the user was last active

-- 1. Add columns as nullable first
ALTER TABLE "AbandonedCheckout" ADD COLUMN "draftToken" TEXT;
ALTER TABLE "AbandonedCheckout" ADD COLUMN "source" TEXT;
ALTER TABLE "AbandonedCheckout" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- 2. Backfill draftToken for existing rows
UPDATE "AbandonedCheckout" SET "draftToken" = gen_random_uuid()::text WHERE "draftToken" IS NULL;

-- 3. Make draftToken NOT NULL
ALTER TABLE "AbandonedCheckout" ALTER COLUMN "draftToken" SET NOT NULL;

-- 4. Add unique constraint and indexes
CREATE UNIQUE INDEX "AbandonedCheckout_draftToken_key" ON "AbandonedCheckout"("draftToken");
CREATE INDEX "AbandonedCheckout_email_idx" ON "AbandonedCheckout"("email");
CREATE INDEX "AbandonedCheckout_draftToken_idx" ON "AbandonedCheckout"("draftToken");
