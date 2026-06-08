import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { couponValidateSchema } from "@/lib/validations"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = couponValidateSchema.safeParse(body)
    if (!parsed.success) return error("Invalid input")

    const { code, subtotal } = parsed.data

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (!coupon) return error("Coupon not found")
    if (!coupon.active) return error("Coupon is inactive")
    if (coupon.usedCount >= (coupon.maxUses ?? Infinity)) return error("Coupon usage limit reached")
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return error("Coupon has expired")
    if (subtotal < coupon.minOrder) return error(`Minimum order amount is ৳${coupon.minOrder.toLocaleString()}`)

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
