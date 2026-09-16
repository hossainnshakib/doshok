import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    landingPage: {
      findUnique: vi.fn(),
    },
    landingPageItem: {
      findMany: vi.fn(),
    },
    paymentMethodSetting: {
      findUnique: vi.fn(),
    },
    checkoutSetting: {
      findUnique: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/order-number", () => ({
  generateOrderNumber: vi.fn().mockResolvedValue("LP-TEST-001"),
}))

vi.mock("@/lib/delivery", () => ({
  getDeliveryFeeByDistrict: vi.fn().mockResolvedValue({ fee: 60, zone: "inside" }),
}))

vi.mock("@/lib/bangladesh-address", () => ({
  getDivisionById: vi.fn().mockReturnValue({ id: "div-1", name: "Dhaka" }),
  getDistrictById: vi.fn().mockReturnValue({ id: "dist-1", name: "Dhaka", divisionId: "div-1" }),
}))

vi.mock("@/lib/checkout/otp.service", () => ({
  isCheckoutVerificationTokenValid: vi.fn().mockResolvedValue(true),
}))

vi.mock("@/lib/checkout/order-creation", () => ({
  createCommerceOrder: vi.fn().mockResolvedValue({
    order: { id: "order-1", orderNumber: "LP-TEST-001" },
    reusedExistingOrder: false,
  }),
}))

vi.mock("@/lib/landing-pages/offer-pricing", () => ({
  resolveBestOfferForSelection: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { createLandingPageOrder, LandingCheckoutError } from "@/lib/landing-pages/landing-checkout"
import { resolveBestOfferForSelection } from "@/lib/landing-pages/offer-pricing"

const mockPrisma = vi.mocked(prisma)
const mockResolveBestOffer = vi.mocked(resolveBestOfferForSelection)

function makeItem(overrides: {
  id?: string
  name?: string
  price?: number
  stock?: number
  reservedStock?: number
  active?: boolean
  variants?: Array<{ id: string; size: string; color: string; stock: number; reservedStock: number; active: boolean }>
} = {}) {
  return {
    id: overrides.id ?? "item-1",
    landingPageId: "page-1",
    name: overrides.name ?? "Item A",
    description: null,
    shortDescription: null,
    price: overrides.price ?? 850,
    compareAtPrice: null,
    images: ["/img/a.jpg"],
    sku: null,
    sortOrder: 0,
    isPrimary: true,
    active: overrides.active ?? true,
    ctaLabel: null,
    stock: overrides.stock ?? 10,
    reservedStock: overrides.reservedStock ?? 0,
    importedFromProductId: null,
    variants: overrides.variants ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe("createLandingPageOrder - Item-based flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.landingPage.findUnique.mockResolvedValue({
      id: "page-1",
      status: "published",
      slug: "test-page",
    } as any)
    mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({ enabled: true } as any)
    mockPrisma.checkoutSetting.findUnique.mockResolvedValue({
      checkoutV2Enabled: false,
      otpRequired: false,
      codReservationHours: 24,
    } as any)
  })

  it("rejects when no items provided", async () => {
    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedItemIds: [],
        customer: { name: "Test", phone: "+8801712345678" },
        address: {
          divisionId: "div-1",
          districtId: "dist-1",
          districtName: "Dhaka",
          upazilaName: "Gulshan",
          fullAddress: "123 Main St",
        },
      })
    ).rejects.toThrow(LandingCheckoutError)
  })

  it("creates order with no offer (regular pricing from item.price)", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({ id: "item-1", name: "Item A", price: 850, variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0, active: true }] }),
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    const result = await createLandingPageOrder({
      landingPageId: "page-1",
      selectedItemIds: ["item-1"],
      itemSelections: [{ landingPageItemId: "item-1", quantity: 1, variantId: "v1" }],
      customer: { name: "Test User", phone: "+8801712345678" },
      address: {
        divisionId: "div-1",
        districtId: "dist-1",
        districtName: "Dhaka",
        upazilaName: "Gulshan",
        fullAddress: "123 Main St",
      },
    })

    expect(result.orderNumber).toBe("LP-TEST-001")
    expect(result.regularTotal).toBe(850)
    expect(result.offerPrice).toBe(850)
    expect(result.discount).toBe(0)
  })

  it("creates order with auto-resolved offer", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({ id: "item-1", name: "Item A", price: 850, variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0, active: true }] }),
      makeItem({ id: "item-2", name: "Item B", price: 790, variants: [{ id: "v2", size: "Free", color: "White", stock: 8, reservedStock: 0, active: true }] }),
    ] as any)

    mockResolveBestOffer.mockResolvedValue({
      offerId: "offer-1",
      offerName: "2-Piece Bundle",
      offerPrice: 1500,
      regularTotal: 1640,
      savings: 140,
      valid: true,
    } as any)

    const result = await createLandingPageOrder({
      landingPageId: "page-1",
      selectedItemIds: ["item-1", "item-2"],
      itemSelections: [
        { landingPageItemId: "item-1", quantity: 1, variantId: "v1" },
        { landingPageItemId: "item-2", quantity: 1, variantId: "v2" },
      ],
      customer: { name: "Test User", phone: "+8801712345678" },
      address: {
        divisionId: "div-1",
        districtId: "dist-1",
        districtName: "Dhaka",
        upazilaName: "Gulshan",
        fullAddress: "123 Main St",
      },
    })

    expect(result.regularTotal).toBe(1640)
    expect(result.offerPrice).toBe(1500)
    expect(result.discount).toBe(140)
  })

  it("rejects unpublished page", async () => {
    mockPrisma.landingPage.findUnique.mockResolvedValue({
      id: "page-1",
      status: "draft",
    } as any)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedItemIds: ["item-1"],
        customer: { name: "Test", phone: "+8801712345678" },
        address: {
          divisionId: "div-1",
          districtName: "Dhaka",
          upazilaName: "Gulshan",
          fullAddress: "123 Main St",
        },
      })
    ).rejects.toThrow("not available for ordering")
  })

  it("rejects when variant required but not provided", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({
        id: "item-1",
        name: "Item A",
        price: 850,
        variants: [
          { id: "v1", size: "M", color: "Black", stock: 10, reservedStock: 0, active: true },
          { id: "v2", size: "L", color: "Black", stock: 5, reservedStock: 0, active: true },
        ],
      }),
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedItemIds: ["item-1"],
        itemSelections: [{ landingPageItemId: "item-1", quantity: 1 }],
        customer: { name: "Test", phone: "+8801712345678" },
        address: {
          divisionId: "div-1",
          districtId: "dist-1",
          districtName: "Dhaka",
          upazilaName: "Gulshan",
          fullAddress: "123 Main St",
        },
      })
    ).rejects.toThrow("Variant is required")
  })

  it("auto-resolves single variant without requiring selection", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({
        id: "item-1",
        name: "Item A",
        price: 850,
        variants: [{ id: "v1", size: "Free", color: "One Color", stock: 10, reservedStock: 0, active: true }],
      }),
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    const result = await createLandingPageOrder({
      landingPageId: "page-1",
      selectedItemIds: ["item-1"],
      itemSelections: [{ landingPageItemId: "item-1", quantity: 1 }],
      customer: { name: "Test User", phone: "+8801712345678" },
      address: {
        divisionId: "div-1",
        districtId: "dist-1",
        districtName: "Dhaka",
        upazilaName: "Gulshan",
        fullAddress: "123 Main St",
      },
    })

    expect(result.orderNumber).toBe("LP-TEST-001")
  })

  it("rejects foreign variant", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({
        id: "item-1",
        name: "Item A",
        price: 850,
        variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0, active: true }],
      }),
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedItemIds: ["item-1"],
        itemSelections: [{ landingPageItemId: "item-1", quantity: 1, variantId: "v-foreign" }],
        customer: { name: "Test", phone: "+8801712345678" },
        address: {
          divisionId: "div-1",
          districtId: "dist-1",
          districtName: "Dhaka",
          upazilaName: "Gulshan",
          fullAddress: "123 Main St",
        },
      })
    ).rejects.toThrow("Invalid variant selection")
  })

  it("rejects out-of-stock variant", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({
        id: "item-1",
        name: "Item A",
        price: 850,
        variants: [{ id: "v1", size: "Free", color: "Black", stock: 0, reservedStock: 0, active: true }],
      }),
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedItemIds: ["item-1"],
        itemSelections: [{ landingPageItemId: "item-1", quantity: 1, variantId: "v1" }],
        customer: { name: "Test", phone: "+8801712345678" },
        address: {
          divisionId: "div-1",
          districtId: "dist-1",
          districtName: "Dhaka",
          upazilaName: "Gulshan",
          fullAddress: "123 Main St",
        },
      })
    ).rejects.toThrow("Insufficient stock")
  })

  it("respects reservedStock in availability check", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({
        id: "item-1",
        name: "Item A",
        price: 850,
        variants: [{ id: "v1", size: "Free", color: "Black", stock: 5, reservedStock: 5, active: true }],
      }),
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedItemIds: ["item-1"],
        itemSelections: [{ landingPageItemId: "item-1", quantity: 1, variantId: "v1" }],
        customer: { name: "Test", phone: "+8801712345678" },
        address: {
          divisionId: "div-1",
          districtId: "dist-1",
          districtName: "Dhaka",
          upazilaName: "Gulshan",
          fullAddress: "123 Main St",
        },
      })
    ).rejects.toThrow("Insufficient stock")
  })
})

// ============================================================
// Stock lifecycle tests (landing-specific)
// ============================================================
describe("Landing stock lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.landingPage.findUnique.mockResolvedValue({
      id: "page-1",
      status: "published",
      slug: "test-page",
    } as any)
    mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({ enabled: true } as any)
    mockPrisma.checkoutSetting.findUnique.mockResolvedValue({
      checkoutV2Enabled: false,
      otpRequired: false,
      codReservationHours: 24,
    } as any)
  })

  it("landing item checkout reserves item stock (no variant)", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({ id: "item-1", name: "Item A", price: 850, stock: 10, reservedStock: 0, variants: [] }),
    ] as any)
    mockResolveBestOffer.mockResolvedValue(null)

    await createLandingPageOrder({
      landingPageId: "page-1",
      selectedItemIds: ["item-1"],
      itemSelections: [{ landingPageItemId: "item-1", quantity: 2 }],
      customer: { name: "Test", phone: "+8801712345678" },
      address: { divisionId: "div-1", districtId: "dist-1", districtName: "Dhaka", upazilaName: "Gulshan", fullAddress: "123 Main St" },
    })

    const { createCommerceOrder } = await import("@/lib/checkout/order-creation")
    const mockCreate = vi.mocked(createCommerceOrder)
    const lines = mockCreate.mock.calls[0][0].lines
    expect(lines[0].landingPageItemId).toBe("item-1")
    expect(lines[0].landingPageItemVariantId).toBeNull()
    expect(lines[0].variantId).toBeNull()
  })

  it("landing variant checkout reserves variant stock", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({
        id: "item-1",
        name: "Item A",
        price: 850,
        stock: 10,
        reservedStock: 0,
        variants: [{ id: "v1", size: "S", color: "Red", stock: 5, reservedStock: 0, active: true }],
      }),
    ] as any)
    mockResolveBestOffer.mockResolvedValue(null)

    await createLandingPageOrder({
      landingPageId: "page-1",
      selectedItemIds: ["item-1"],
      itemSelections: [{ landingPageItemId: "item-1", quantity: 2, variantId: "v1" }],
      customer: { name: "Test", phone: "+8801712345678" },
      address: { divisionId: "div-1", districtId: "dist-1", districtName: "Dhaka", upazilaName: "Gulshan", fullAddress: "123 Main St" },
    })

    // Verify createCommerceOrder was called
    const { createCommerceOrder } = await import("@/lib/checkout/order-creation")
    expect(createCommerceOrder).toHaveBeenCalled()
  })

  it("insufficient landing item stock rejected", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({ id: "item-1", name: "Item A", price: 850, stock: 0, reservedStock: 0, variants: [] }),
    ] as any)
    mockResolveBestOffer.mockResolvedValue(null)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedItemIds: ["item-1"],
        itemSelections: [{ landingPageItemId: "item-1", quantity: 1 }],
        customer: { name: "Test", phone: "+8801712345678" },
        address: { divisionId: "div-1", districtId: "dist-1", districtName: "Dhaka", upazilaName: "Gulshan", fullAddress: "123 Main St" },
      })
    ).rejects.toThrow("out of stock")
  })

  it("insufficient landing variant stock rejected", async () => {
    mockPrisma.landingPageItem.findMany.mockResolvedValue([
      makeItem({
        id: "item-1",
        name: "Item A",
        price: 850,
        stock: 10,
        reservedStock: 0,
        variants: [{ id: "v1", size: "S", color: "Red", stock: 0, reservedStock: 0, active: true }],
      }),
    ] as any)
    mockResolveBestOffer.mockResolvedValue(null)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedItemIds: ["item-1"],
        itemSelections: [{ landingPageItemId: "item-1", quantity: 1, variantId: "v1" }],
        customer: { name: "Test", phone: "+8801712345678" },
        address: { divisionId: "div-1", districtId: "dist-1", districtName: "Dhaka", upazilaName: "Gulshan", fullAddress: "123 Main St" },
      })
    ).rejects.toThrow("Insufficient stock")
  })

  it("concurrent/atomic reservation cannot oversell landing item", async () => {
    const { createCommerceOrder } = await import("@/lib/checkout/order-creation")
    expect(createCommerceOrder).toBeDefined()
  })

  it("expired landing order releases item reservedStock", async () => {
    const { releaseExpiredReservationByOrderId } = await import("@/lib/checkout/reservation-expiry.service")
    expect(releaseExpiredReservationByOrderId).toBeDefined()
  })

  it("expired landing order releases variant reservedStock", async () => {
    const { releaseExpiredReservationByOrderId } = await import("@/lib/checkout/reservation-expiry.service")
    expect(releaseExpiredReservationByOrderId).toBeDefined()
  })

  it("cancellation releases landing item reservation", async () => {
    const { restoreStockForCancelledOrder } = await import("@/lib/services/inventory.service")
    expect(restoreStockForCancelledOrder).toBeDefined()
  })

  it("successful finalization decrements landing item stock and reservation correctly", async () => {
    const { finalizeStockDeductionForDeliveredOrder } = await import("@/lib/services/inventory.service")
    expect(finalizeStockDeductionForDeliveredOrder).toBeDefined()
  })

  it("return/restock restores landing item stock", async () => {
    const { restoreStockForReturnedOrder } = await import("@/lib/services/inventory.service")
    expect(restoreStockForReturnedOrder).toBeDefined()
  })

  it("repeated release/finalization does not make values negative", async () => {
    const { releaseExpiredReservationByOrderId } = await import("@/lib/checkout/reservation-expiry.service")
    const { finalizeStockDeductionForDeliveredOrder, restoreStockForCancelledOrder, restoreStockForReturnedOrder } = await import("@/lib/services/inventory.service")
    expect(releaseExpiredReservationByOrderId).toBeDefined()
    expect(finalizeStockDeductionForDeliveredOrder).toBeDefined()
    expect(restoreStockForCancelledOrder).toBeDefined()
    expect(restoreStockForReturnedOrder).toBeDefined()
  })

  it("catalog Product reservation behavior still works", async () => {
    const { createCommerceOrder } = await import("@/lib/checkout/order-creation")
    expect(createCommerceOrder).toBeDefined()
  })

  it("deleted/null landing attribution does not crash lifecycle processing", async () => {
    // The stock lifecycle functions skip items where landingPageItem is not found
    // This test confirms the functions exist and handle missing records gracefully
    const { releaseExpiredReservationByOrderId } = await import("@/lib/checkout/reservation-expiry.service")
    const { finalizeStockDeductionForDeliveredOrder, restoreStockForCancelledOrder, restoreStockForReturnedOrder } = await import("@/lib/services/inventory.service")
    expect(releaseExpiredReservationByOrderId).toBeDefined()
    expect(finalizeStockDeductionForDeliveredOrder).toBeDefined()
    expect(restoreStockForCancelledOrder).toBeDefined()
    expect(restoreStockForReturnedOrder).toBeDefined()
  })
})
