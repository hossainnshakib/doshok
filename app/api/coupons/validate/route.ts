import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { couponValidateSchema } from "@/lib/validations"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = couponValidateSchema.safeParse(body)
    if (!parsed.success) return error("Invalid input")

    const { code, subtotal, userId, email } = body

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (!coupon) return error("Coupon not found")
    if (!coupon.active) return error("Coupon is inactive")
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return error("Coupon has expired")
    if (subtotal < coupon.minOrder) return error(`Minimum order amount is ৳${coupon.minOrder.toLocaleString()}`)

    const identityKey = userId ?? email
    if (coupon.maxUsesPerCustomer && identityKey) {
      const usageCount = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          OR: [
            ...(userId ? [{ userId }] : []),
            { email: email ?? "" },
          ],
        },
      })
      if (usageCount >= coupon.maxUsesPerCustomer) {
        return error(`You have already used this coupon ${coupon.maxUsesPerCustomer} time(s)`)
      }
    }

    let discount = 0
    if (coupon.type === "percent") {
      discount = Math.round(subtotal * coupon.discount / 100)
    } else {
      discount = Math.min(coupon.discount, subtotal)
    }

    return success({
      code: coupon.code,
      discount,
      type: coupon.type,
      discountAmount: coupon.discount,
    })
  } catch {
    return error("Failed to validate coupon")
  }
}
