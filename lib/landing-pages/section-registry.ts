import type { z } from "zod"
import type { SectionType } from "./types"
import {
  defaultBenefitsContent,
  defaultCheckoutContent,
  defaultFaqContent,
  defaultGalleryContent,
  defaultHeroContent,
  defaultOffersContent,
  defaultProductsContent,
  defaultReviewsContent,
  getSectionSchema,
} from "./section-schemas"

export type SectionRegistryEntry = {
  type: SectionType
  label: string
  description: string
  /** False for sections whose editor/renderer lands in a later batch. */
  editable: boolean
  /** Only one row of this type may exist per landing page. */
  singleton: boolean
  defaultEnabled: boolean
  defaultSortOrder: number
  defaultContent: () => Record<string, unknown>
  schema: z.ZodTypeAny | null
}

// Serializable metadata only — no component imports (safe for client use).
export const SECTION_REGISTRY: Record<SectionType, SectionRegistryEntry> = {
  HERO: {
    type: "HERO",
    label: "Hero",
    description: "Headline, media and call-to-action for the top of the page.",
    editable: true,
    singleton: true,
    defaultEnabled: true,
    defaultSortOrder: 0,
    defaultContent: () => defaultHeroContent() as unknown as Record<string, unknown>,
    schema: getSectionSchema("HERO"),
  },
  BENEFITS: {
    type: "BENEFITS",
    label: "Benefits",
    description: "A grid of benefit cards with icons.",
    editable: true,
    singleton: true,
    defaultEnabled: true,
    defaultSortOrder: 1,
    defaultContent: () => defaultBenefitsContent() as unknown as Record<string, unknown>,
    schema: getSectionSchema("BENEFITS"),
  },
  PRODUCTS: {
    type: "PRODUCTS",
    label: "Products",
    description: "Presentation of products linked to this landing page.",
    editable: true,
    singleton: true,
    defaultEnabled: true,
    defaultSortOrder: 2,
    defaultContent: () => defaultProductsContent() as unknown as Record<string, unknown>,
    schema: getSectionSchema("PRODUCTS"),
  },
  OFFERS: {
    type: "OFFERS",
    label: "Offers",
    description: "Selectable bundle offers with server-priced campaign totals.",
    editable: true,
    singleton: true,
    defaultEnabled: true,
    defaultSortOrder: 3,
    defaultContent: () => defaultOffersContent() as unknown as Record<string, unknown>,
    schema: getSectionSchema("OFFERS"),
  },
  GALLERY: {
    type: "GALLERY",
    label: "Gallery",
    description: "Optional visual storytelling strip. Added only when enabled.",
    editable: true,
    singleton: true,
    defaultEnabled: true,
    defaultSortOrder: 3,
    defaultContent: () => defaultGalleryContent() as unknown as Record<string, unknown>,
    schema: getSectionSchema("GALLERY"),
  },
  REVIEWS: {
    type: "REVIEWS",
    label: "Reviews",
    description: "Curated testimonials and approved product reviews.",
    editable: true,
    singleton: true,
    defaultEnabled: true,
    defaultSortOrder: 4,
    defaultContent: () => defaultReviewsContent() as unknown as Record<string, unknown>,
    schema: getSectionSchema("REVIEWS"),
  },
  FAQ: {
    type: "FAQ",
    label: "FAQ",
    description: "Accessible accordion of frequently asked questions.",
    editable: true,
    singleton: true,
    defaultEnabled: true,
    defaultSortOrder: 5,
    defaultContent: () => defaultFaqContent() as unknown as Record<string, unknown>,
    schema: getSectionSchema("FAQ"),
  },
  CHECKOUT: {
    type: "CHECKOUT",
    label: "Checkout",
    description: "Inline order form wired to the selected offer.",
    editable: true,
    singleton: true,
    defaultEnabled: true,
    defaultSortOrder: 6,
    defaultContent: () => defaultCheckoutContent() as unknown as Record<string, unknown>,
    schema: getSectionSchema("CHECKOUT"),
  },
}

export const SECTION_ORDER: SectionType[] = [
  "HERO",
  "BENEFITS",
  "PRODUCTS",
  "OFFERS",
  "GALLERY",
  "REVIEWS",
  "FAQ",
  "CHECKOUT",
]

export function getRegistryEntry(type: string): SectionRegistryEntry | null {
  return (SECTION_REGISTRY as Record<string, SectionRegistryEntry>)[type] ?? null
}

/** Sections that may be created on demand (all others are singletons seeded at page creation). */
export const CREATABLE_SECTION_TYPES: SectionType[] = ["GALLERY"]
