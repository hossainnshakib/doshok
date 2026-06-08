-- AlterTable
ALTER TABLE "AbandonedCheckout" ADD COLUMN     "contacted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT;
