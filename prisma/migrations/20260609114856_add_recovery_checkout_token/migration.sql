-- CreateTable
CREATE TABLE "RecoveryCheckoutToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "abandonedCheckoutId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" TEXT,

    CONSTRAINT "RecoveryCheckoutToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryCheckoutToken_token_key" ON "RecoveryCheckoutToken"("token");

-- AddForeignKey
ALTER TABLE "RecoveryCheckoutToken" ADD CONSTRAINT "RecoveryCheckoutToken_abandonedCheckoutId_fkey" FOREIGN KEY ("abandonedCheckoutId") REFERENCES "AbandonedCheckout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCheckoutToken" ADD CONSTRAINT "RecoveryCheckoutToken_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
