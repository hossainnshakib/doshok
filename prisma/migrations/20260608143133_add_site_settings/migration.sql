-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "brandName" TEXT NOT NULL DEFAULT 'DOSHOK',
    "supportEmail" TEXT NOT NULL DEFAULT 'hello@doshok.com',
    "phone" TEXT NOT NULL DEFAULT '+880 1XXXXXXXXX',
    "whatsapp" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "address" TEXT NOT NULL DEFAULT 'We deliver across all districts of Bangladesh. Our operation hub is in Chattogram.',
    "footerText" TEXT NOT NULL DEFAULT 'Premium Bangladeshi fashion for the modern wardrobe.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
