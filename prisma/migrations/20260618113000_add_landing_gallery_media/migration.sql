ALTER TABLE "LandingPageSetting"
ADD COLUMN "landingGalleryPrimaryImage" TEXT,
ADD COLUMN "landingGallerySecondaryImage" TEXT,
ADD COLUMN "landingGalleryTertiaryImage" TEXT,
ADD COLUMN "landingGalleryVideoUrl" TEXT,
ADD COLUMN "landingOfferText" TEXT,
ADD COLUMN "landingDisplayPrice" INTEGER,
ADD COLUMN "landingDisplayOldPrice" INTEGER,
ADD COLUMN "landingTestimonials" JSONB,
ADD COLUMN "landingGalleryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "landingReviewsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "landingFaqEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "landingHighlightsEnabled" BOOLEAN NOT NULL DEFAULT true;
