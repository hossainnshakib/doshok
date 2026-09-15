-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "landingPageId" TEXT;

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "creationMode" TEXT NOT NULL DEFAULT 'existing_product',
    "sourceProductId" TEXT,
    "template" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "robotsIndex" BOOLEAN NOT NULL DEFAULT false,
    "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageProduct" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "displayTitle" TEXT,
    "displayDescription" TEXT,
    "displayImage" TEXT,
    "overridePrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPageSection" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPageSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "LandingPage"("slug");

-- CreateIndex
CREATE INDEX "LandingPage_slug_idx" ON "LandingPage"("slug");

-- CreateIndex
CREATE INDEX "LandingPage_status_idx" ON "LandingPage"("status");

-- CreateIndex
CREATE INDEX "LandingPage_sourceProductId_idx" ON "LandingPage"("sourceProductId");

-- CreateIndex
CREATE INDEX "LandingPage_createdAt_idx" ON "LandingPage"("createdAt");

-- CreateIndex
CREATE INDEX "LandingPageProduct_landingPageId_idx" ON "LandingPageProduct"("landingPageId");

-- CreateIndex
CREATE INDEX "LandingPageProduct_productId_idx" ON "LandingPageProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPageProduct_landingPageId_productId_key" ON "LandingPageProduct"("landingPageId", "productId");

-- CreateIndex
CREATE INDEX "LandingPageSection_landingPageId_idx" ON "LandingPageSection"("landingPageId");

-- CreateIndex
CREATE INDEX "LandingPageSection_type_idx" ON "LandingPageSection"("type");

-- CreateIndex
CREATE INDEX "Order_landingPageId_idx" ON "Order"("landingPageId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageProduct" ADD CONSTRAINT "LandingPageProduct_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageProduct" ADD CONSTRAINT "LandingPageProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingPageSection" ADD CONSTRAINT "LandingPageSection_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
