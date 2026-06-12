-- CreateTable
CREATE TABLE "SizeChart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChartRow" (
    "id" TEXT NOT NULL,
    "sizeChartId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "measurements" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeChartRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSizeChart" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeChartId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SizeChart_slug_key" ON "SizeChart"("slug");

-- CreateIndex
CREATE INDEX "SizeChart_slug_idx" ON "SizeChart"("slug");

-- CreateIndex
CREATE INDEX "SizeChartRow_sizeChartId_idx" ON "SizeChartRow"("sizeChartId");

-- CreateIndex
CREATE INDEX "ProductSizeChart_productId_idx" ON "ProductSizeChart"("productId");

-- CreateIndex
CREATE INDEX "ProductSizeChart_sizeChartId_idx" ON "ProductSizeChart"("sizeChartId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSizeChart_productId_sizeChartId_key" ON "ProductSizeChart"("productId", "sizeChartId");

-- AddForeignKey
ALTER TABLE "SizeChartRow" ADD CONSTRAINT "SizeChartRow_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizeChart" ADD CONSTRAINT "ProductSizeChart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizeChart" ADD CONSTRAINT "ProductSizeChart_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
