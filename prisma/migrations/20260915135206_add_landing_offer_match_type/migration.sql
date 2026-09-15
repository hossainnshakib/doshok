-- AlterTable
ALTER TABLE "LandingPageOffer" ADD COLUMN     "matchType" TEXT NOT NULL DEFAULT 'EXACT_COMBINATION',
ADD COLUMN     "minQuantity" INTEGER;
