import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock prisma before importing the module under test
vi.mock("@/lib/prisma", () => ({
  prisma: {
    landingPageOffer: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    landingPageProduct: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  resolveLandingOffer,
  resolveLandingOffers,
  resolveBestOfferForSelection,
  resolveLandingProductPrices,
  computeRegularTotal,
} from "@/lib/landing-pages/offer-pricing"

const mockPrisma = vi.mocked(prisma)

// Helper to create a mock offer with relations
function makeOffer(overrides: {
  id?: string
  landingPageId?: string
  name?: string
  matchType?: string
  minQuantity?: number | null
  offerPrice?: number
  enabled?: boolean
  items?: Array<{
    quantity: number
    landingPageProductId: string
    landingPageProduct?: {
      id: string
      displayTitle: string | null
      product: {
        id: string
        name: string
        slug: string
        images: string[]
        price: number
        status: string
        variants: Array<{ id: string; size: string; color: string; stock: number; reservedStock: number }>
      } | null
    } | null
  }>
} = {}) {
  return {
    id: overrides.id ?? "offer-1",
    landingPageId: overrides.landingPageId ?? "page-1",
    name: overrides.name ?? "Test Offer",
    badge: null,
    pricingType: "FIXED",
    matchType: overrides.matchType ?? "EXACT_COMBINATION",
    minQuantity: overrides.minQuantity ?? null,
    offerPrice: overrides.offerPrice ?? 1500,
    enabled: overrides.enabled ?? true,
    sortOrder: 0,
    items: overrides.items ?? [
      {
        quantity: 1,
        landingPageProductId: "lp-1",
        landingPageProduct: {
          id: "lp-1",
          displayTitle: "Product A",
          product: {
            id: "prod-1",
            name: "Product A",
            slug: "product-a",
            images: ["/img/a.jpg"],
            price: 850,
            status: "Active",
            variants: [
              { id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0 },
            ],
          },
        },
      },
      {
        quantity: 1,
        landingPageProductId: "lp-2",
        landingPageProduct: {
          id: "lp-2",
          displayTitle: "Product B",
          product: {
            id: "prod-2",
            name: "Product B",
            slug: "product-b",
            images: ["/img/b.jpg"],
            price: 790,
            status: "Active",
            variants: [
              { id: "v2", size: "Free", color: "White", stock: 8, reservedStock: 0 },
            ],
          },
        },
      },
    ],
  }
}

describe("resolveLandingOffer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns resolved offer for valid offer", async () => {
    mockPrisma.landingPageOffer.findFirst.mockResolvedValue(makeOffer() as any)
    const result = await resolveLandingOffer("page-1", "offer-1")
    expect(result).not.toBeNull()
    expect(result!.offerId).toBe("offer-1")
    expect(result!.offerPrice).toBe(1500)
    expect(result!.regularTotal).toBe(1640) // 850 + 790
    expect(result!.savings).toBe(140)
    expect(result!.valid).toBe(true)
  })

  it("returns null for non-existent offer", async () => {
    mockPrisma.landingPageOffer.findFirst.mockResolvedValue(null)
    const result = await resolveLandingOffer("page-1", "non-existent")
    expect(result).toBeNull()
  })

  it("marks disabled offer as invalid", async () => {
    mockPrisma.landingPageOffer.findFirst.mockResolvedValue(makeOffer({ enabled: false }) as any)
    const result = await resolveLandingOffer("page-1", "offer-1")
    expect(result!.valid).toBe(false)
    expect(result!.invalidReason).toContain("disabled")
  })

  it("marks offer with inactive product as invalid", async () => {
    mockPrisma.landingPageOffer.findFirst.mockResolvedValue(
      makeOffer({
        items: [
          {
            quantity: 1,
            landingPageProductId: "lp-1",
            landingPageProduct: {
              id: "lp-1",
              displayTitle: "Product A",
              product: {
                id: "prod-1",
                name: "Product A",
                slug: "product-a",
                images: [],
                price: 850,
                status: "Inactive",
                variants: [],
              },
            },
          },
        ],
      }) as any
    )
    const result = await resolveLandingOffer("page-1", "offer-1")
    expect(result!.valid).toBe(false)
    expect(result!.invalidReason).toContain("no longer available")
  })

  it("includes matchType and minQuantity in resolved offer", async () => {
    mockPrisma.landingPageOffer.findFirst.mockResolvedValue(
      makeOffer({ matchType: "QUANTITY_TIER", minQuantity: 2 }) as any
    )
    const result = await resolveLandingOffer("page-1", "offer-1")
    expect(result!.matchType).toBe("QUANTITY_TIER")
    expect(result!.minQuantity).toBe(2)
  })
})

describe("resolveBestOfferForSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null for empty selection", async () => {
    const result = await resolveBestOfferForSelection("page-1", [])
    expect(result).toBeNull()
  })

  it("matches EXACT_COMBINATION offer when selection matches", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({ id: "offer-1", matchType: "EXACT_COMBINATION", offerPrice: 1500 }),
    ] as any)
    const result = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-2"])
    expect(result).not.toBeNull()
    expect(result!.offerId).toBe("offer-1")
  })

  it("does not match EXACT_COMBINATION when selection is different", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({ id: "offer-1", matchType: "EXACT_COMBINATION", offerPrice: 1500 }),
    ] as any)
    // Only selecting lp-1, but offer requires lp-1 + lp-2
    const result = await resolveBestOfferForSelection("page-1", ["lp-1"])
    expect(result).toBeNull()
  })

  it("matches QUANTITY_TIER when minQuantity met", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({
        id: "offer-1",
        matchType: "QUANTITY_TIER",
        minQuantity: 2,
        offerPrice: 1500,
        items: [
          {
            quantity: 1,
            landingPageProductId: "lp-1",
            landingPageProduct: {
              id: "lp-1",
              displayTitle: "A",
              product: { id: "p1", name: "A", slug: "a", images: [], price: 850, status: "Active", variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0 }] },
            },
          },
          {
            quantity: 1,
            landingPageProductId: "lp-2",
            landingPageProduct: {
              id: "lp-2",
              displayTitle: "B",
              product: { id: "p2", name: "B", slug: "b", images: [], price: 790, status: "Active", variants: [{ id: "v2", size: "Free", color: "White", stock: 8, reservedStock: 0 }] },
            },
          },
          {
            quantity: 1,
            landingPageProductId: "lp-3",
            landingPageProduct: {
              id: "lp-3",
              displayTitle: "C",
              product: { id: "p3", name: "C", slug: "c", images: [], price: 500, status: "Active", variants: [{ id: "v3", size: "Free", color: "Blue", stock: 5, reservedStock: 0 }] },
            },
          },
        ],
      }) as any,
    ])
    // Selecting 2 eligible products
    const result = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-2"])
    expect(result).not.toBeNull()
    expect(result!.offerId).toBe("offer-1")
  })

  it("does not match QUANTITY_TIER when minQuantity not met", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({
        id: "offer-1",
        matchType: "QUANTITY_TIER",
        minQuantity: 2,
        offerPrice: 1500,
      }) as any,
    ])
    // Only selecting 1 product, but minQuantity is 2
    const result = await resolveBestOfferForSelection("page-1", ["lp-1"])
    expect(result).toBeNull()
  })

  it("does not match QUANTITY_TIER with ineligible product", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({
        id: "offer-1",
        matchType: "QUANTITY_TIER",
        minQuantity: 2,
        offerPrice: 1500,
        items: [
          {
            quantity: 1,
            landingPageProductId: "lp-1",
            landingPageProduct: {
              id: "lp-1",
              displayTitle: "A",
              product: { id: "p1", name: "A", slug: "a", images: [], price: 850, status: "Active", variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0 }] },
            },
          },
        ],
      }) as any,
    ])
    // lp-2 is not in the offer's eligible items
    const result = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-2"])
    expect(result).toBeNull()
  })

  it("chooses lowest price when multiple offers match", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({ id: "offer-expensive", matchType: "EXACT_COMBINATION", offerPrice: 2000 }),
      makeOffer({ id: "offer-cheap", matchType: "EXACT_COMBINATION", offerPrice: 1500 }),
    ] as any)
    const result = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-2"])
    expect(result!.offerId).toBe("offer-cheap")
  })

  it("ignores disabled offers", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({ id: "offer-disabled", matchType: "EXACT_COMBINATION", offerPrice: 1500, enabled: false }),
    ] as any)
    const result = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-2"])
    expect(result).toBeNull()
  })

  it("QUANTITY_TIER pair A+B qualifies", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({
        id: "offer-tier",
        matchType: "QUANTITY_TIER",
        minQuantity: 2,
        offerPrice: 1500,
        items: [
          {
            quantity: 1,
            landingPageProductId: "lp-1",
            landingPageProduct: {
              id: "lp-1",
              displayTitle: "A",
              product: { id: "p1", name: "A", slug: "a", images: [], price: 850, status: "Active", variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0 }] },
            },
          },
          {
            quantity: 1,
            landingPageProductId: "lp-2",
            landingPageProduct: {
              id: "lp-2",
              displayTitle: "B",
              product: { id: "p2", name: "B", slug: "b", images: [], price: 790, status: "Active", variants: [{ id: "v2", size: "Free", color: "White", stock: 8, reservedStock: 0 }] },
            },
          },
          {
            quantity: 1,
            landingPageProductId: "lp-3",
            landingPageProduct: {
              id: "lp-3",
              displayTitle: "C",
              product: { id: "p3", name: "C", slug: "c", images: [], price: 500, status: "Active", variants: [{ id: "v3", size: "Free", color: "Blue", stock: 5, reservedStock: 0 }] },
            },
          },
        ],
      }) as any,
    ])
    // A+B
    const r1 = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-2"])
    expect(r1!.offerId).toBe("offer-tier")
    // A+C
    const r2 = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-3"])
    expect(r2!.offerId).toBe("offer-tier")
    // B+C
    const r3 = await resolveBestOfferForSelection("page-1", ["lp-2", "lp-3"])
    expect(r3!.offerId).toBe("offer-tier")
  })

  it("QUANTITY_TIER 3-product tier qualifies", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({
        id: "offer-tier3",
        matchType: "QUANTITY_TIER",
        minQuantity: 3,
        offerPrice: 2000,
        items: [
          {
            quantity: 1,
            landingPageProductId: "lp-1",
            landingPageProduct: {
              id: "lp-1",
              displayTitle: "A",
              product: { id: "p1", name: "A", slug: "a", images: [], price: 850, status: "Active", variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0 }] },
            },
          },
          {
            quantity: 1,
            landingPageProductId: "lp-2",
            landingPageProduct: {
              id: "lp-2",
              displayTitle: "B",
              product: { id: "p2", name: "B", slug: "b", images: [], price: 790, status: "Active", variants: [{ id: "v2", size: "Free", color: "White", stock: 8, reservedStock: 0 }] },
            },
          },
          {
            quantity: 1,
            landingPageProductId: "lp-3",
            landingPageProduct: {
              id: "lp-3",
              displayTitle: "C",
              product: { id: "p3", name: "C", slug: "c", images: [], price: 500, status: "Active", variants: [{ id: "v3", size: "Free", color: "Blue", stock: 5, reservedStock: 0 }] },
            },
          },
        ],
      }) as any,
    ])
    // All 3
    const r1 = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-2", "lp-3"])
    expect(r1!.offerId).toBe("offer-tier3")
    // Only 2 - should NOT match
    const r2 = await resolveBestOfferForSelection("page-1", ["lp-1", "lp-2"])
    expect(r2).toBeNull()
  })
})

describe("resolveLandingProductPrices", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null for empty selection", async () => {
    const result = await resolveLandingProductPrices("page-1", [])
    expect(result).toBeNull()
  })

  it("returns regular total from live product prices", async () => {
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      { id: "lp-1", product: { id: "p1", price: 850, status: "Active" } },
      { id: "lp-2", product: { id: "p2", price: 790, status: "Active" } },
    ] as any)
    const result = await resolveLandingProductPrices("page-1", ["lp-1", "lp-2"])
    expect(result).not.toBeNull()
    expect(result!.regularTotal).toBe(1640)
  })

  it("returns null if product not found", async () => {
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      { id: "lp-1", product: { id: "p1", price: 850, status: "Active" } },
    ] as any)
    const result = await resolveLandingProductPrices("page-1", ["lp-1", "lp-2"])
    expect(result).toBeNull()
  })

  it("returns null if product is inactive", async () => {
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      { id: "lp-1", product: { id: "p1", price: 850, status: "Inactive" } },
    ] as any)
    const result = await resolveLandingProductPrices("page-1", ["lp-1"])
    expect(result).toBeNull()
  })
})
