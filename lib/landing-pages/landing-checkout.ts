import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generateOrderNumber } from "@/lib/order-number"
import { getDeliveryFeeByDistrict } from "@/lib/delivery"
import { getDistrictById, getDivisionById } from "@/lib/bangladesh-address"
import { getPhoneServerValue } from "@/lib/utils"
import { isCheckoutVerificationTokenValid } from "@/lib/checkout/otp.service"
import { createCommerceOrder, type CommerceOrderLine } from "@/lib/checkout/order-creation"
import { resolveLandingOffer } from "./offer-pricing"
import { allocateOfferTotal } from "./offer-allocation"

// Dedicated landing-page order service. Composes the shared commerce core
// (createCommerceOrder) with landing-specific authoritative resolution.
// The browser submits identifiers + customer data only; every commercial
// value below is derived server-side.

export type LandingUnitSelection = {
  landingPageProductId: string
  unitIndex: number
  variantId: string
}

export type LandingCheckoutInput = {
  landingPageId: string
  offerId: string
  selections: LandingUnitSelection[]
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
  const { landingPageId, offerId, selections } = input

  // 1. Page must exist and be published (no draft/archived checkout).
  const page = await prisma.landingPage.findUnique({
    where: { id: landingPageId },
    select: { id: true, status: true, slug: true },
  })
  if (!page) throw new LandingCheckoutError("Landing page not found", 404, "PAGE_NOT_FOUND")
  if (page.status !== "published") {
    throw new LandingCheckoutError("This landing page is not available for ordering", 409, "PAGE_UNAVAILABLE")
  }

  // 2. Re-resolve the offer live (enabled, products, prices, stock bounds).
  const resolved = await resolveLandingOffer(landingPageId, offerId)
  if (!resolved) throw new LandingCheckoutError("Offer not found", 404, "OFFER_NOT_FOUND")
  if (!resolved.valid) {
    throw new LandingCheckoutError(
      resolved.invalidReason ?? "This offer is currently unavailable",
      409,
      "OFFER_UNAVAILABLE"
    )
  }

  // 3. Selections must match the offer structure exactly: one entry per
  // required unit, no extras, no duplicates, deterministic keys.
  const expectedKeys = new Set<string>()
  for (const item of resolved.items) {
    for (let u = 0; u < item.quantity; u++) expectedKeys.add(`${item.landingPageProductId}:${u}`)
  }
  if (selections.length !== expectedKeys.size) {
    throw new LandingCheckoutError("Variant selection does not match the offer", 400, "SELECTION_MISMATCH")
  }
  const seen = new Set<string>()
  for (const s of selections) {
    const key = `${s.landingPageProductId}:${s.unitIndex}`
    if (!expectedKeys.has(key)) {
      throw new LandingCheckoutError("Variant selection does not match the offer", 400, "SELECTION_MISMATCH")
    }
    if (seen.has(key)) {
      throw new LandingCheckoutError("Duplicate variant selection", 400, "SELECTION_DUPLICATE")
    }
    if (!s.variantId) {
      throw new LandingCheckoutError("A required variant is missing", 400, "VARIANT_REQUIRED")
    }
    seen.add(key)
  }

  // 4. Variants: identity + ownership + exact grouped stock validation.
  const variantIds = [...new Set(selections.map((s) => s.variantId))]
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, productId: true, size: true, color: true, stock: true, reservedStock: true },
  })
  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const linkProduct = new Map(resolved.items.map((i) => [i.landingPageProductId, i.productId]))

  const requiredByVariant = new Map<string, { count: number; label: string }>()
  for (const s of selections) {
    const productId = linkProduct.get(s.landingPageProductId)
    const variant = variantMap.get(s.variantId)
    if (!variant || variant.productId !== productId) {
      throw new LandingCheckoutError("Invalid variant selection", 400, "VARIANT_INVALID")
    }
    const entry = requiredByVariant.get(s.variantId) ?? { count: 0, label: `${variant.size} / ${variant.color}` }
    entry.count += 1
    requiredByVariant.set(s.variantId, entry)
  }
  for (const [variantId, req] of requiredByVariant) {
    const variant = variantMap.get(variantId)
    const available = variant ? Math.max(0, variant.stock - variant.reservedStock) : 0
    if (available < req.count) {
      throw new LandingCheckoutError(
        `Insufficient stock for ${req.label}. Available: ${available}, requested: ${req.count}`,
        409,
        "INSUFFICIENT_STOCK"
      )
    }
  }

  // 5. Address: same division/district rules as normal checkout.
  const division = getDivisionById(input.address.divisionId)
  if (!division) throw new LandingCheckoutError("Invalid division selected", 400, "ADDRESS_INVALID")
  if (input.address.districtId) {
    const district = getDistrictById(input.address.districtId)
    if (!district) throw new LandingCheckoutError("Invalid district selected", 400, "ADDRESS_INVALID")
    if (district.divisionId !== input.address.divisionId) {
      throw new LandingCheckoutError("District does not belong to the selected division", 400, "ADDRESS_INVALID")
    }
  }

  // 6. Server-calculated delivery (same calculator + outside fallback).
  let deliveryFee = 100
  if (input.address.districtId) {
    const calc = await getDeliveryFeeByDistrict(input.address.districtId)
    deliveryFee = calc.fee
  }

  // 7. Totals: fixed offer price + delivery. Fingerprint mismatch means the
  // visible price moved after render — refuse rather than surprise.
  const total = resolved.offerPrice + deliveryFee
  if (input.priceFingerprint) {
    if (input.priceFingerprint.offerPrice !== resolved.offerPrice || input.priceFingerprint.total !== total) {
      throw new LandingCheckoutError(
        "Prices changed while you were checking out. Please review the updated totals and try again.",
        409,
        "PRICE_CHANGED"
      )
    }
  }

  // 8. Customer + payment + OTP gates (same as normal checkout).
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
  const otpRequired = checkoutSetting?.otpRequired ?? true
  const codReservationHours = checkoutSetting?.codReservationHours ?? 24

  let otpConsume: { token: string; phone: string } | null = null
  if (isV2 && otpRequired) {
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

  // 9. Allocate the fixed offer total across units → OrderItem rows.
  // Real variant size/color and real product names snapshot the lines;
  // unit prices are allocated shares, never client values.
  type Unit = {
    key: string
    productId: string
    variantId: string
    name: string
    size: string
    color: string
    regular: number
  }
  const units: Unit[] = []
  for (const s of selections) {
    const item = resolved.items.find((i) => i.landingPageProductId === s.landingPageProductId)
    const variant = variantMap.get(s.variantId)
    if (!item || !variant) throw new LandingCheckoutError("Invalid variant selection", 400, "VARIANT_INVALID")
    units.push({
      key: `${s.landingPageProductId}:${s.unitIndex}`,
      productId: item.productId,
      variantId: variant.id,
      name: item.productName,
      size: variant.size,
      color: variant.color,
      regular: item.unitPrice,
    })
  }
  // Deterministic unit order for a stable allocation.
  units.sort((a, b) => (a.key < b.key ? -1 : 1))
  const allocated = allocateOfferTotal(
    units.map((u) => ({ key: u.key, regular: u.regular })),
    resolved.offerPrice
  )
  // Group identical (product, variant, price) units into OrderItem rows.
  const rowMap = new Map<string, CommerceOrderLine>()
  for (const u of units) {
    const price = allocated.get(u.key) ?? 0
    const rowKey = `${u.productId}::${u.variantId}::${price}`
    const row = rowMap.get(rowKey)
    if (row) {
      row.quantity += 1
    } else {
      rowMap.set(rowKey, {
        productId: u.productId,
        variantId: u.variantId,
        name: u.name,
        size: u.size,
        color: u.color,
        quantity: 1,
        price,
      })
    }
  }
  const lines = [...rowMap.values()]

  // 10. Order-level fields mirror normal-checkout semantics: subtotal holds
  // the regular total, discount holds offer savings, so reports stay
  // coherent and item rows sum exactly to the charged product total.
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
      subtotal: resolved.regularTotal,
      deliveryFee,
      discount: resolved.savings,
      productSubtotal: resolved.regularTotal,
      productDiscount: resolved.savings,
      deliveryDiscount: 0,
      discountedProductTotal: resolved.offerPrice,
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
    attribution: { landingPageId, landingPageOfferId: offerId },
  })

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    subtotal: resolved.regularTotal,
    discount: resolved.savings,
    deliveryFee,
    total,
    offerPrice: resolved.offerPrice,
    regularTotal: resolved.regularTotal,
    savings: resolved.savings,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    reusedExistingOrder,
  }
}
