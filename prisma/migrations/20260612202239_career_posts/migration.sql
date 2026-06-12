-- CreateTable
CREATE TABLE "CareerPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "salaryRange" TEXT,
    "deadline" TIMESTAMP(3),
    "excerpt" TEXT,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT,
    "requirements" TEXT,
    "benefits" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareerPost_slug_key" ON "CareerPost"("slug");

-- CreateIndex
CREATE INDEX "CareerPost_slug_idx" ON "CareerPost"("slug");

-- CreateIndex
CREATE INDEX "CareerPost_status_idx" ON "CareerPost"("status");

-- CreateIndex
CREATE INDEX "CareerPost_createdAt_idx" ON "CareerPost"("createdAt");
