import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock all dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    landingPage: {
      findUnique: vi.fn(),
    },
    landingPageProduct: {
      findMany: vi.fn(),
    },
    productVariant: {
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
  resolveLandingOffer: vi.fn(),
  resolveBestOfferForSelection: vi.fn(),
  resolveLandingProductPrices: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { createLandingPageOrder, LandingCheckoutError } from "@/lib/landing-pages/landing-checkout"
import { resolveBestOfferForSelection, resolveLandingProductPrices } from "@/lib/landing-pages/offer-pricing"

const mockPrisma = vi.mocked(prisma)
const mockResolveBestOffer = vi.mocked(resolveBestOfferForSelection)
const mockResolveProductPrices = vi.mocked(resolveLandingProductPrices)

describe("createLandingPageOrder - Product-based flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default page
    mockPrisma.landingPage.findUnique.mockResolvedValue({
      id: "page-1",
      status: "published",
      slug: "test-page",
    } as any)
    // Setup default COD setting
    mockPrisma.paymentMethodSetting.findUnique.mockResolvedValue({ enabled: true } as any)
    // Setup default checkout setting
    mockPrisma.checkoutSetting.findUnique.mockResolvedValue({
      checkoutV2Enabled: false,
      otpRequired: false,
      codReservationHours: 24,
    } as any)
  })

  it("rejects when no products or offer provided", async () => {
    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
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

  it("creates order with no offer (regular pricing)", async () => {
    // Setup product links
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      {
        id: "lp-1",
        product: {
          id: "prod-1",
          name: "Product A",
          price: 850,
          status: "Active",
          variants: [
            { id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0 },
          ],
        },
      },
    ] as any)

    // No offer matches
    mockResolveBestOffer.mockResolvedValue(null)

    // Setup variants
    mockPrisma.productVariant.findMany.mockResolvedValue([
      { id: "v1", productId: "prod-1", size: "Free", color: "Black", stock: 10, reservedStock: 0 },
    ] as any)

    const result = await createLandingPageOrder({
      landingPageId: "page-1",
      selectedProductIds: ["lp-1"],
      productSelections: [{ landingPageProductId: "lp-1", productId: "prod-1", quantity: 1, variantId: "v1" }],
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
    expect(result.offerPrice).toBe(850) // No offer = regular price
    expect(result.discount).toBe(0)
  })

  it("creates order with auto-resolved offer", async () => {
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      {
        id: "lp-1",
        product: {
          id: "prod-1",
          name: "Product A",
          price: 850,
          status: "Active",
          variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0 }],
        },
      },
      {
        id: "lp-2",
        product: {
          id: "prod-2",
          name: "Product B",
          price: 790,
          status: "Active",
          variants: [{ id: "v2", size: "Free", color: "White", stock: 8, reservedStock: 0 }],
        },
      },
    ] as any)

    // Offer matches
    mockResolveBestOffer.mockResolvedValue({
      offerId: "offer-1",
      offerName: "2-Piece Bundle",
      offerPrice: 1500,
      regularTotal: 1640,
      savings: 140,
      valid: true,
    } as any)

    mockPrisma.productVariant.findMany.mockResolvedValue([
      { id: "v1", productId: "prod-1", size: "Free", color: "Black", stock: 10, reservedStock: 0 },
      { id: "v2", productId: "prod-2", size: "Free", color: "White", stock: 8, reservedStock: 0 },
    ] as any)

    const result = await createLandingPageOrder({
      landingPageId: "page-1",
      selectedProductIds: ["lp-1", "lp-2"],
      productSelections: [
        { landingPageProductId: "lp-1", productId: "prod-1", quantity: 1, variantId: "v1" },
        { landingPageProductId: "lp-2", productId: "prod-2", quantity: 1, variantId: "v2" },
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
        selectedProductIds: ["lp-1"],
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
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      {
        id: "lp-1",
        product: {
          id: "prod-1",
          name: "Product A",
          price: 850,
          status: "Active",
          variants: [
            { id: "v1", size: "M", color: "Black", stock: 10, reservedStock: 0 },
            { id: "v2", size: "L", color: "Black", stock: 5, reservedStock: 0 },
          ],
        },
      },
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedProductIds: ["lp-1"],
        productSelections: [{ landingPageProductId: "lp-1", productId: "prod-1", quantity: 1 }], // No variantId
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
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      {
        id: "lp-1",
        product: {
          id: "prod-1",
          name: "Product A",
          price: 850,
          status: "Active",
          variants: [
            { id: "v1", size: "Free", color: "One Color", stock: 10, reservedStock: 0 },
          ],
        },
      },
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    mockPrisma.productVariant.findMany.mockResolvedValue([
      { id: "v1", productId: "prod-1", size: "Free", color: "One Color", stock: 10, reservedStock: 0 },
    ] as any)

    // No variantId provided, but single variant exists - should auto-resolve
    const result = await createLandingPageOrder({
      landingPageId: "page-1",
      selectedProductIds: ["lp-1"],
      productSelections: [{ landingPageProductId: "lp-1", productId: "prod-1", quantity: 1 }], // No variantId
      customer: { name: "Test", phone: "+8801712345678" },
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
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      {
        id: "lp-1",
        product: {
          id: "prod-1",
          name: "Product A",
          price: 850,
          status: "Active",
          variants: [{ id: "v1", size: "Free", color: "Black", stock: 10, reservedStock: 0 }],
        },
      },
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    mockPrisma.productVariant.findMany.mockResolvedValue([
      { id: "v-foreign", productId: "prod-other", size: "Free", color: "Black", stock: 10, reservedStock: 0 },
    ] as any)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedProductIds: ["lp-1"],
        productSelections: [{ landingPageProductId: "lp-1", productId: "prod-1", quantity: 1, variantId: "v-foreign" }],
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

  it("rejects unavailable variant (out of stock)", async () => {
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      {
        id: "lp-1",
        product: {
          id: "prod-1",
          name: "Product A",
          price: 850,
          status: "Active",
          variants: [{ id: "v1", size: "Free", color: "Black", stock: 0, reservedStock: 0 }],
        },
      },
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    mockPrisma.productVariant.findMany.mockResolvedValue([
      { id: "v1", productId: "prod-1", size: "Free", color: "Black", stock: 0, reservedStock: 0 },
    ] as any)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedProductIds: ["lp-1"],
        productSelections: [{ landingPageProductId: "lp-1", productId: "prod-1", quantity: 1, variantId: "v1" }],
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
    mockPrisma.landingPageProduct.findMany.mockResolvedValue([
      {
        id: "lp-1",
        product: {
          id: "prod-1",
          name: "Product A",
          price: 850,
          status: "Active",
          variants: [{ id: "v1", size: "Free", color: "Black", stock: 5, reservedStock: 5 }], // 0 available
        },
      },
    ] as any)

    mockResolveBestOffer.mockResolvedValue(null)

    mockPrisma.productVariant.findMany.mockResolvedValue([
      { id: "v1", productId: "prod-1", size: "Free", color: "Black", stock: 5, reservedStock: 5 },
    ] as any)

    await expect(
      createLandingPageOrder({
        landingPageId: "page-1",
        selectedProductIds: ["lp-1"],
        productSelections: [{ landingPageProductId: "lp-1", productId: "prod-1", quantity: 1, variantId: "v1" }],
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
