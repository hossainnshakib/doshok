import { z } from "zod"
import type {
  BenefitsContent,
  BenefitIcon,
  CheckoutContent,
  FaqContent,
  GalleryContent,
  HeroContent,
  HeroCtaTarget,
  HeroLayout,
  OffersContent,
  ProductsContent,
  GalleryLayout,
  ReviewsContent,
  SectionType,
} from "./types"

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

// Site-relative path or absolute https URL. Rejects javascript:, data:, etc.
const safeUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2000)
  .refine(
    (v) => v.startsWith("/") || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v),
    "Must be an https URL or a site-relative path starting with /"
  )

const internalPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((v) => v.startsWith("/") && !v.startsWith("//"), "Custom link must be a site-relative path starting with /")

const productSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid product slug")

// ---------------------------------------------------------------------------
// HERO
// ---------------------------------------------------------------------------

export const HERO_CTA_TARGETS: { value: HeroCtaTarget; label: string }[] = [
  { value: "products", label: "Scroll to products" },
  { value: "product", label: "Linked product page" },
  { value: "checkout", label: "Scroll to checkout" },
  { value: "custom", label: "Custom internal link" },
]

export const HERO_LAYOUTS: { value: HeroLayout; label: string }[] = [
  { value: "split", label: "Split (text + media)" },
  { value: "centered", label: "Centered" },
  { value: "media-first", label: "Media first" },
]

const heroCtaSchema = z.object({
  label: z.string().trim().max(60).default("Shop Now"),
  target: z.enum(["products", "product", "checkout", "custom"]).default("products"),
  productSlug: productSlugSchema.optional().or(z.literal("")),
  customPath: z.string().trim().max(500).default(""),
}).superRefine((cta, ctx) => {
  if (cta.target === "product" && !cta.productSlug) {
    ctx.addIssue({ code: "custom", message: "Choose a product for this CTA target", path: ["productSlug"] })
  }
  if (cta.target === "custom") {
    const parsed = internalPathSchema.safeParse(cta.customPath)
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: "Custom link must start with /", path: ["customPath"] })
    }
  }
})

const heroMediaItemSchema = z.object({
  url: safeUrlSchema,
  alt: z.string().trim().max(160).default(""),
  productSlug: productSlugSchema.optional().or(z.literal("")),
})

export const heroContentSchema = z.object({
  eyebrow: z.string().trim().max(80).default(""),
  headline: z.string().trim().max(160).default(""),
  subheadline: z.string().trim().max(220).default(""),
  description: z.string().trim().max(1000).default(""),
  media: z.array(heroMediaItemSchema).max(3).default([]),
  layout: z.enum(["split", "centered", "media-first"]).default("split"),
  primaryCta: heroCtaSchema.default({ label: "Shop Now", target: "products", customPath: "" }),
  secondaryCta: heroCtaSchema.nullish().default(null),
  trustLine: z.string().trim().max(160).default(""),
  showPrice: z.boolean().default(false),
})

export function defaultHeroContent(headline = ""): HeroContent {
  return {
    eyebrow: "",
    headline,
    subheadline: "",
    description: "",
    media: [],
    layout: "split",
    primaryCta: { label: "Shop Now", target: "products" },
    secondaryCta: null,
    trustLine: "",
    showPrice: false,
  }
}

function truncate(text: string | null | undefined, max: number): string {
  const v = (text ?? "").trim()
  return v.length > max ? v.slice(0, max).trimEnd() : v
}

/**
 * Build initial HERO content from product snapshot data. Never overwrites —
 * used only at page creation and by the explicit "Use product content"
 * editor helper. Falls back to safe defaults when snapshot data is unusable.
 */
export function heroPrefillFromProduct(input: {
  name: string
  shortDescription?: string | null
  description?: string | null
  images?: string[]
}): HeroContent {
  const candidate = {
    ...defaultHeroContent(truncate(input.name, 160)),
    description: truncate(input.shortDescription || input.description, 1000),
    media: (input.images ?? []).slice(0, 3).map((url) => ({
      url,
      alt: truncate(input.name, 160),
    })),
    primaryCta: { label: "Shop Now", target: "products" as const },
  }
  const parsed = heroContentSchema.safeParse(candidate)
  return parsed.success ? parsed.data : defaultHeroContent(truncate(input.name, 160))
}

// ---------------------------------------------------------------------------
// BENEFITS
// ---------------------------------------------------------------------------

export const BENEFIT_ICONS: { value: BenefitIcon; label: string }[] = [
  { value: "truck", label: "Delivery" },
  { value: "shield", label: "Shield" },
  { value: "refresh", label: "Exchange" },
  { value: "badge", label: "Verified" },
  { value: "sparkles", label: "Sparkles" },
  { value: "leaf", label: "Fabric" },
  { value: "ruler", label: "Size guide" },
  { value: "card", label: "Payment" },
  { value: "headset", label: "Support" },
  { value: "package", label: "Package" },
  { value: "star", label: "Star" },
  { value: "zap", label: "Zap" },
]

export const BENEFIT_ICON_VALUES = BENEFIT_ICONS.map((i) => i.value) as [BenefitIcon, ...BenefitIcon[]]

export const MAX_BENEFITS = 8

const benefitItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  icon: z.enum(BENEFIT_ICON_VALUES),
  title: z.string().trim().min(1, "Benefit title is required").max(80),
  description: z.string().trim().max(300).default(""),
})

export const benefitsContentSchema = z.object({
  heading: z.string().trim().max(120).default(""),
  subheading: z.string().trim().max(300).default(""),
  items: z.array(benefitItemSchema).max(MAX_BENEFITS).default([]),
})

export function defaultBenefitsContent(): BenefitsContent {
  return { heading: "", subheading: "", items: [] }
}

// ---------------------------------------------------------------------------
// PRODUCTS (presentation layer over LandingPageItem relations)
// ---------------------------------------------------------------------------

export const productsContentSchema = z.object({
  heading: z.string().trim().max(120).default("Featured Products"),
  subheading: z.string().trim().max(300).default(""),
  showPrice: z.boolean().default(true),
  showOldPrice: z.boolean().default(true),
  showStock: z.boolean().default(false),
  ctaLabel: z.string().trim().max(40).default("View"),
})

export function defaultProductsContent(): ProductsContent {
  return {
    heading: "Featured Products",
    subheading: "",
    showPrice: true,
    showOldPrice: true,
    showStock: false,
    ctaLabel: "View",
  }
}

// ---------------------------------------------------------------------------
// GALLERY (image-only in Batch 2; no video pattern exists in the app)
// ---------------------------------------------------------------------------

export const GALLERY_LAYOUTS: { value: GalleryLayout; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "editorial", label: "Editorial" },
]

export const MAX_GALLERY_ITEMS = 8

const galleryItemSchema = z.object({
  url: safeUrlSchema,
  alt: z.string().trim().max(160).default(""),
  caption: z.string().trim().max(200).default(""),
})

export const galleryContentSchema = z.object({
  heading: z.string().trim().max(120).default(""),
  subheading: z.string().trim().max(300).default(""),
  layout: z.enum(["grid", "editorial"]).default("grid"),
  items: z.array(galleryItemSchema).max(MAX_GALLERY_ITEMS).default([]),
})

export function defaultGalleryContent(): GalleryContent {
  return { heading: "", subheading: "", layout: "grid", items: [] }
}

// ---------------------------------------------------------------------------
// OFFERS (presentation only — items/prices live in relational offer models)
// ---------------------------------------------------------------------------

export const OFFERS_LAYOUTS = [
  { value: "cards", label: "Cards" },
  { value: "compact", label: "Compact" },
] as const

export const offersContentSchema = z.object({
  heading: z.string().trim().max(120).default("Choose Your Bundle"),
  subheading: z.string().trim().max(300).default(""),
  layout: z.enum(["cards", "compact"]).default("cards"),
  showRegularPrice: z.boolean().default(true),
  showSavings: z.boolean().default(true),
  selectionLabel: z.string().trim().max(40).default("Select"),
  helperText: z.string().trim().max(300).default(""),
})

export function defaultOffersContent(): OffersContent {
  return {
    heading: "Choose Your Bundle",
    subheading: "",
    layout: "cards",
    showRegularPrice: true,
    showSavings: true,
    selectionLabel: "Select",
    helperText: "",
  }
}

// ---------------------------------------------------------------------------
// REVIEWS (custom testimonials + references to approved product reviews)
// ---------------------------------------------------------------------------

export const REVIEWS_LAYOUTS = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
] as const

export const MAX_REVIEWS = 12

const customTestimonialSchema = z.object({
  kind: z.literal("custom"),
  id: z.string().trim().min(1).max(64),
  customerName: z.string().trim().min(1, "Customer name is required").max(80),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(1, "Review text is required").max(1000),
  image: z.string().trim().max(2000).default(""),
})

const referencedReviewSchema = z.object({
  kind: z.literal("reference"),
  id: z.string().trim().min(1).max(64),
  reviewId: z.string().trim().min(1).max(64),
})

export const reviewsContentSchema = z.object({
  heading: z.string().trim().max(120).default("Customer Reviews"),
  subheading: z.string().trim().max(300).default(""),
  layout: z.enum(["grid", "list"]).default("grid"),
  items: z.array(z.union([customTestimonialSchema, referencedReviewSchema])).max(MAX_REVIEWS).default([]),
})

export function defaultReviewsContent(): ReviewsContent {
  return { heading: "Customer Reviews", subheading: "", layout: "grid", items: [] }
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export const MAX_FAQ_ITEMS = 12

const faqItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  question: z.string().trim().min(1, "Question is required").max(200),
  answer: z.string().trim().min(1, "Answer is required").max(2000),
})

export const faqContentSchema = z.object({
  heading: z.string().trim().max(120).default("Frequently Asked Questions"),
  subheading: z.string().trim().max(300).default(""),
  items: z.array(faqItemSchema).max(MAX_FAQ_ITEMS).default([]),
})

export function defaultFaqContent(): FaqContent {
  return { heading: "Frequently Asked Questions", subheading: "", items: [] }
}

// ---------------------------------------------------------------------------
// CHECKOUT (presentation only — commerce lives in the order service)
// ---------------------------------------------------------------------------

export const checkoutContentSchema = z.object({
  heading: z.string().trim().max(120).default("Complete Your Order"),
  subheading: z.string().trim().max(300).default(""),
  submitButtonLabel: z.string().trim().max(40).default("Place Order"),
  successHeading: z.string().trim().max(120).default("Order Placed!"),
  successMessage: z.string().trim().max(500).default("Thank you! We will call you shortly to confirm your order."),
  showOrderSummary: z.boolean().default(true),
  showTrustNote: z.boolean().default(true),
  trustNote: z.string().trim().max(300).default("Cash on Delivery available across Bangladesh."),
  layout: z.enum(["split", "stacked"]).default("split"),
})

export function defaultCheckoutContent(): CheckoutContent {
  return {
    heading: "Complete Your Order",
    subheading: "",
    submitButtonLabel: "Place Order",
    successHeading: "Order Placed!",
    successMessage: "Thank you! We will call you shortly to confirm your order.",
    showOrderSummary: true,
    showTrustNote: true,
    trustNote: "Cash on Delivery available across Bangladesh.",
    layout: "split",
  }
}

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

const SCHEMA_BY_TYPE: Partial<Record<SectionType, z.ZodTypeAny>> = {
  HERO: heroContentSchema,
  BENEFITS: benefitsContentSchema,
  PRODUCTS: productsContentSchema,
  OFFERS: offersContentSchema,
  GALLERY: galleryContentSchema,
  REVIEWS: reviewsContentSchema,
  FAQ: faqContentSchema,
  CHECKOUT: checkoutContentSchema,
}

export function getSectionSchema(type: string): z.ZodTypeAny | null {
  return (SCHEMA_BY_TYPE as Record<string, z.ZodTypeAny>)[type] ?? null
}

/** Validate + normalize stored JSON. Returns parsed data or null when invalid. */
export function parseSectionContent<T>(type: string, content: unknown): T | null {
  const schema = getSectionSchema(type)
  if (!schema) return null
  const parsed = schema.safeParse(content ?? {})
  return parsed.success ? (parsed.data as T) : null
}
