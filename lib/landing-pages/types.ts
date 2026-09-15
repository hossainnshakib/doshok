// Typed content shapes for LandingPageSection.content (stored as JSON).
// Writes are validated with the zod schemas in ./section-schemas.
// Plain text only — no HTML is accepted or rendered for these fields.

export type HeroCtaTarget = "products" | "product" | "checkout" | "custom"

export type HeroCta = {
  label: string
  target: HeroCtaTarget
  productSlug?: string
  customPath?: string
}

export type HeroMediaItem = {
  url: string
  alt: string
  productSlug?: string
}

export type HeroLayout = "split" | "centered" | "media-first"

export type HeroContent = {
  eyebrow: string
  headline: string
  subheadline: string
  description: string
  media: HeroMediaItem[]
  layout: HeroLayout
  primaryCta: HeroCta
  secondaryCta: HeroCta | null
  trustLine: string
  showPrice: boolean
}

export type BenefitIcon =
  | "truck"
  | "shield"
  | "refresh"
  | "badge"
  | "sparkles"
  | "leaf"
  | "ruler"
  | "card"
  | "headset"
  | "package"
  | "star"
  | "zap"

export type BenefitItem = {
  id: string
  icon: BenefitIcon
  title: string
  description: string
}

export type BenefitsContent = {
  heading: string
  subheading: string
  items: BenefitItem[]
}

export type ProductsContent = {
  heading: string
  subheading: string
  showPrice: boolean
  showOldPrice: boolean
  showStock: boolean
  ctaLabel: string
}

export type GalleryLayout = "grid" | "editorial"

export type GalleryItem = {
  url: string
  alt: string
  caption: string
}

export type GalleryContent = {
  heading: string
  subheading: string
  layout: GalleryLayout
  items: GalleryItem[]
}

export type SectionType =
  | "HERO"
  | "BENEFITS"
  | "PRODUCTS"
  | "OFFERS"
  | "GALLERY"
  | "REVIEWS"
  | "FAQ"
  | "CHECKOUT"

// ---------------------------------------------------------------------------
// OFFERS section presentation (offer data itself is relational, never JSON)
// ---------------------------------------------------------------------------

export type OffersLayout = "cards" | "compact"

export type OffersContent = {
  heading: string
  subheading: string
  layout: OffersLayout
  showRegularPrice: boolean
  showSavings: boolean
  selectionLabel: string
  helperText: string
}

// ---------------------------------------------------------------------------
// REVIEWS section
// ---------------------------------------------------------------------------

export type ReviewsLayout = "grid" | "list"

export type CustomTestimonial = {
  kind: "custom"
  id: string
  customerName: string
  rating: number
  text: string
  image: string
}

// NOTE: no `verified` field exists on purpose — custom entries can never
// claim verification. References inherit verified state live from the review.
export type ReferencedReview = {
  kind: "reference"
  id: string
  reviewId: string
}

export type ReviewEntry = CustomTestimonial | ReferencedReview

export type ReviewsContent = {
  heading: string
  subheading: string
  layout: ReviewsLayout
  items: ReviewEntry[]
}

// Live-resolved review for public rendering (never stored).
export type ResolvedReview = {
  id: string
  kind: "custom" | "reference"
  customerName: string
  rating: number
  text: string
  image: string | null
  verified: boolean
  productName: string | null
}

// ---------------------------------------------------------------------------
// FAQ section
// ---------------------------------------------------------------------------

export type FaqItem = {
  id: string
  question: string
  answer: string
}

export type FaqContent = {
  heading: string
  subheading: string
  items: FaqItem[]
}

// ---------------------------------------------------------------------------
// CHECKOUT section presentation (commerce lives in the order service)
// ---------------------------------------------------------------------------

export type CheckoutLayout = "split" | "stacked"

export type CheckoutContent = {
  heading: string
  subheading: string
  submitButtonLabel: string
  successHeading: string
  successMessage: string
  showOrderSummary: boolean
  showTrustNote: boolean
  trustNote: string
  layout: CheckoutLayout
}

// ---------------------------------------------------------------------------
// Server-authoritative offer pricing contract (Batch 4 checkout consumes this)
// ---------------------------------------------------------------------------

export type OfferPricingType = "FIXED"
export type OfferMatchType = "EXACT_COMBINATION" | "QUANTITY_TIER"

export type VariantOption = {
  id: string
  size: string
  color: string
  available: number
}

export type ResolvedOfferItem = {
  landingPageProductId: string
  productId: string
  productSlug: string
  productName: string
  displayName: string
  image: string | null
  quantity: number
  unitPrice: number
  lineRegularTotal: number
  available: number
  requiresVariant: boolean
  variants: VariantOption[]
}

export type ResolvedOffer = {
  offerId: string
  landingPageId: string
  offerName: string
  badge: string | null
  pricingType: OfferPricingType
  matchType: OfferMatchType
  minQuantity: number | null
  enabled: boolean
  sortOrder: number
  items: ResolvedOfferItem[]
  regularTotal: number
  offerPrice: number
  savings: number
  savingsPercent: number
  valid: boolean
  invalidReason: string | null
}

// ---------------------------------------------------------------------------
// Product-based selection types (new commerce model)
// ---------------------------------------------------------------------------

export type ProductSelection = {
  landingPageProductId: string
  productId: string
  quantity: number
  variantId?: string
}

export type ProductSelectionQuote = {
  selections: ProductSelection[]
  items: {
    landingPageProductId: string
    productId: string
    productName: string
    displayName: string
    image: string | null
    unitPrice: number
    quantity: number
    requiresVariant: boolean
    variants: VariantOption[]
  }[]
  regularTotal: number
  matchedOffer: ResolvedOffer | null
  offerPrice: number | null
  savings: number
  deliveryFee: number
  total: number
  zone: string
}
