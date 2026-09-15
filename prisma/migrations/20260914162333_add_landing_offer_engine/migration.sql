-- CreateTable
CREATE TABLE "LandingPageOffer" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badge" TEXT,
    "pricingType" TEXT NOT NULL DEFAULT 'FIXED',
    "offerPrice" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageOfferItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "landingPageProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageOfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingPageOffer_landingPageId_idx" ON "LandingPageOffer"("landingPageId");

-- CreateIndex
CREATE INDEX "LandingPageOffer_enabled_idx" ON "LandingPageOffer"("enabled");

-- CreateIndex
CREATE INDEX "LandingPageOfferItem_offerId_idx" ON "LandingPageOfferItem"("offerId");

-- CreateIndex
CREATE INDEX "LandingPageOfferItem_landingPageProductId_idx" ON "LandingPageOfferItem"("landingPageProductId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPageOfferItem_offerId_landingPageProductId_key" ON "LandingPageOfferItem"("offerId", "landingPageProductId");

-- AddForeignKey
ALTER TABLE "LandingPageOffer" ADD CONSTRAINT "LandingPageOffer_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageOfferItem" ADD CONSTRAINT "LandingPageOfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "LandingPageOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageOfferItem" ADD CONSTRAINT "LandingPageOfferItem_landingPageProductId_fkey" FOREIGN KEY ("landingPageProductId") REFERENCES "LandingPageProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
