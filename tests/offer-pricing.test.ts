import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    landingPageOffer: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    landingPageItem: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  resolveLandingOffer,
  resolveLandingOffers,
  resolveBestOfferForSelection,
  resolveLandingItemPrices,
  computeRegularTotal,
} from "@/lib/landing-pages/offer-pricing"

const mockPrisma = vi.mocked(prisma)

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
    landingPageItemId: string
    landingPageItem?: {
      id: string
      name: string
      description: string | null
      price: number
      images: string[]
      active: boolean
      stock: number
      reservedStock: number
      variants: Array<{ id: string; size: string | null; color: string | null; colorHex: string | null; stock: number; reservedStock: number; active: boolean }>
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
        landingPageItemId: "item-1",
        landingPageItem: {
          id: "item-1",
          name: "Item A",
          description: null,
          price: 850,
          images: ["/img/a.jpg"],
          active: true,
          stock: 10,
          reservedStock: 0,
          variants: [
            { id: "v1", size: "Free", color: "Black", colorHex: null, stock: 10, reservedStock: 0, active: true },
          ],
        },
      },
      {
        quantity: 1,
        landingPageItemId: "item-2",
        landingPageItem: {
          id: "item-2",
          name: "Item B",
          description: null,
          price: 790,
          images: ["/img/b.jpg"],
          active: true,
          stock: 8,
          reservedStock: 0,
          variants: [
            { id: "v2", size: "Free", color: "White", colorHex: null, stock: 8, reservedStock: 0, active: true },
          ],
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
    expect(result!.regularTotal).toBe(1640)
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

  it("marks offer with inactive item as invalid", async () => {
    mockPrisma.landingPageOffer.findFirst.mockResolvedValue(
      makeOffer({
        items: [
          {
            quantity: 1,
            landingPageItemId: "item-1",
            landingPageItem: {
              id: "item-1",
              name: "Item A",
              description: null,
              price: 850,
              images: [],
              active: false,
              stock: 0,
              reservedStock: 0,
              variants: [],
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
    const result = await resolveBestOfferForSelection("page-1", ["item-1", "item-2"])
    expect(result).not.toBeNull()
    expect(result!.offerId).toBe("offer-1")
  })

  it("does not match EXACT_COMBINATION when selection is different", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({ id: "offer-1", matchType: "EXACT_COMBINATION", offerPrice: 1500 }),
    ] as any)
    const result = await resolveBestOfferForSelection("page-1", ["item-1"])
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
            landingPageItemId: "item-1",
            landingPageItem: {
              id: "item-1", name: "A", description: null, price: 850, images: [], active: true, stock: 10, reservedStock: 0,
              variants: [{ id: "v1", size: "Free", color: "Black", colorHex: null, stock: 10, reservedStock: 0, active: true }],
            },
          },
          {
            quantity: 1,
            landingPageItemId: "item-2",
            landingPageItem: {
              id: "item-2", name: "B", description: null, price: 790, images: [], active: true, stock: 8, reservedStock: 0,
              variants: [{ id: "v2", size: "Free", color: "White", colorHex: null, stock: 8, reservedStock: 0, active: true }],
            },
          },
          {
            quantity: 1,
            landingPageItemId: "item-3",
            landingPageItem: {
              id: "item-3", name: "C", description: null, price: 500, images: [], active: true, stock: 5, reservedStock: 0,
              variants: [{ id: "v3", size: "Free", color: "Blue", colorHex: null, stock: 5, reservedStock: 0, active: true }],
            },
          },
        ],
      }) as any,
    ])
    const result = await resolveBestOfferForSelection("page-1", ["item-1", "item-2"])
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
    const result = await resolveBestOfferForSelection("page-1", ["item-1"])
    expect(result).toBeNull()
  })

  it("does not match QUANTITY_TIER with ineligible item", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({
        id: "offer-1",
        matchType: "QUANTITY_TIER",
        minQuantity: 2,
        offerPrice: 1500,
        items: [
          {
            quantity: 1,
            landingPageItemId: "item-1",
            landingPageItem: {
              id: "item-1", name: "A", description: null, price: 850, images: [], active: true, stock: 10, reservedStock: 0,
              variants: [{ id: "v1", size: "Free", color: "Black", colorHex: null, stock: 10, reservedStock: 0, active: true }],
            },
          },
        ],
      }) as any,
    ])
    const result = await resolveBestOfferForSelection("page-1", ["item-1", "item-2"])
    expect(result).toBeNull()
  })

  it("chooses lowest price when multiple offers match", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({ id: "offer-expensive", matchType: "EXACT_COMBINATION", offerPrice: 2000 }),
      makeOffer({ id: "offer-cheap", matchType: "EXACT_COMBINATION", offerPrice: 1500 }),
    ] as any)
    const result = await resolveBestOfferForSelection("page-1", ["item-1", "item-2"])
    expect(result!.offerId).toBe("offer-cheap")
  })

  it("ignores disabled offers", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({ id: "offer-disabled", matchType: "EXACT_COMBINATION", offerPrice: 1500, enabled: false }),
    ] as any)
    const result = await resolveBestOfferForSelection("page-1", ["item-1", "item-2"])
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
            landingPageItemId: "item-1",
            landingPageItem: {
              id: "item-1", name: "A", description: null, price: 850, images: [], active: true, stock: 10, reservedStock: 0,
              variants: [{ id: "v1", size: "Free", color: "Black", colorHex: null, stock: 10, reservedStock: 0, active: true }],
            },
          },
          {
            quantity: 1,
            landingPageItemId: "item-2",
            landingPageItem: {
              id: "item-2", name: "B", description: null, price: 790, images: [], active: true, stock: 8, reservedStock: 0,
              variants: [{ id: "v2", size: "Free", color: "White", colorHex: null, stock: 8, reservedStock: 0, active: true }],
            },
          },
          {
            quantity: 1,
            landingPageItemId: "item-3",
            landingPageItem: {
              id: "item-3", name: "C", description: null, price: 500, images: [], active: true, stock: 5, reservedStock: 0,
              variants: [{ id: "v3", size: "Free", color: "Blue", colorHex: null, stock: 5, reservedStock: 0, active: true }],
            },
          },
        ],
      }) as any,
    ])
    const r1 = await resolveBestOfferForSelection("page-1", ["item-1", "item-2"])
    expect(r1!.offerId).toBe("offer-tier")
    const r2 = await resolveBestOfferForSelection("page-1", ["item-1", "item-3"])
    expect(r2!.offerId).toBe("offer-tier")
    const r3 = await resolveBestOfferForSelection("page-1", ["item-2", "item-3"])
    expect(r3!.offerId).toBe("offer-tier")
  })

  it("QUANTITY_TIER 3-item tier qualifies", async () => {
    mockPrisma.landingPageOffer.findMany.mockResolvedValue([
      makeOffer({
        id: "offer-tier3",
        matchType: "QUANTITY_TIER",
        minQuantity: 3,
        offerPrice: 2000,
        items: [
          {
            quantity: 1,
            landingPageItemId: "item-1",
            landingPageItem: {
              id: "item-1", name: "A", description: null, price: 850, images: [], active: true, stock: 10, reservedStock: 0,
              variants: [{ id: "v1", size: "Free", color: "Black", colorHex: null, stock: 10, reservedStock: 0, active: true }],
            },
          },
          {
            quantity: 1,
            landingPageItemId: "item-2",
            landingPageItem: {
              id: "item-2", name: "B", description: null, price: 790, images: [], active: true, stock: 8, reservedStock: 0,
              variants: [{ id: "v2", size: "Free", color: "White", colorHex: null, stock: 8, reservedStock: 0, active: true }],
            },
          },
          {
            quantity: 1,
            landingPageItemId: "item-3",
            landingPageItem: {
              id: "item-3", name: "C", description: null, price: 500, images: [], active: true, stock: 5, reservedStock: 0,
              variants: [{ id: "v3", size: "Free", color: "Blue", colorHex: null, stock: 5, reservedStock: 0, active: true }],
            },
          },
        ],
      }) as any,
    ])
    const r1 = await resolveBestOfferForSelection("page-1", ["item-1", "item-2", "item-3"])
    expect(r1!.offerId).toBe("offer-tier3")
    const r2 = await resolveBestOfferForSelection("page-1", ["item-1", "item-2"])
    expect(r2).toBeNull()
  })
})

describe("resolveLandingItemPrices", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null for empty selection", async () => {
    const result = await resolveLandingItemPrices("page-1", [])
    expect(result).toBeNull()
  })

  it("returns regular total from live item prices", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      { id: "item-1", price: 850, active: true },
      { id: "item-2", price: 790, active: true },
    ] as any)
    const result = await resolveLandingItemPrices("page-1", ["item-1", "item-2"])
    expect(result).not.toBeNull()
    expect(result!.regularTotal).toBe(1640)
    expect(result!.items).toHaveLength(2)
    expect(result!.items[0].landingPageItemId).toBe("item-1")
    expect(result!.items[0].price).toBe(850)
  })

  it("returns null if item not found", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      { id: "item-1", price: 850, active: true },
    ] as any)
    const result = await resolveLandingItemPrices("page-1", ["item-1", "item-2"])
    expect(result).toBeNull()
  })

  it("returns null if item is inactive", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      { id: "item-1", price: 850, active: false },
    ] as any)
    const result = await resolveLandingItemPrices("page-1", ["item-1"])
    expect(result).toBeNull()
  })
})

describe("computeRegularTotal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null for empty items", async () => {
    const result = await computeRegularTotal("page-1", [])
    expect(result).toBeNull()
  })

  it("returns total from live item prices", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      { id: "item-1", price: 850, active: true },
      { id: "item-2", price: 790, active: true },
    ] as any)
    const result = await computeRegularTotal("page-1", [
      { landingPageItemId: "item-1", quantity: 1 },
      { landingPageItemId: "item-2", quantity: 1 },
    ])
    expect(result).toBe(1640)
  })

  it("returns null if any item missing", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      { id: "item-1", price: 850, active: true },
    ] as any)
    const result = await computeRegularTotal("page-1", [
      { landingPageItemId: "item-1", quantity: 1 },
      { landingPageItemId: "item-2", quantity: 1 },
    ])
    expect(result).toBeNull()
  })

  it("returns null if any item inactive", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      { id: "item-1", price: 850, active: true },
      { id: "item-2", price: 790, active: false },
    ] as any)
    const result = await computeRegularTotal("page-1", [
      { landingPageItemId: "item-1", quantity: 1 },
      { landingPageItemId: "item-2", quantity: 1 },
    ])
    expect(result).toBeNull()
  })

  it("multiplies quantity correctly", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      { id: "item-1", price: 850, active: true },
    ] as any)
    const result = await computeRegularTotal("page-1", [
      { landingPageItemId: "item-1", quantity: 3 },
    ])
    expect(result).toBe(2550)
  })
})
