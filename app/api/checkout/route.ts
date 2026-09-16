import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { rateLimitByIp } from "@/lib/rate-limit"
import { generateOrderNumber } from "@/lib/order-number"
import { getDeliveryFeeByDistrict } from "@/lib/delivery"
import { checkoutSchema } from "@/lib/validations"
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "@/lib/mailer"
import {
  getDivisionById,
  getDistrictById,
} from "@/lib/bangladesh-address"
import { getPhoneServerValue } from "@/lib/utils"
import type { DeliveryZone } from "@/types"
import { applyScopedCoupon } from "@/lib/checkout/coupon-engine.service"
import { isCheckoutVerificationTokenValid } from "@/lib/checkout/otp.service"
import { generateSuccessToken } from "@/lib/checkout/success-token"
import { createCommerceOrder } from "@/lib/checkout/order-creation"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { limited } = rateLimitByIp(request, 10, 60 * 1000)
    if (limited) return error("Too many requests. Please try again later.", 429)

    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const {
      items,
      paymentMethod,
      couponCode,
      notes,
      checkoutVerificationToken,
      idempotencyKey,
      abandonedCheckoutToken,
      ...customer
    } = parsed.data

    const customerPhone = getPhoneServerValue(customer.phone)
    const session = await auth()
    const userId = session?.user?.id ?? null

    const division = getDivisionById(customer.divisionId)
    if (!division) return error("Invalid division selected")

    // districtId is optional for custom districts
    if (customer.districtId) {
      const district = getDistrictById(customer.districtId)
      if (!district) return error("Invalid district selected")
      if (district.divisionId !== customer.divisionId) {
        return error("District does not belong to the selected division")
      }
    }

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: customerPhone,
          phoneVerifiedAt: new Date(),
        },
      })
    }

    const { zone: deliveryZone, fee: deliveryFee } = customer.districtId
      ? await getDeliveryFeeByDistrict(customer.districtId)
      : { zone: "outside" as DeliveryZone, fee: 100 }
    const orderNumber = await generateOrderNumber()

    const productIds = [...new Set(items.map((i) => i.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "Active" },
      select: {
        id: true,
        name: true,
        price: true,
        variants: {
          select: {
            id: true,
            productId: true,
            size: true,
            color: true,
            stock: true,
            reservedStock: true,
          },
        },
        paymentRuleOverride: true,
        paymentRuleValueOverride: true,
      },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const variantIds = items.map((i) => i.variantId).filter(Boolean) as string[]
    const variants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: { product: { select: { id: true, status: true } } },
        })
      : []
    const variantMap = new Map(variants.map((v) => [v.id, v]))

    const validatedItems = items.map((item) => {
      const product = productMap.get(item.productId)
      if (!product) throw new Error(`Product not found or unavailable: ${item.productId}`)

      if (product.variants.length > 0 && !item.variantId) {
        throw new Error(`Please select a valid variant for "${product.name}"`)
      }

      if (!item.variantId) {
        throw new Error(`This product is not available for checkout. Please select an available variant.`)
      }

      const variant = variantMap.get(item.variantId)
      if (!variant) throw new Error(`Invalid variant selected for "${product.name}"`)
      if (variant.productId !== item.productId) {
        throw new Error(`Selected variant does not belong to "${product.name}"`)
      }
      if (variant.product.status !== "Active") {
        throw new Error(`Product is no longer available: "${product.name}"`)
      }

      const availableStock = Math.max(0, variant.stock - variant.reservedStock)
      if (availableStock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${availableStock}, requested: ${item.quantity}`
        )
      }

      return { ...item, product, variant, price: product.price }
    })

    const subtotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    let discount = 0
    let couponScope: string | null = null
    let productDiscount = 0
    let deliveryDiscount = 0
    let discountedProductTotal = subtotal
    let finalDeliveryFeeCalc = deliveryFee

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
      if (!coupon) return error("Coupon not found")
      if (!coupon.active) return error("Coupon is inactive")
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return error("Coupon has expired")
      if (subtotal < coupon.minOrder) return error(`Minimum order amount is ৳${coupon.minOrder.toLocaleString()}`)

      const identityKey = userId ?? customer.email
      if (!identityKey) return error("Please provide an email to use a coupon")

      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return error("This coupon has reached its maximum usage limit")
      }

      if (coupon.maxUsesPerCustomer) {
        const usageCount = await prisma.couponUsage.count({
          where: {
            couponId: coupon.id,
            customerKey: identityKey,
          },
        })
        if (usageCount >= coupon.maxUsesPerCustomer) {
          return error(`You have already used this coupon ${coupon.maxUsesPerCustomer} time(s)`)
        }
      }

      const result = applyScopedCoupon({
        coupon,
        productSubtotal: subtotal,
        deliveryFee,
        couponCode: coupon.code,
      })

      if (result.totalDiscount <= 0) {
        return error("This coupon does not apply to your order")
      }

      discount = result.totalDiscount
      couponScope = result.couponScope
      productDiscount = result.productDiscount
      deliveryDiscount = result.deliveryDiscount
      discountedProductTotal = result.discountedProductTotal
      finalDeliveryFeeCalc = result.finalDeliveryFee
    }

    const total = discountedProductTotal + finalDeliveryFeeCalc

    const checkoutSetting = await prisma.checkoutSetting.findUnique({ where: { id: "checkout" } })

    const paymentResult = {
      paymentRule: "cod_only",
      paymentRuleValue: null,
      payNow: 0,
      dueAmount: total,
      source: "global",
    }

    const isV2 = checkoutSetting?.checkoutV2Enabled ?? false
    const otpRequired = checkoutSetting?.otpRequired ?? true
    const codReservationHours = checkoutSetting?.codReservationHours ?? 24

    // Payment method guard — only COD is supported
    if (paymentMethod && paymentMethod.toLowerCase() !== "cod") {
      return error("Only Cash on Delivery is available at this time.")
    }
    const normalizedPaymentMethod = "cod"
    // Backend COD guard: reject COD if disabled in PaymentMethodSetting
    if (paymentMethod && paymentMethod.toLowerCase() === "cod") {
      const codSetting = await prisma.paymentMethodSetting.findUnique({
        where: { provider: "COD" },
        select: { enabled: true },
      })
      if (!codSetting?.enabled) {
        return error("Cash on Delivery is currently unavailable. Please contact support.")
      }
    }

    if (isV2 && otpRequired) {
      if (!checkoutVerificationToken) {
        return error("Verification token is required")
      }
      const tokenValid = await isCheckoutVerificationTokenValid(checkoutVerificationToken, customerPhone)
      if (!tokenValid) {
        return error("Invalid or expired verification token")
      }
    }

    const isOnlinePayment = false

    let resolvedIdempotencyKey: string | null = idempotencyKey ?? request.headers.get("X-Checkout-Session-Id") ?? null

    if (isV2 && !resolvedIdempotencyKey) {
      resolvedIdempotencyKey = crypto.randomUUID()
      console.warn(`[checkout] No idempotencyKey provided. Generated server-side: ${resolvedIdempotencyKey}`)
    }

    let reservationExpiresAt: Date | null = null

    if (isV2) {
      reservationExpiresAt = new Date(Date.now() + codReservationHours * 60 * 60 * 1000)
    }

    let reusedExistingOrder = false

    // Trusted commerce core shared with landing-page checkout. All inputs
    // below are validated/server-derived above — nothing comes from the
    // client at this point except identifiers and customer data.
    const { order, reusedExistingOrder: reused } = await createCommerceOrder({
      orderNumber,
      customer: {
        userId,
        name: customer.name,
        email: customer.email,
        phone: customerPhone,
        divisionName: customer.divisionName,
        districtName: customer.districtName,
        upazilaName: customer.upazilaName,
        areaName: customer.areaName,
        fullAddress: customer.fullAddress,
        notes: notes || null,
      },
      lines: validatedItems.map((item) => ({
        productId: item.product.id,
        variantId: item.variant?.id ?? null,
        landingPageItemId: null,
        landingPageItemVariantId: null,
        name: item.product.name,
        size: item.variant?.size ?? null,
        color: item.variant?.color ?? null,
        quantity: item.quantity,
        price: item.price,
      })),
      pricing: {
        subtotal,
        deliveryFee,
        discount,
        productSubtotal: subtotal,
        productDiscount,
        deliveryDiscount,
        discountedProductTotal,
        finalDeliveryFee: finalDeliveryFeeCalc,
        total,
        payNow: paymentResult.payNow,
        dueAmount: paymentResult.dueAmount,
        paymentRule: paymentResult.paymentRule,
        paymentRuleValue: paymentResult.paymentRuleValue,
        paymentRuleSource: paymentResult.source,
      },
      paymentMethod: normalizedPaymentMethod,
      couponCode: couponCode || null,
      couponScope,
      idempotencyKey: resolvedIdempotencyKey,
      reservationExpiresAt,
      paymentExpiresAt: isV2 && paymentResult.payNow > 0 ? reservationExpiresAt : null,
      otpVerified: false,
      otpVerifiedAt: null,
      otpConsume: isV2 && otpRequired && checkoutVerificationToken
        ? { token: checkoutVerificationToken, phone: customerPhone }
        : null,
    })
    reusedExistingOrder = reused

    const paymentInitData: { paymentId?: string; paymentUrl?: string } | null = null

    if (reusedExistingOrder) {
      return success({ order, paymentInitData }, 200)
    }

    if (abandonedCheckoutToken) {
      prisma.abandonedCheckout.updateMany({
        where: {
          token: abandonedCheckoutToken,
          status: { in: ["active", "recovered"] },
        },
        data: {
          status: "converted",
          orderId: order.id,
          lastActivityAt: new Date(),
        },
      }).catch(() => {})
    }

    sendOrderConfirmationEmail({
      userId: order.userId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      total: order.total,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
      })),
    }).catch(() => {})

    sendAdminNewOrderEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      total: order.total,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
      })),
    }).catch(() => {})

    const successToken = generateSuccessToken(order.orderNumber)

    return success({ order, paymentInitData, successToken }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order"
    return error(message)
  }
}
