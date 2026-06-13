import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { generateOrderNumber } from "@/lib/order-number"
import { getDeliveryFeeByDistrict } from "@/lib/delivery"
import { checkoutSchema } from "@/lib/validations"
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "@/lib/mailer"
import { isBkashEnabled, createBkashPayment } from "@/lib/payment/bkash"
import {
  getDivisionById,
  getDistrictById,
  getUpazilaById,
} from "@/lib/bangladesh-address"
import { getPhoneServerValue } from "@/lib/utils"
import { applyScopedCoupon } from "@/lib/checkout/coupon-engine.service"
import { resolvePaymentRule } from "@/lib/checkout/payment-rule.service"
import { isCheckoutVerificationTokenValid } from "@/lib/checkout/otp.service"
import crypto from "crypto"

const ONLINE_PROVIDERS = ["bkash", "nagad", "rocket", "upay", "sslcommerz", "aamarpay"]
const PAYMENT_EXPIRY_HOURS = 2

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const { items, paymentMethod, couponCode, notes, checkoutVerificationToken, idempotencyKey, ...customer } = parsed.data

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
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
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
    const productPriceMap = new Map(products.map((p) => [p.id, p.price]))

    const variantIds = items.map((i) => i.variantId).filter(Boolean) as string[]
    const variants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
        })
      : []
    const variantMap = new Map(variants.map((v) => [v.id, v]))

    const validatedItems = items.map((item) => {
      const dbPrice = productPriceMap.get(item.productId)
      if (!dbPrice) throw new Error(`Product not found: ${item.productId}`)
      return { ...item, price: dbPrice }
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

      if (coupon.maxUsesPerCustomer) {
        const customerUsageCount = await prisma.couponUsage.count({
          where: {
            couponId: coupon.id,
            OR: [
              ...(userId ? [{ userId }] : []),
              { email: customer.email },
            ],
          },
        })
        if (customerUsageCount >= coupon.maxUsesPerCustomer) {
          return error(`You have already used this coupon ${coupon.maxUsesPerCustomer} time(s)`)
        }
      }

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

    const landingProduct = products.find(p => p.landingPageSetting?.paymentOverrideEnabled)
    const overrideProduct = products.find(p => p.paymentRuleOverride)

    const paymentResult = resolvePaymentRule({
      grandTotal: total,
      finalDeliveryFee: finalDeliveryFeeCalc,
      discountedProductTotal,
      landingOverride: landingProduct
        ? {
            enabled: true,
            rule: landingProduct.landingPageSetting!.paymentRuleOverride,
            value: landingProduct.landingPageSetting!.paymentRuleValueOverride,
          }
        : null,
      productOverride: overrideProduct
        ? {
            rule: overrideProduct.paymentRuleOverride,
            value: overrideProduct.paymentRuleValueOverride,
          }
        : null,
      globalDefault: {
        rule: checkoutSetting?.defaultPaymentRule ?? "cod_only",
        value: checkoutSetting?.defaultPaymentRuleValue ?? null,
      },
    })

    const isV2 = checkoutSetting?.checkoutV2Enabled ?? false
    const otpRequired = checkoutSetting?.otpRequired ?? true
    const onlineReservationHours = checkoutSetting?.onlineReservationHours ?? 2
    const codReservationHours = checkoutSetting?.codReservationHours ?? 24

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
      const hours = paymentResult.payNow > 0 ? onlineReservationHours : codReservationHours
      reservationExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
    }

    const order = await prisma.$transaction(async (tx) => {
      if (isV2 && otpRequired) {
        const record = await tx.phoneOtpVerification.findUnique({
          where: { checkoutToken: checkoutVerificationToken },
        })
        if (!record) throw new Error("Invalid verification token.")
        if (record.phone !== customerPhone) throw new Error("Verification token does not match the provided phone number.")
        if (!record.checkoutTokenExpiresAt || new Date() > record.checkoutTokenExpiresAt) {
          throw new Error("Verification token has expired.")
        }
        if (record.checkoutTokenUsedAt) throw new Error("Verification token has already been used.")

        await tx.phoneOtpVerification.update({
          where: { id: record.id },
          data: { checkoutTokenUsedAt: new Date() },
        })
        otpVerified = true
        otpVerifiedAtValue = new Date()
      }

      for (const item of validatedItems) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
          if (!variant) throw new Error(`Variant not found: ${item.variantId}`)
          const availableStock = Math.max(0, variant.stock - variant.reservedStock)
          if (availableStock < item.quantity) {
            throw new Error(
              `Insufficient stock for "${productMap.get(item.productId)?.name || "Product"}". Available: ${availableStock}, requested: ${item.quantity}`
            )
          }
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { reservedStock: { increment: item.quantity } },
          })
        }
      }

      if (couponCode && discount > 0) {
        await tx.coupon.update({
          where: { code: couponCode.toUpperCase() },
          data: { usedCount: { increment: 1 } },
        })
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
          paymentMethod,
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
              const variant = item.variantId ? variantMap.get(item.variantId) : undefined
              return {
                productId: item.productId,
                variantId: item.variantId,
                name: productMap.get(item.productId)?.name ?? "",
                size: variant?.size ?? null,
                color: variant?.color ?? null,
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
            await tx.couponUsage.create({
              data: {
                couponId: coupon.id,
                userId,
                email: customer.email || "",
                orderId: createdOrder.id,
              },
            })
          }
        }

        for (const item of validatedItems) {
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

    let paymentInitData: { paymentId?: string; paymentUrl?: string } | null = null

    const isOnlinePayment = ONLINE_PROVIDERS.includes(paymentMethod.toLowerCase())
    const shouldInitBkash = isV2
      ? (paymentResult.payNow > 0 && isOnlinePayment && paymentMethod.toLowerCase() === "bkash")
      : (isOnlinePayment && paymentMethod.toLowerCase() === "bkash")

    if (shouldInitBkash) {
      const bkashEnabled = await isBkashEnabled()
      if (bkashEnabled) {
        const callbackBase = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const paymentAmount = isV2 ? paymentResult.payNow : order.total
        const bkashResult = await createBkashPayment(order.id, order.orderNumber, paymentAmount, callbackBase)

        if (!("error" in bkashResult)) {
          const mode = await prisma.paymentMethodSetting.findUnique({ where: { provider: "BKASH" } })
          const baseUrl = mode?.mode === "LIVE"
            ? "https://checkout.pay.bka.sh/v1.2.0-beta"
            : "https://tokenized.sandbox.bka.sh/v1.2.0-beta"

          if (!isV2) {
            const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000)
            await prisma.order.update({
              where: { id: order.id },
              data: { paymentExpiresAt: expiresAt },
            })
          }

          if (bkashResult.paymentExecuteStatus === "success" && bkashResult.trxId) {
            paymentInitData = { paymentId: bkashResult.trxId }
          } else if (bkashResult.paymentId) {
            paymentInitData = {
              paymentId: bkashResult.paymentId,
              paymentUrl: `${baseUrl}/tokenized/checkout/pay/${bkashResult.paymentId}`,
            }
          }
        }
      }
    }

    sendOrderConfirmationEmail({
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

    return success({ order, paymentInitData }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order"
    return error(message)
  }
}