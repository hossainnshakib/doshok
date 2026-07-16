-- AlterTable
ALTER TABLE "CourierLog" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "finalResponseToFrontend" JSONB,
ADD COLUMN     "parsedConsignmentId" TEXT,
ADD COLUMN     "parsedTrackingCode" TEXT;

-- CreateIndex
CREATE INDEX "CourierLog_correlationId_idx" ON "CourierLog"("correlationId");

-- CreateIndex
CREATE INDEX "CourierStore_providerCode_idx" ON "CourierStore"("providerCode");

-- CreateIndex
CREATE INDEX "CourierToken_providerCode_idx" ON "CourierToken"("providerCode");
