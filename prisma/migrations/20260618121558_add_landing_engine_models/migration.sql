/*
  Warnings:

  - You are about to drop the column `customQuestionField` on the `LandingPageSetting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AbandonedCheckout" ALTER COLUMN "lastStep" DROP NOT NULL,
ALTER COLUMN "lastStep" DROP DEFAULT,
ALTER COLUMN "cartItems" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LandingPageSetting" DROP COLUMN "customQuestionField",
ADD COLUMN     "landingCheckoutCta" TEXT,
ADD COLUMN     "landingCheckoutSubtitle" TEXT,
ADD COLUMN     "landingCheckoutTitle" TEXT,
ADD COLUMN     "landingGalleryLayout" TEXT DEFAULT 'grid',
ADD COLUMN     "landingProductSummaryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "landingSectionOrder" JSONB,
ADD COLUMN     "landingVariantSectionEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "LandingBenefit" (
    "id" TEXT NOT NULL,
    "landingPageSettingId" TEXT NOT NULL,
    "icon" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingFaqItem" (
    "id" TEXT NOT NULL,
    "landingPageSettingId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingFaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingTestimonial" (
    "id" TEXT NOT NULL,
    "landingPageSettingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "text" TEXT NOT NULL,
    "image" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingGalleryImage" (
    "id" TEXT NOT NULL,
    "landingPageSettingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingBenefit_landingPageSettingId_idx" ON "LandingBenefit"("landingPageSettingId");

-- CreateIndex
CREATE INDEX "LandingFaqItem_landingPageSettingId_idx" ON "LandingFaqItem"("landingPageSettingId");

-- CreateIndex
CREATE INDEX "LandingTestimonial_landingPageSettingId_idx" ON "LandingTestimonial"("landingPageSettingId");

-- CreateIndex
CREATE INDEX "LandingGalleryImage_landingPageSettingId_idx" ON "LandingGalleryImage"("landingPageSettingId");

-- AddForeignKey
ALTER TABLE "LandingBenefit" ADD CONSTRAINT "LandingBenefit_landingPageSettingId_fkey" FOREIGN KEY ("landingPageSettingId") REFERENCES "LandingPageSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingFaqItem" ADD CONSTRAINT "LandingFaqItem_landingPageSettingId_fkey" FOREIGN KEY ("landingPageSettingId") REFERENCES "LandingPageSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingTestimonial" ADD CONSTRAINT "LandingTestimonial_landingPageSettingId_fkey" FOREIGN KEY ("landingPageSettingId") REFERENCES "LandingPageSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingGalleryImage" ADD CONSTRAINT "LandingGalleryImage_landingPageSettingId_fkey" FOREIGN KEY ("landingPageSettingId") REFERENCES "LandingPageSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
