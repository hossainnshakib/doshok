import { NextRequest } from "next/server"
import { success, error } from "@/lib/api-response"
import { rateLimitByIpFor } from "@/lib/rate-limit"
import { landingCheckoutSchema } from "@/lib/validations"
import { createLandingPageOrder, LandingCheckoutError } from "@/lib/landing-pages/landing-checkout"
import { sendAdminNewOrderEmail, sendOrderConfirmationEmail } from "@/lib/mailer"
import { generateSuccessToken } from "@/lib/checkout/success-token"
import { prisma } from "@/lib/prisma"

// Public landing-page checkout. No admin auth; the page must be published.
// Supports both product-based (new) and offer-based (legacy) flows.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Own budget, separate from storefront checkout and quote traffic.
    const { limited } = rateLimitByIpFor(request, "lp-checkout", 10, 60 * 1000)
    if (limited) return error("Too many requests. Please try again later.", 429)

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = landingCheckoutSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    let result
    try {
      result = await createLandingPageOrder({
        landingPageId: id,
        selectedItemIds: parsed.data.selectedItemIds,
        itemSelections: parsed.data.itemSelections,
        customer: {
          name: parsed.data.customer.name,
          email: parsed.data.customer.email || undefined,
          phone: parsed.data.customer.phone,
        },
        address: {
          divisionId: parsed.data.address.divisionId,
          districtId: parsed.data.address.districtId,
          districtName: parsed.data.address.districtName,
          upazilaName: parsed.data.address.upazilaName,
          areaName: parsed.data.address.areaName || undefined,
          fullAddress: parsed.data.address.fullAddress,
        },
        note: parsed.data.note || undefined,
        paymentMethod: parsed.data.paymentMethod,
        idempotencyKey: parsed.data.idempotencyKey,
        checkoutVerificationToken: parsed.data.checkoutVerificationToken,
        priceFingerprint: parsed.data.priceFingerprint,
      })
    } catch (err) {
      if (err instanceof LandingCheckoutError) {
        return error(err.message, err.status)
      }
      throw err
    }

    // Same post-order notifications as normal checkout (fire-and-forget).
    const created = await prisma.order.findUnique({
      where: { orderNumber: result.orderNumber },
      include: { items: true },
    })
    if (created) {
      sendOrderConfirmationEmail({
        userId: created.userId,
        orderNumber: created.orderNumber,
        customerName: created.customerName,
        customerEmail: created.customerEmail,
        customerPhone: created.customerPhone,
        total: created.total,
        subtotal: created.subtotal,
        deliveryFee: created.deliveryFee,
        paymentMethod: created.paymentMethod,
        orderStatus: created.orderStatus,
        items: created.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        })),
      }).catch(() => {})

      sendAdminNewOrderEmail({
        orderNumber: created.orderNumber,
        customerName: created.customerName,
        customerEmail: created.customerEmail,
        customerPhone: created.customerPhone,
        total: created.total,
        subtotal: created.subtotal,
        deliveryFee: created.deliveryFee,
        paymentMethod: created.paymentMethod,
        orderStatus: created.orderStatus,
        items: created.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        })),
      }).catch(() => {})
    }

    const successToken = generateSuccessToken(result.orderNumber)

    return success(
      {
        orderNumber: result.orderNumber,
        total: result.total,
        subtotal: result.subtotal,
        discount: result.discount,
        deliveryFee: result.deliveryFee,
        itemCount: result.itemCount,
        successToken,
      },
      result.reusedExistingOrder ? 200 : 201
    )
  } catch {
    return error("Failed to place order. Please try again.")
  }
}
