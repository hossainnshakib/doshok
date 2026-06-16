/*
  Warnings:

  - You are about to drop the column `bkashTrxId` on the `Order` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Order_bkashTrxId_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "bkashTrxId";

-- AlterTable
ALTER TABLE "PaymentTransaction" ALTER COLUMN "provider" SET DEFAULT 'COD';
