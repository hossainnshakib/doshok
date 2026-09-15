import { NextRequest } from "next/server"
import { success, error } from "@/lib/api-response"
import { rateLimitByIpFor } from "@/lib/rate-limit"
import { landingCheckoutQuoteSchema } from "@/lib/validations"
import { resolveLandingOffer, resolveBestOfferForSelection, resolveLandingProductPrices } from "@/lib/landing-pages/offer-pricing"
import { getDeliveryFeeByDistrict } from "@/lib/delivery"
import { getDistrictById } from "@/lib/bangladesh-address"
import { prisma } from "@/lib/prisma"
import type { DeliveryZone } from "@/types"

// Authoritative delivery/total estimate for the landing checkout UI.
// Supports both product-based and offer-based flows.
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

    // Product-based flow
    if (parsed.data.selectedProductIds && parsed.data.selectedProductIds.length > 0) {
      const productPrices = await resolveLandingProductPrices(id, parsed.data.selectedProductIds)
      if (!productPrices) {
        return error("Selected products are not available", 409)
      }

      const matchedOffer = await resolveBestOfferForSelection(id, parsed.data.selectedProductIds)
      const offerPrice = matchedOffer?.offerPrice ?? productPrices.regularTotal
      const savings = Math.max(0, productPrices.regularTotal - offerPrice)

      return success({
        regularTotal: productPrices.regularTotal,
        offerPrice,
        savings,
        savingsPercent: productPrices.regularTotal > 0 ? Math.round((savings * 100) / productPrices.regularTotal) : 0,
        matchedOfferId: matchedOffer?.offerId ?? null,
        matchedOfferName: matchedOffer?.offerName ?? null,
        deliveryFee,
        zone,
        total: offerPrice + deliveryFee,
      })
    }

    // Legacy offer-based flow
    if (!parsed.data.offerId) {
      return error("Either selectedProductIds or offerId is required", 400)
    }

    const resolved = await resolveLandingOffer(id, parsed.data.offerId)
    if (!resolved || !resolved.valid) {
      return error(resolved?.invalidReason ?? "Offer is not available", 409)
    }

    return success({
      offerId: resolved.offerId,
      regularTotal: resolved.regularTotal,
      offerPrice: resolved.offerPrice,
      savings: resolved.savings,
      savingsPercent: resolved.savingsPercent,
      deliveryFee,
      zone,
      total: resolved.offerPrice + deliveryFee,
    })
  } catch {
    return error("Failed to calculate totals")
  }
}
