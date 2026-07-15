-- Add environment column to CourierToken
ALTER TABLE "CourierToken" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'sandbox';
UPDATE "CourierToken" SET "environment" = 'sandbox';

-- Drop old unique constraint and create new one
DROP INDEX IF EXISTS "CourierToken_providerCode_key";
CREATE UNIQUE INDEX "CourierToken_providerCode_environment_key" ON "CourierToken"("providerCode", "environment");
DROP INDEX IF EXISTS "CourierToken_providerCode_idx";
CREATE INDEX "CourierToken_environment_idx" ON "CourierToken"("environment");

-- Add environment column to CourierStore
ALTER TABLE "CourierStore" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'sandbox';
UPDATE "CourierStore" SET "environment" = 'sandbox';

-- Drop old unique constraint and create new one
DROP INDEX IF EXISTS "CourierStore_providerCode_storeId_key";
CREATE UNIQUE INDEX "CourierStore_providerCode_environment_storeId_key" ON "CourierStore"("providerCode", "environment", "storeId");
DROP INDEX IF EXISTS "CourierStore_providerCode_idx";
CREATE INDEX "CourierStore_environment_idx" ON "CourierStore"("environment");

-- Add environment column to CourierCity
ALTER TABLE "CourierCity" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'sandbox';
UPDATE "CourierCity" SET "environment" = 'sandbox';

-- Drop old unique constraint and create new one
DROP INDEX IF EXISTS "CourierCity_providerCode_cityId_key";
CREATE UNIQUE INDEX "CourierCity_providerCode_environment_cityId_key" ON "CourierCity"("providerCode", "environment", "cityId");
CREATE INDEX "CourierCity_environment_idx" ON "CourierCity"("environment");

-- Add environment column to CourierZone
ALTER TABLE "CourierZone" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'sandbox';
UPDATE "CourierZone" SET "environment" = 'sandbox';

-- Drop old unique constraint and create new one
DROP INDEX IF EXISTS "CourierZone_providerCode_zoneId_key";
CREATE UNIQUE INDEX "CourierZone_providerCode_environment_zoneId_key" ON "CourierZone"("providerCode", "environment", "zoneId");
CREATE INDEX "CourierZone_environment_idx" ON "CourierZone"("environment");

-- Add environment column to CourierArea
ALTER TABLE "CourierArea" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'sandbox';
UPDATE "CourierArea" SET "environment" = 'sandbox';

-- Drop old unique constraint and create new one
DROP INDEX IF EXISTS "CourierArea_providerCode_areaId_key";
CREATE UNIQUE INDEX "CourierArea_providerCode_environment_areaId_key" ON "CourierArea"("providerCode", "environment", "areaId");
CREATE INDEX "CourierArea_environment_idx" ON "CourierArea"("environment");

-- Add environment column to CourierConsignment
ALTER TABLE "CourierConsignment" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'sandbox';
UPDATE "CourierConsignment" SET "environment" = 'sandbox';
CREATE INDEX "CourierConsignment_environment_idx" ON "CourierConsignment"("environment");

-- Add environment column to CourierLog
ALTER TABLE "CourierLog" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'sandbox';
UPDATE "CourierLog" SET "environment" = 'sandbox';
CREATE INDEX "CourierLog_environment_idx" ON "CourierLog"("environment");
