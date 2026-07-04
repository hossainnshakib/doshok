/*
  Warnings:

  - You are about to drop the column `category` on the `Story` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Story_category_idx";

-- AlterTable
ALTER TABLE "Story" DROP COLUMN "category",
ADD COLUMN     "storyCategoryId" TEXT;

-- CreateTable
CREATE TABLE "StoryCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryCategory_slug_key" ON "StoryCategory"("slug");

-- CreateIndex
CREATE INDEX "StoryCategory_slug_idx" ON "StoryCategory"("slug");

-- CreateIndex
CREATE INDEX "StoryCategory_isActive_idx" ON "StoryCategory"("isActive");

-- CreateIndex
CREATE INDEX "StoryCategory_sortOrder_idx" ON "StoryCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "Story_storyCategoryId_idx" ON "Story"("storyCategoryId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_storyCategoryId_fkey" FOREIGN KEY ("storyCategoryId") REFERENCES "StoryCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
