import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generateOrderNumber } from "@/lib/order-number"
import { getDeliveryFeeByDistrict } from "@/lib/delivery"
import { getDistrictById, getDivisionById } from "@/lib/bangladesh-address"
import { getPhoneServerValue } from "@/lib/utils"
import { isCheckoutVerificationTokenValid } from "@/lib/checkout/otp.service"
import { createCommerceOrder, type CommerceOrderLine } from "@/lib/checkout/order-creation"
import { resolveBestOfferForSelection } from "./offer-pricing"
import { allocateOfferTotal } from "./offer-allocation"

// Dedicated landing-page order service. Composes the shared commerce core
// (createCommerceOrder) with landing-specific authoritative resolution.
// The browser submits identifiers + customer data only; every commercial
// value below is derived server-side.

export type LandingCheckoutInput = {
  landingPageId: string
  selectedItemIds: string[]
  itemSelections?: { landingPageItemId: string; quantity: number; variantId?: string }[]
  customer: { name: string; email?: string; phone: string }
  address: {
    divisionId: string
    districtId?: string | null
    districtName: string
    upazilaName: string
    areaName?: string
    fullAddress: string
  }
  note?: string
  paymentMethod?: string
  idempotencyKey?: string
  checkoutVerificationToken?: string
  priceFingerprint?: { offerPrice: number; total: number }
}

export type CreatedLandingOrder = {
  orderId: string
  orderNumber: string
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  offerPrice: number
  regularTotal: number
  savings: number
  itemCount: number
  reusedExistingOrder: boolean
}

export class LandingCheckoutError extends Error {
  status: number
  code: string
  constructor(message: string, status = 400, code = "CHECKOUT_ERROR") {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function createLandingPageOrder(input: LandingCheckoutInput): Promise<CreatedLandingOrder> {
  const { landingPageId } = input

  // 1. Page must exist and be published (no draft/archived checkout).
  const page = await prisma.landingPage.findUnique({
    where: { id: landingPageId },
    select: { id: true, status: true, slug: true },
  })
  if (!page) throw new LandingCheckoutError("Landing page not found", 404, "PAGE_NOT_FOUND")
  if (page.status !== "published") {
    throw new LandingCheckoutError("This landing page is not available for ordering", 409, "PAGE_UNAVAILABLE")
  }

  if (!input.selectedItemIds || input.selectedItemIds.length === 0) {
    throw new LandingCheckoutError("selectedItemIds is required", 400, "INVALID_INPUT")
  }

  return checkoutWithLandingItems(page.id, input)
}

/**
 * Item-based checkout: auto-resolve offer from selected landing page items.
 */
async function checkoutWithLandingItems(landingPageId: string, input: LandingCheckoutInput): Promise<CreatedLandingOrder> {
  const selectedItemIds = input.selectedItemIds

  // 2. Auto-resolve the best offer for the selection.
  const resolved = await resolveBestOfferForSelection(landingPageId, selectedItemIds)

  // 3. Fetch landing page items with their own data.
  const items = await prisma.landingPageItem.findMany({
    where: { landingPageId, id: { in: selectedItemIds } },
    include: {
      variants: {
        where: { active: true },
        orderBy: { sortOrder: "asc" as const },
      },
    },
  })

  if (items.length === 0) {
    throw new LandingCheckoutError("No valid items selected", 400, "NO_ITEMS")
  }

  // Validate all items are active
  for (const item of items) {
    if (!item.active) {
      throw new LandingCheckoutError("One or more selected items are no longer available", 409, "ITEM_UNAVAILABLE")
    }
  }

  // 4. Handle variant selection for items that require variants.
  const variantSelections = input.itemSelections ?? []
  type Unit = {
    key: string
    landingPageItemId: string
    landingPageItemVariantId: string | null
    variantId: string | null
    name: string
    size: string | null
    color: string | null
    regular: number
  }
  const units: Unit[] = []

  for (const item of items) {
    const selection = variantSelections.find((s) => s.landingPageItemId === item.id)

    if (item.variants.length > 0) {
      // Item has variants - check if auto-resolvable
      const availableVariants = item.variants.filter((v) => Math.max(0, v.stock - v.reservedStock) > 0)

      let variantId = selection?.variantId

      // Auto-resolve: if exactly one variant is available and no selection provided
      if (!variantId && availableVariants.length === 1) {
        variantId = availableVariants[0].id
      }

      if (!variantId) {
        if (availableVariants.length === 0) {
          throw new LandingCheckoutError(
            `"${item.name}" is out of stock`,
            409,
            "INSUFFICIENT_STOCK"
          )
        }
        throw new LandingCheckoutError(
          `Variant is required for "${item.name}"`,
          400,
          "VARIANT_REQUIRED"
        )
      }

      const variant = item.variants.find((v) => v.id === variantId)
      if (!variant) {
        throw new LandingCheckoutError("Invalid variant selection", 400, "VARIANT_INVALID")
      }
      const available = Math.max(0, variant.stock - variant.reservedStock)
      if (available < 1) {
        throw new LandingCheckoutError(
          `Insufficient stock for ${variant.size} / ${variant.color}`,
          409,
          "INSUFFICIENT_STOCK"
        )
      }
      units.push({
        key: `${item.id}:0`,
        landingPageItemId: item.id,
        landingPageItemVariantId: variant.id,
        variantId: variant.id,
        name: item.name,
        size: variant.size,
        color: variant.color,
        regular: item.price,
      })
    } else {
      // No variant needed — check stock on the item itself
      const available = Math.max(0, item.stock - item.reservedStock)
      if (available <= 0) {
        throw new LandingCheckoutError(
          `"${item.name}" is out of stock`,
          409,
          "INSUFFICIENT_STOCK"
        )
      }
      units.push({
        key: `${item.id}:0`,
        landingPageItemId: item.id,
        landingPageItemVariantId: null,
        variantId: null,
        name: item.name,
        size: null,
        color: null,
        regular: item.price,
      })
    }
  }

  // 5. Address validation
  const division = getDivisionById(input.address.divisionId)
  if (!division) throw new LandingCheckoutError("Invalid division selected", 400, "ADDRESS_INVALID")
  if (input.address.districtId) {
    const district = getDistrictById(input.address.districtId)
    if (!district) throw new LandingCheckoutError("Invalid district selected", 400, "ADDRESS_INVALID")
    if (district.divisionId !== input.address.divisionId) {
      throw new LandingCheckoutError("District does not belong to the selected division", 400, "ADDRESS_INVALID")
    }
  }

  // 6. Server-calculated delivery
  let deliveryFee = 100
  if (input.address.districtId) {
    const calc = await getDeliveryFeeByDistrict(input.address.districtId)
    deliveryFee = calc.fee
  }

  // 7. Compute totals
  const regularTotal = units.reduce((sum, u) => sum + u.regular, 0)
  const offerPrice = resolved?.offerPrice ?? regularTotal
  const savings = Math.max(0, regularTotal - offerPrice)
  const total = offerPrice + deliveryFee

  // 8. Price fingerprint check
  if (input.priceFingerprint) {
    if (input.priceFingerprint.offerPrice !== offerPrice || input.priceFingerprint.total !== total) {
      throw new LandingCheckoutError(
        "Prices changed while you were checking out. Please review the updated totals and try again.",
        409,
        "PRICE_CHANGED"
      )
    }
  }

  // 9. Customer + payment + OTP gates
  const customerPhone = getPhoneServerValue(input.customer.phone)
  if (!/^\+8801[3-9]\d{8}$/.test(customerPhone)) {
    throw new LandingCheckoutError("Enter a valid Bangladeshi mobile number", 400, "PHONE_INVALID")
  }
  const session = await auth()
  const userId = session?.user?.id ?? null

  const paymentMethod = (input.paymentMethod ?? "cod").toLowerCase()
  if (paymentMethod !== "cod") {
    throw new LandingCheckoutError("Only Cash on Delivery is available at this time.", 400, "PAYMENT_UNSUPPORTED")
  }
  const codSetting = await prisma.paymentMethodSetting.findUnique({
    where: { provider: "COD" },
    select: { enabled: true },
  })
  if (!codSetting?.enabled) {
    throw new LandingCheckoutError("Cash on Delivery is currently unavailable. Please contact support.", 409, "PAYMENT_UNAVAILABLE")
  }

  const checkoutSetting = await prisma.checkoutSetting.findUnique({ where: { id: "checkout" } })
  const isV2 = checkoutSetting?.checkoutV2Enabled ?? false
  const codReservationHours = checkoutSetting?.codReservationHours ?? 24

  let otpConsume: { token: string; phone: string } | null = null
  if (isV2 && (checkoutSetting?.otpRequired ?? true)) {
    if (!input.checkoutVerificationToken) {
      throw new LandingCheckoutError("Phone verification is required", 400, "OTP_REQUIRED")
    }
    const tokenValid = await isCheckoutVerificationTokenValid(input.checkoutVerificationToken, customerPhone)
    if (!tokenValid) {
      throw new LandingCheckoutError("Invalid or expired verification token", 400, "OTP_INVALID")
    }
    otpConsume = { token: input.checkoutVerificationToken, phone: customerPhone }
  }

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { phone: customerPhone, phoneVerifiedAt: new Date() },
    }).catch(() => {})
  }

  // 10. Allocate order lines
  units.sort((a, b) => (a.key < b.key ? -1 : 1))
  const allocated = allocateOfferTotal(
    units.map((u) => ({ key: u.key, regular: u.regular })),
    offerPrice
  )
  const rowMap = new Map<string, CommerceOrderLine>()
  for (const u of units) {
    const price = allocated.get(u.key) ?? 0
    const rowKey = `${u.landingPageItemId}::${u.variantId ?? ""}::${price}`
    const row = rowMap.get(rowKey)
    if (row) {
      row.quantity += 1
    } else {
      rowMap.set(rowKey, {
        productId: null,
        variantId: null,
        landingPageItemId: u.landingPageItemId,
        landingPageItemVariantId: u.landingPageItemVariantId,
        name: u.name,
        size: u.size,
        color: u.color,
        quantity: 1,
        price,
      })
    }
  }
  const lines = [...rowMap.values()]

  // 11. Create order
  const orderNumber = await generateOrderNumber()
  const idempotencyKey = input.idempotencyKey || crypto.randomUUID()
  const reservationExpiresAt = isV2 ? new Date(Date.now() + codReservationHours * 60 * 60 * 1000) : null

  const { order, reusedExistingOrder } = await createCommerceOrder({
    orderNumber,
    customer: {
      userId,
      name: input.customer.name.trim(),
      email: (input.customer.email ?? "").trim(),
      phone: customerPhone,
      divisionName: division.name,
      districtName: input.address.districtName.trim(),
      upazilaName: input.address.upazilaName.trim(),
      areaName: (input.address.areaName ?? "").trim(),
      fullAddress: input.address.fullAddress.trim(),
      notes: input.note?.trim() || null,
    },
    lines,
    pricing: {
      subtotal: regularTotal,
      deliveryFee,
      discount: savings,
      productSubtotal: regularTotal,
      productDiscount: savings,
      deliveryDiscount: 0,
      discountedProductTotal: offerPrice,
      finalDeliveryFee: deliveryFee,
      total,
      payNow: 0,
      dueAmount: total,
      paymentRule: "cod_only",
      paymentRuleValue: null,
      paymentRuleSource: "global",
    },
    paymentMethod: "cod",
    couponCode: null,
    couponScope: null,
    idempotencyKey,
    reservationExpiresAt,
    otpVerified: false,
    otpVerifiedAt: null,
    otpConsume,
    attribution: { landingPageId, landingPageOfferId: resolved?.offerId ?? null },
  })

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    subtotal: regularTotal,
    discount: savings,
    deliveryFee,
    total,
    offerPrice,
    regularTotal,
    savings,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    reusedExistingOrder,
  }
}
