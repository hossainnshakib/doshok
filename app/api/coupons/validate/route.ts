import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { couponValidateSchema } from "@/lib/validations"
import { auth } from "@/lib/auth"
import { applyScopedCoupon } from "@/lib/checkout/coupon-engine.service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = couponValidateSchema.safeParse(body)
    if (!parsed.success) return error("Invalid input")

    const { code, subtotal, deliveryFee = 0, userId, email } = parsed.data

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (!coupon) return error("Coupon not found")
    if (!coupon.active) return error("Coupon is inactive")
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return error("Coupon has expired")
    if (subtotal < coupon.minOrder) return error(`Minimum order amount is ৳${coupon.minOrder.toLocaleString()}`)
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return error("This coupon has reached its maximum usage limit")
    }

    const identityKey = userId ?? email
    if (coupon.maxUsesPerCustomer && identityKey) {
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

    return success({
      code: coupon.code,
      discount: result.totalDiscount,
      type: coupon.type,
      discountAmount: coupon.discount,
      couponScope: result.couponScope,
      productDiscount: result.productDiscount,
      deliveryDiscount: result.deliveryDiscount,
      discountedProductTotal: result.discountedProductTotal,
      finalDeliveryFee: result.finalDeliveryFee,
      grandTotal: result.grandTotal,
    })
  } catch {
    return error("Failed to validate coupon")
  }
}
