-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "landingPageOfferId" TEXT;

-- CreateIndex
CREATE INDEX "Order_landingPageOfferId_idx" ON "Order"("landingPageOfferId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_landingPageOfferId_fkey" FOREIGN KEY ("landingPageOfferId") REFERENCES "LandingPageOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
