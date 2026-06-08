-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "landingCopy" TEXT,
ADD COLUMN     "landingHeadline" TEXT,
ADD COLUMN     "landingHeroImage" TEXT,
ADD COLUMN     "landingSubheadline" TEXT,
ADD COLUMN     "pageType" TEXT NOT NULL DEFAULT 'NORMAL';
