-- Drop landing tables (respecting FK constraints)
DROP TABLE "LandingGalleryImage" CASCADE;
DROP TABLE "LandingTestimonial" CASCADE;
DROP TABLE "LandingFaqItem" CASCADE;
DROP TABLE "LandingBenefit" CASCADE;
DROP TABLE "LandingPageSetting" CASCADE;

-- Drop landing columns from Product
ALTER TABLE "Product" DROP COLUMN "pageType";
ALTER TABLE "Product" DROP COLUMN "landingHeadline";
ALTER TABLE "Product" DROP COLUMN "landingSubheadline";
ALTER TABLE "Product" DROP COLUMN "landingCopy";
ALTER TABLE "Product" DROP COLUMN "landingHeroImage";
