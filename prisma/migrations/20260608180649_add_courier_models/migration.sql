-- CreateTable
CREATE TABLE "CourierProviderSetting" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'SANDBOX',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "credentialsJson" TEXT,
    "pickupName" TEXT,
    "pickupPhone" TEXT,
    "pickupAddress" TEXT,
    "pickupCity" TEXT,
    "pickupZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierProviderSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierProvider" TEXT NOT NULL DEFAULT 'PATHAO',
    "status" TEXT NOT NULL DEFAULT 'NOT_CREATED',
    "trackingCode" TEXT,
    "consignmentId" TEXT,
    "courierResponseJson" TEXT,
    "customerNote" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierProviderSetting_provider_key" ON "CourierProviderSetting"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "OrderShipment_orderId_key" ON "OrderShipment"("orderId");

-- AddForeignKey
ALTER TABLE "OrderShipment" ADD CONSTRAINT "OrderShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
