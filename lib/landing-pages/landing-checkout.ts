import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generateOrderNumber } from "@/lib/order-number"
import { getDeliveryFeeByDistrict } from "@/lib/delivery"
import { getDistrictById, getDivisionById } from "@/lib/bangladesh-address"
import { getPhoneServerValue } from "@/lib/utils"
import { isCheckoutVerificationTokenValid } from "@/lib/checkout/otp.service"
import { createCommerceOrder, type CommerceOrderLine } from "@/lib/checkout/order-creation"
import { resolveLandingOffer, resolveBestOfferForSelection } from "./offer-pricing"
import { allocateOfferTotal } from "./offer-allocation"

// Dedicated landing-page order service. Composes the shared commerce core
// (createCommerceOrder) with landing-specific authoritative resolution.
// The browser submits identifiers + customer data only; every commercial
// value below is derived server-side.
//
// Supports two flows:
// 1. Product-based (new): client sends selectedProductIds, server auto-resolves offer
// 2. Offer-based (legacy): client sends offerId + selections (backward compat)

export type LandingUnitSelection = {
  landingPageProductId: string
  unitIndex: number
  variantId: string
}

export type LandingCheckoutInput = {
  landingPageId: string
  // New product-based flow
  selectedProductIds?: string[]
  productSelections?: { landingPageProductId: string; productId: string; quantity: number; variantId?: string }[]
  // Legacy offer-based flow
  offerId?: string
  selections?: LandingUnitSelection[]
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

  // Determine flow: product-based or offer-based
  const isProductFlow = input.selectedProductIds && input.selectedProductIds.length > 0
  const isOfferFlow = input.offerId && input.selections && input.selections.length > 0

  if (!isProductFlow && !isOfferFlow) {
    throw new LandingCheckoutError("Either selectedProductIds or offerId with selections is required", 400, "INVALID_INPUT")
  }

  if (isProductFlow) {
    return checkoutWithProductSelection(page.id, input)
  } else {
    return checkoutWithOffer(page.id, input)
  }
}

/**
 * Product-based checkout: auto-resolve offer from selected products.
 */
async function checkoutWithProductSelection(landingPageId: string, input: LandingCheckoutInput): Promise<CreatedLandingOrder> {
  const selectedProductIds = input.selectedProductIds!

  // 2. Auto-resolve the best offer for the selection.
  const resolved = await resolveBestOfferForSelection(landingPageId, selectedProductIds)

  // Build units from product selections for order creation.
  // Fetch the landing page products to get real product data.
  const links = await prisma.landingPageProduct.findMany({
    where: { landingPageId, id: { in: selectedProductIds } },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          status: true,
          variants: { select: { id: true, size: true, color: true, stock: true, reservedStock: true } },
        },
      },
    },
  })

  if (links.length === 0) {
    throw new LandingCheckoutError("No valid products selected", 400, "NO_PRODUCTS")
  }

  // Validate all products are active
  for (const link of links) {
    if (!link.product || link.product.status !== "Active") {
      throw new LandingCheckoutError("One or more selected products are no longer available", 409, "PRODUCT_UNAVAILABLE")
    }
  }

  // 3. Handle variant selection for products that require variants.
  const variantSelections = input.productSelections ?? []
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

  for (const link of links) {
    const product = link.product!
    const selection = variantSelections.find((s) => s.landingPageProductId === link.id)

    if (product.variants.length > 0) {
      // Product has variants - check if auto-resolvable
      const availableVariants = product.variants.filter((v) => Math.max(0, v.stock - v.reservedStock) > 0)

      let variantId = selection?.variantId

      // Auto-resolve: if exactly one variant is available and no selection provided
      if (!variantId && availableVariants.length === 1) {
        variantId = availableVariants[0].id
      }

      if (!variantId) {
        if (availableVariants.length === 0) {
          throw new LandingCheckoutError(
            `"${link.displayTitle || product.name}" is out of stock`,
            409,
            "INSUFFICIENT_STOCK"
          )
        }
        throw new LandingCheckoutError(
          `Variant is required for "${link.displayTitle || product.name}"`,
          400,
          "VARIANT_REQUIRED"
        )
      }

      const variant = product.variants.find((v) => v.id === variantId)
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
        key: `${link.id}:0`,
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        size: variant.size,
        color: variant.color,
        regular: product.price,
      })
    } else {
      // No variant needed — check aggregate stock
      const totalAvailable = product.variants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reservedStock), 0)
      if (totalAvailable <= 0) {
        throw new LandingCheckoutError(
          `"${link.displayTitle || product.name}" is out of stock`,
          409,
          "INSUFFICIENT_STOCK"
        )
      }
      // For products without variants, use the first variant or a placeholder
      const firstVariant = product.variants[0]
      units.push({
        key: `${link.id}:0`,
        productId: product.id,
        variantId: firstVariant?.id ?? "",
        name: product.name,
        size: firstVariant?.size ?? "Default",
        color: firstVariant?.color ?? "Default",
        regular: product.price,
      })
    }
  }

  // 4. Address validation
  const division = getDivisionById(input.address.divisionId)
  if (!division) throw new LandingCheckoutError("Invalid division selected", 400, "ADDRESS_INVALID")
  if (input.address.districtId) {
    const district = getDistrictById(input.address.districtId)
    if (!district) throw new LandingCheckoutError("Invalid district selected", 400, "ADDRESS_INVALID")
    if (district.divisionId !== input.address.divisionId) {
      throw new LandingCheckoutError("District does not belong to the selected division", 400, "ADDRESS_INVALID")
    }
  }

  // 5. Server-calculated delivery
  let deliveryFee = 100
  if (input.address.districtId) {
    const calc = await getDeliveryFeeByDistrict(input.address.districtId)
    deliveryFee = calc.fee
  }

  // 6. Compute totals
  const regularTotal = units.reduce((sum, u) => sum + u.regular, 0)
  const offerPrice = resolved?.offerPrice ?? regularTotal
  const savings = Math.max(0, regularTotal - offerPrice)
  const total = offerPrice + deliveryFee

  // 7. Price fingerprint check
  if (input.priceFingerprint) {
    if (input.priceFingerprint.offerPrice !== offerPrice || input.priceFingerprint.total !== total) {
      throw new LandingCheckoutError(
        "Prices changed while you were checking out. Please review the updated totals and try again.",
        409,
        "PRICE_CHANGED"
      )
    }
  }

  // 8. Customer + payment + OTP gates
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

  // 9. Allocate order lines
  units.sort((a, b) => (a.key < b.key ? -1 : 1))
  const allocated = allocateOfferTotal(
    units.map((u) => ({ key: u.key, regular: u.regular })),
    offerPrice
  )
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

  // 10. Create order
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

/**
 * Legacy offer-based checkout (backward compat).
 */
async function checkoutWithOffer(landingPageId: string, input: LandingCheckoutInput): Promise<CreatedLandingOrder> {
  const { offerId, selections } = input as { offerId: string; selections: LandingUnitSelection[] }

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

  // 3. Selections must match the offer structure exactly.
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

  // 5-10: Same flow as original (address, delivery, totals, customer, order creation)
  const division = getDivisionById(input.address.divisionId)
  if (!division) throw new LandingCheckoutError("Invalid division selected", 400, "ADDRESS_INVALID")
  if (input.address.districtId) {
    const district = getDistrictById(input.address.districtId)
    if (!district) throw new LandingCheckoutError("Invalid district selected", 400, "ADDRESS_INVALID")
    if (district.divisionId !== input.address.divisionId) {
      throw new LandingCheckoutError("District does not belong to the selected division", 400, "ADDRESS_INVALID")
    }
  }

  let deliveryFee = 100
  if (input.address.districtId) {
    const calc = await getDeliveryFeeByDistrict(input.address.districtId)
    deliveryFee = calc.fee
  }

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
  units.sort((a, b) => (a.key < b.key ? -1 : 1))
  const allocated = allocateOfferTotal(
    units.map((u) => ({ key: u.key, regular: u.regular })),
    resolved.offerPrice
  )
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
