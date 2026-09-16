import { NextRequest } from "next/server"
import { success, error } from "@/lib/api-response"
import { rateLimitByIpFor } from "@/lib/rate-limit"
import { landingCheckoutQuoteSchema } from "@/lib/validations"
import { resolveBestOfferForSelection, resolveLandingItemPrices } from "@/lib/landing-pages/offer-pricing"
import { getDeliveryFeeByDistrict } from "@/lib/delivery"
import { getDistrictById } from "@/lib/bangladesh-address"
import { prisma } from "@/lib/prisma"
import type { DeliveryZone } from "@/types"

// Authoritative delivery/total estimate for the landing checkout UI.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { limited } = rateLimitByIpFor(request, "lp-quote", 30, 60 * 1000)
    if (limited) return error("Too many requests. Please try again later.", 429)

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = landingCheckoutQuoteSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const page = await prisma.landingPage.findUnique({
      where: { id },
      select: { id: true, status: true },
    })
    if (!page || page.status !== "published") {
      return error("Landing page is not available", 404)
    }

    let deliveryFee = 100
    let zone: DeliveryZone = "outside"
    if (parsed.data.districtId) {
      const district = getDistrictById(parsed.data.districtId)
      if (!district) return error("Invalid district selected", 400)
      const calc = await getDeliveryFeeByDistrict(parsed.data.districtId)
      deliveryFee = calc.fee
      zone = calc.zone
    }

    if (!parsed.data.selectedItemIds || parsed.data.selectedItemIds.length === 0) {
      return error("selectedItemIds is required", 400)
    }

    const itemPrices = await resolveLandingItemPrices(id, parsed.data.selectedItemIds)
    if (!itemPrices) {
      return error("Selected items are not available", 409)
    }

    const matchedOffer = await resolveBestOfferForSelection(id, parsed.data.selectedItemIds)
    const offerPrice = matchedOffer?.offerPrice ?? itemPrices.regularTotal
    const savings = Math.max(0, itemPrices.regularTotal - offerPrice)

    return success({
      regularTotal: itemPrices.regularTotal,
      offerPrice,
      savings,
      savingsPercent: itemPrices.regularTotal > 0 ? Math.round((savings * 100) / itemPrices.regularTotal) : 0,
      matchedOfferId: matchedOffer?.offerId ?? null,
      matchedOfferName: matchedOffer?.offerName ?? null,
      deliveryFee,
      zone,
      total: offerPrice + deliveryFee,
    })
  } catch {
    return error("Failed to calculate totals")
  }
}
