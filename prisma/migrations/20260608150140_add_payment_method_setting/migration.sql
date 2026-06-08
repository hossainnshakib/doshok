-- CreateTable
CREATE TABLE "PaymentMethodSetting" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT 'SANDBOX',
    "supportsFullPayment" BOOLEAN NOT NULL DEFAULT false,
    "supportsPartialPayment" BOOLEAN NOT NULL DEFAULT false,
    "supportsCodDeliveryCharge" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "credentialsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodSetting_provider_key" ON "PaymentMethodSetting"("provider");
