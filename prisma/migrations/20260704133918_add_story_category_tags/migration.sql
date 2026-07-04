-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "category" TEXT,
ADD COLUMN     "tags" TEXT;

-- CreateIndex
CREATE INDEX "Story_category_idx" ON "Story"("category");
