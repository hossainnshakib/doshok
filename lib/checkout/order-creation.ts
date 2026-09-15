import { prisma } from "@/lib/prisma"

// Shared trusted commerce core used by both the storefront checkout
// (POST /api/checkout) and the landing-page checkout
// (POST /api/landing-pages/[id]/checkout).
//
// All inputs must already be validated and server-derived by the caller:
// prices, quantities, variants, delivery and totals are NEVER taken from
// the client here — the caller resolves them authoritatively first.

export type CommerceOrderLine = {
  productId: string
  variantId: string | null
  name: string
  size: string | null
  color: string | null
  quantity: number
  price: number
}

export type CommerceCustomer = {
  userId: string | null
  name: string
  email: string
  phone: string
  divisionName: string
  districtName: string
  upazilaName: string
  areaName: string
  fullAddress: string
  notes: string | null
}

export type CommercePricing = {
  subtotal: number
  deliveryFee: number
  discount: number
  productSubtotal: number
  productDiscount: number
  deliveryDiscount: number
  discountedProductTotal: number
  finalDeliveryFee: number
  total: number
  payNow: number
  dueAmount: number
  paymentRule: string
  paymentRuleValue: number | null
  paymentRuleSource: string
}

export type CommerceAttribution = {
  landingPageId?: string | null
  landingPageOfferId?: string | null
}

export type CommerceOrderInput = {
  orderNumber: string
  customer: CommerceCustomer
  lines: CommerceOrderLine[]
  pricing: CommercePricing
  paymentMethod: string
  couponCode?: string | null
  couponScope?: string | null
  idempotencyKey: string | null
  reservationExpiresAt: Date | null
  paymentExpiresAt?: Date | null
  otpVerified: boolean
  otpVerifiedAt: Date | null
  otpConsume?: { token: string; phone: string } | null
  attribution?: CommerceAttribution
}

export async function createCommerceOrder(input: CommerceOrderInput) {
  const {
    orderNumber,
    customer,
    lines,
    pricing,
    paymentMethod,
    couponCode,
    couponScope,
    idempotencyKey,
    reservationExpiresAt,
    paymentExpiresAt,
    otpVerified: otpVerifiedInput,
    otpVerifiedAt: otpVerifiedAtInput,
    otpConsume,
    attribution,
  } = input

  let otpVerified = otpVerifiedInput
  let otpVerifiedAtValue = otpVerifiedAtInput
  let reusedExistingOrder = false

  const order = await prisma.$transaction(async (tx) => {
    if (idempotencyKey) {
      const existingOrder = await tx.order.findUnique({
        where: { idempotencyKey },
        include: { items: true, address: true },
      })
      if (existingOrder) {
        reusedExistingOrder = true
        return existingOrder
      }
    }

    if (otpConsume) {
      const result = await tx.phoneOtpVerification.updateMany({
        where: {
          checkoutToken: otpConsume.token,
          checkoutTokenUsedAt: null,
          checkoutTokenExpiresAt: { gt: new Date() },
          phone: otpConsume.phone,
        },
        data: {
          checkoutTokenUsedAt: new Date(),
        },
      })

      if (result.count !== 1) {
        const record = await tx.phoneOtpVerification.findUnique({
          where: { checkoutToken: otpConsume.token },
        })
        if (!record) throw new Error("Invalid verification token.")
        if (record.phone !== otpConsume.phone) throw new Error("Verification token does not match the provided phone number.")
        if (!record.checkoutTokenExpiresAt || new Date() > record.checkoutTokenExpiresAt) {
          throw new Error("Verification token has expired.")
        }
        throw new Error("Verification token has already been used.")
      }

      otpVerified = true
      otpVerifiedAtValue = new Date()
    }

    for (const item of lines) {
      if (item.variantId) {
        const result = await tx.$executeRaw`
          UPDATE "ProductVariant"
          SET "reservedStock" = "reservedStock" + ${item.quantity}
          WHERE id = ${item.variantId}
            AND "productId" = ${item.productId}
            AND ("stock" - "reservedStock") >= ${item.quantity}
        `
        if (result === 0) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
          const availableStock = variant ? Math.max(0, variant.stock - variant.reservedStock) : 0
          throw new Error(
            `Insufficient stock for "${item.name}". Available: ${availableStock}, requested: ${item.quantity}`
          )
        }
      }
    }

    if (couponCode && pricing.discount > 0) {
      const coupon = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
      if (!coupon) throw new Error("Coupon not found")
      if (!coupon.active) throw new Error("Coupon is inactive")
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) throw new Error("Coupon has expired")

      if (coupon.maxUses !== null) {
        const result = await tx.coupon.updateMany({
          where: { code: couponCode.toUpperCase(), usedCount: { lt: coupon.maxUses } },
          data: { usedCount: { increment: 1 } },
        })
        if (result.count === 0) throw new Error("This coupon has reached its maximum usage limit")
      } else {
        await tx.coupon.update({
          where: { code: couponCode.toUpperCase() },
          data: { usedCount: { increment: 1 } },
        })
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: customer.userId,
        customerName: customer.name,
        customerEmail: customer.email || "",
        customerPhone: customer.phone,
        subtotal: pricing.subtotal,
        deliveryFee: pricing.deliveryFee,
        discount: pricing.discount,
        total: pricing.total,
        paidAmount: 0,
        paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        couponCode: couponCode || null,
        couponType: couponScope,
        productSubtotal: pricing.productSubtotal,
        productDiscount: pricing.productDiscount,
        deliveryDiscount: pricing.deliveryDiscount,
        discountedProductTotal: pricing.discountedProductTotal,
        finalDeliveryFee: pricing.finalDeliveryFee,
        payNow: pricing.payNow,
        dueAmount: pricing.dueAmount,
        paymentRule: pricing.paymentRule,
        paymentRuleValue: pricing.paymentRuleValue,
        paymentRuleSource: pricing.paymentRuleSource,
        notes: customer.notes || null,
        idempotencyKey,
        reservationExpiresAt,
        otpVerified,
        otpVerifiedAt: otpVerifiedAtValue,
        ...(paymentExpiresAt ? { paymentExpiresAt } : {}),
        landingPageId: attribution?.landingPageId ?? null,
        landingPageOfferId: attribution?.landingPageOfferId ?? null,
        address: {
          create: {
            division: customer.divisionName,
            district: customer.districtName,
            thana: customer.upazilaName,
            fullAddress: [customer.areaName, customer.fullAddress].filter(Boolean).join(", "),
            phone: customer.phone,
          },
        },
        items: {
          create: lines.map((item) => {
            return {
              productId: item.productId,
              variantId: item.variantId ?? null,
              name: item.name,
              size: item.size ?? null,
              color: item.color ?? null,
              quantity: item.quantity,
              price: item.price,
            }
          }),
        },
      },
      include: { items: true, address: true },
    })

    if (couponCode && pricing.discount > 0) {
      const coupon = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
      if (coupon) {
        const customerKey = customer.userId ?? customer.email ?? ""
        if (coupon.maxUsesPerCustomer) {
          const usageCount = await tx.couponUsage.count({
            where: {
              couponId: coupon.id,
              customerKey,
            },
          })
          if (usageCount >= coupon.maxUsesPerCustomer) {
            throw new Error(`You have already used this coupon ${coupon.maxUsesPerCustomer} time(s)`)
          }
        }

        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId: customer.userId,
            email: customer.email || "",
            customerKey,
            orderId: createdOrder.id,
          },
        })
      }
    }

    for (const item of lines) {
      if (item.variantId) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (variant) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              orderId: createdOrder.id,
              orderItemId: createdOrder.items.find(oi => oi.variantId === item.variantId)?.id,
              type: "order_reserved",
              quantity: item.quantity,
              beforeStock: variant.stock,
              afterStock: variant.stock,
              beforeReserved: variant.reservedStock - item.quantity,
              afterReserved: variant.reservedStock,
              reason: "Order created",
            },
          })
        }
      }
    }

    return createdOrder
  })

  return { order, reusedExistingOrder }
}
