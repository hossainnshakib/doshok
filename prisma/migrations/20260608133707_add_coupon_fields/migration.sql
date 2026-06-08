-- AlterTable
ALTER TABLE "AbandonedCheckout" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCode" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "defaultCouponCode" TEXT;
