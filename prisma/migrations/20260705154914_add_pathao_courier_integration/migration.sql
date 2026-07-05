-- CreateTable
CREATE TABLE "CourierProvider" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "baseUrl" TEXT,
    "credentials" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierStore" (
    "id" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT,
    "merchantName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierCity" (
    "id" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierZone" (
    "id" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierArea" (
    "id" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierConsignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "storeId" TEXT,
    "consignmentId" TEXT,
    "trackingCode" TEXT,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "recipientAddress" TEXT,
    "deliveryType" TEXT,
    "itemType" TEXT,
    "itemQuantity" INTEGER,
    "itemWeight" DOUBLE PRECISION,
    "amountToCollect" INTEGER,
    "deliveryFee" INTEGER,
    "courierStatus" TEXT,
    "courierMessage" TEXT,
    "responseJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "CourierConsignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierToken" (
    "id" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierLog" (
    "id" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "orderId" TEXT,
    "action" TEXT NOT NULL,
    "requestUrl" TEXT,
    "requestMethod" TEXT,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "responseStatus" INTEGER,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierProvider_code_key" ON "CourierProvider"("code");

-- CreateIndex
CREATE INDEX "CourierProvider_code_idx" ON "CourierProvider"("code");

-- CreateIndex
CREATE INDEX "CourierStore_providerCode_idx" ON "CourierStore"("providerCode");

-- CreateIndex
CREATE UNIQUE INDEX "CourierStore_providerCode_storeId_key" ON "CourierStore"("providerCode", "storeId");

-- CreateIndex
CREATE INDEX "CourierCity_providerCode_idx" ON "CourierCity"("providerCode");

-- CreateIndex
CREATE UNIQUE INDEX "CourierCity_providerCode_cityId_key" ON "CourierCity"("providerCode", "cityId");

-- CreateIndex
CREATE INDEX "CourierZone_providerCode_idx" ON "CourierZone"("providerCode");

-- CreateIndex
CREATE INDEX "CourierZone_providerCode_cityId_idx" ON "CourierZone"("providerCode", "cityId");

-- CreateIndex
CREATE UNIQUE INDEX "CourierZone_providerCode_zoneId_key" ON "CourierZone"("providerCode", "zoneId");

-- CreateIndex
CREATE INDEX "CourierArea_providerCode_idx" ON "CourierArea"("providerCode");

-- CreateIndex
CREATE INDEX "CourierArea_providerCode_zoneId_idx" ON "CourierArea"("providerCode", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "CourierArea_providerCode_areaId_key" ON "CourierArea"("providerCode", "areaId");

-- CreateIndex
CREATE UNIQUE INDEX "CourierConsignment_orderId_key" ON "CourierConsignment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CourierConsignment_consignmentId_key" ON "CourierConsignment"("consignmentId");

-- CreateIndex
CREATE INDEX "CourierConsignment_providerCode_idx" ON "CourierConsignment"("providerCode");

-- CreateIndex
CREATE INDEX "CourierConsignment_consignmentId_idx" ON "CourierConsignment"("consignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CourierToken_providerCode_key" ON "CourierToken"("providerCode");

-- CreateIndex
CREATE INDEX "CourierToken_providerCode_idx" ON "CourierToken"("providerCode");

-- CreateIndex
CREATE INDEX "CourierLog_providerCode_idx" ON "CourierLog"("providerCode");

-- CreateIndex
CREATE INDEX "CourierLog_orderId_idx" ON "CourierLog"("orderId");

-- CreateIndex
CREATE INDEX "CourierLog_createdAt_idx" ON "CourierLog"("createdAt");
