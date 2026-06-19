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
  getUpazilaById,
} from "@/lib/bangladesh-address"
import { getPhoneServerValue } from "@/lib/utils"
import { applyScopedCoupon } from "@/lib/checkout/coupon-engine.service"
import { isCheckoutVerificationTokenValid } from "@/lib/checkout/otp.service"
import { generateSuccessToken } from "@/lib/checkout/success-token"
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

    const district = getDistrictById(customer.districtId)
    if (!district) return error("Invalid district selected")
    if (district.divisionId !== customer.divisionId) {
      return error("District does not belong to the selected division")
    }

    const upazila = getUpazilaById(customer.upazilaId)
    if (!upazila) return error("Invalid upazila/thana selected")
    if (upazila.districtId !== customer.districtId) {
      return error("Upazila/thana does not belong to the selected district")
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

    const { zone: deliveryZone, fee: deliveryFee } = await getDeliveryFeeByDistrict(customer.districtId)
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
        landingPageSetting: {
          select: {
            paymentOverrideEnabled: true,
            paymentRuleOverride: true,
            paymentRuleValueOverride: true,
          },
        },
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
        return { ...item, product, variant: null, price: product.price }
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

      const result = applyScopedCoupon({
        coupon,
        productSubtotal: subtotal,
        deliveryFee,
        couponCode: coupon.code,
      })

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
        return error("Cash on Delivery is currently disabled. Please select another payment method.")
      }
    }

    let otpVerified = false
    let otpVerifiedAtValue: Date | null = null

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

    let resolvedIdempotencyKey: string | null = null

    if (isV2) {
      resolvedIdempotencyKey = idempotencyKey ?? request.headers.get("X-Checkout-Session-Id") ?? null
      if (!resolvedIdempotencyKey) {
        resolvedIdempotencyKey = crypto.randomUUID()
        console.warn(`[checkout] No idempotencyKey provided. Generated server-side: ${resolvedIdempotencyKey}`)
      }

      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey: resolvedIdempotencyKey },
        include: { items: true, address: true },
      })
      if (existingOrder) {
        return success({ order: existingOrder, paymentInitData: null }, 200)
      }
    }

    let reservationExpiresAt: Date | null = null

    if (isV2) {
      reservationExpiresAt = new Date(Date.now() + codReservationHours * 60 * 60 * 1000)
    }

    const order = await prisma.$transaction(async (tx) => {
      if (isV2 && otpRequired) {
        const result = await tx.phoneOtpVerification.updateMany({
          where: {
            checkoutToken: checkoutVerificationToken,
            checkoutTokenUsedAt: null,
            checkoutTokenExpiresAt: { gt: new Date() },
            phone: customerPhone,
          },
          data: {
            checkoutTokenUsedAt: new Date(),
          },
        })

        if (result.count !== 1) {
          const record = await tx.phoneOtpVerification.findUnique({
            where: { checkoutToken: checkoutVerificationToken },
          })
          if (!record) throw new Error("Invalid verification token.")
          if (record.phone !== customerPhone) throw new Error("Verification token does not match the provided phone number.")
          if (!record.checkoutTokenExpiresAt || new Date() > record.checkoutTokenExpiresAt) {
            throw new Error("Verification token has expired.")
          }
          throw new Error("Verification token has already been used.")
        }

        otpVerified = true
        otpVerifiedAtValue = new Date()
      }

      for (const item of validatedItems) {
        if (item.variant) {
          const result = await tx.$executeRaw`
            UPDATE "ProductVariant"
            SET "reservedStock" = "reservedStock" + ${item.quantity}
            WHERE id = ${item.variant.id}
              AND "productId" = ${item.product.id}
              AND ("stock" - "reservedStock") >= ${item.quantity}
          `
          if (result === 0) {
            const variant = await tx.productVariant.findUnique({ where: { id: item.variant.id } })
            const availableStock = variant ? Math.max(0, variant.stock - variant.reservedStock) : 0
            throw new Error(
              `Insufficient stock for "${item.product.name}". Available: ${availableStock}, requested: ${item.quantity}`
            )
          }
        }
      }

      if (couponCode && discount > 0) {
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
          userId,
          customerName: customer.name,
          customerEmail: customer.email || "",
          customerPhone: customerPhone,
          subtotal,
          deliveryFee,
          discount,
          total,
          paidAmount: 0,
          paymentMethod: normalizedPaymentMethod,
          paymentStatus: "pending",
          orderStatus: "pending",
          couponCode: couponCode || null,
          couponType: couponScope,
          productSubtotal: subtotal,
          productDiscount,
          deliveryDiscount,
          discountedProductTotal,
          finalDeliveryFee: finalDeliveryFeeCalc,
          payNow: paymentResult.payNow,
          dueAmount: paymentResult.dueAmount,
          paymentRule: paymentResult.paymentRule,
          paymentRuleValue: paymentResult.paymentRuleValue,
          paymentRuleSource: paymentResult.source,
          notes: notes || null,
          idempotencyKey: resolvedIdempotencyKey,
          reservationExpiresAt,
          otpVerified,
          otpVerifiedAt: otpVerifiedAtValue,
          ...(isV2 && paymentResult.payNow > 0 ? { paymentExpiresAt: reservationExpiresAt } : {}),
          address: {
            create: {
              division: customer.divisionName,
              district: customer.districtName,
              thana: customer.upazilaName,
              fullAddress: customer.fullAddress,
              phone: customerPhone,
            },
          },
          items: {
            create: validatedItems.map((item) => {
              return {
                productId: item.product.id,
                variantId: item.variant?.id ?? null,
                name: item.product.name,
                size: item.variant?.size ?? null,
                color: item.variant?.color ?? null,
                quantity: item.quantity,
                price: item.price,
              }
            }),
          },
        },
        include: { items: true, address: true },
      })

if (couponCode && discount > 0) {
          const coupon = await tx.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
          if (coupon) {
            const customerKey = userId ?? customer.email ?? ""
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
                userId,
                email: customer.email || "",
                customerKey,
                orderId: createdOrder.id,
              },
            })
          }
        }

        for (const item of validatedItems) {
          if (item.variant) {
            const variant = await tx.productVariant.findUnique({ where: { id: item.variant.id } })
            if (variant) {
              await tx.stockMovement.create({
                data: {
                  productId: item.product.id,
                  variantId: item.variant.id,
                  orderId: createdOrder.id,
                  orderItemId: createdOrder.items.find(oi => oi.variantId === item.variant?.id)?.id,
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

    const paymentInitData: { paymentId?: string; paymentUrl?: string } | null = null

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
