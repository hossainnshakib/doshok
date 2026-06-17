-- Add customerKey column (nullable first for backfill)
ALTER TABLE "CouponUsage" ADD COLUMN "customerKey" TEXT;

-- Backfill: normalize identity as COALESCE("userId", "email")
UPDATE "CouponUsage" SET "customerKey" = COALESCE("userId", "email");

-- Remove duplicates: keep the earliest row per (couponId, customerKey)
DELETE FROM "CouponUsage"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT "id", ROW_NUMBER() OVER (
      PARTITION BY "couponId", "customerKey"
      ORDER BY "createdAt" ASC
    ) AS rn
    FROM "CouponUsage"
  ) t
  WHERE t.rn > 1
);

-- Now safe to make non-nullable
ALTER TABLE "CouponUsage" ALTER COLUMN "customerKey" SET NOT NULL;

-- Add unique constraint (creates index automatically)
CREATE UNIQUE INDEX "CouponUsage_couponId_customerKey_key" ON "CouponUsage"("couponId", "customerKey");
