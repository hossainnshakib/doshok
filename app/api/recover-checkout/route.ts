import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { recoveryTokenSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")
    const parsed = recoveryTokenSchema.safeParse({ token })
    if (!parsed.success) return error("Invalid or missing token")

    const record = await prisma.recoveryCheckoutToken.findUnique({
      where: { token: parsed.data.token },
      include: { abandonedCheckout: true },
    })

    if (!record) return error("Recovery link not found", 404)

    if (record.usedAt) return error("This recovery link has already been used")

    if (new Date() > record.expiresAt) return error("This recovery link has expired")

    const checkout = record.abandonedCheckout

    return success({
      id: checkout.id,
      name: checkout.name,
      email: checkout.email,
      phone: checkout.phone,
      address: checkout.address,
      productId: checkout.productId,
      variantId: checkout.variantId,
      quantity: checkout.quantity,
      size: checkout.size,
      color: checkout.color,
      deliveryZone: checkout.deliveryZone,
      step: checkout.step,
      couponCode: checkout.couponCode,
      subtotal: checkout.subtotal,
      discount: checkout.discount,
      total: checkout.total,
      landingSlug: checkout.landingSlug,
      source: checkout.source,
      createdAt: checkout.createdAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
    })
  } catch {
    return error("Failed to validate recovery link")
  }
}
