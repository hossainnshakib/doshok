import { prisma } from "@/lib/prisma"
import type { ResolvedOffer, ResolvedOfferItem } from "./types"

type OfferWithRelations = {
  id: string
  landingPageId: string
  name: string
  badge: string | null
  pricingType: string
  matchType: string
  minQuantity: number | null
  offerPrice: number
  enabled: boolean
  sortOrder: number
  items: {
    quantity: number
    landingPageProductId: string
    landingPageProduct: {
      id: string
      displayTitle: string | null
      displayImage: string | null
      product: {
        id: string
        name: string
        slug: string
        images: string[]
        price: number
        status: string
        variants: { id: string; size: string; color: string; stock: number; reservedStock: number }[]
      } | null
    } | null
  }[]
}

function resolveOne(offer: OfferWithRelations): ResolvedOffer {
  const items: ResolvedOfferItem[] = []
  let invalidReason: string | null = null
  let hasInactive = false

  for (const item of offer.items) {
    const link = item.landingPageProduct
    const product = link?.product
    // Orphan rows are skipped (FK + cascade hygiene); inactive products are
    // kept visible so the offer is marked unavailable instead of silently
    // shrinking to a misleading smaller bundle at the same price.
    if (!link || !product) continue
    if (product.status !== "Active") hasInactive = true
    // overridePrice is deliberately ignored: checkout can only honor the
    // real Product price, so regular totals must derive from it.
    const unitPrice = product.price
    const available = product.variants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reservedStock), 0)
    items.push({
      landingPageProductId: link.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      displayName: link.displayTitle?.trim() || product.name,
      image: link.displayImage || product.images[0] || null,
      quantity: item.quantity,
      unitPrice,
      lineRegularTotal: unitPrice * item.quantity,
      available,
      requiresVariant: product.variants.length > 0,
      variants: product.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        available: Math.max(0, v.stock - v.reservedStock),
      })),
    })
  }

  const regularTotal = items.reduce((sum, i) => sum + i.lineRegularTotal, 0)
  const savings = Math.max(0, regularTotal - offer.offerPrice)
  const savingsPercent = regularTotal > 0 ? Math.round((savings * 100) / regularTotal) : 0

  if (!offer.enabled) {
    invalidReason = "Offer is disabled"
  } else if (hasInactive) {
    invalidReason = "Contains a product that is no longer available"
  } else if (items.length === 0) {
    invalidReason = "Offer has no items"
  } else {
    const bad = items.find((i) => i.quantity > i.available)
    // Aggregate stock is an upper bound: exceeding it can never be fulfilled.
    // Variant-mix exactness is validated at Batch 4 checkout.
    if (bad) invalidReason = `Only ${bad.available} available for ${bad.displayName}`
  }

  // Non-Active products invalidate the offer (see above) instead of being
  // silently dropped, so a bundle can never shrink without its price changing.
  return {
    offerId: offer.id,
    landingPageId: offer.landingPageId,
    offerName: offer.name,
    badge: offer.badge,
    pricingType: offer.pricingType === "FIXED" ? "FIXED" : "FIXED",
    matchType: offer.matchType === "QUANTITY_TIER" ? "QUANTITY_TIER" : "EXACT_COMBINATION",
    minQuantity: offer.minQuantity ?? null,
    enabled: offer.enabled,
    sortOrder: offer.sortOrder,
    items,
    regularTotal,
    offerPrice: offer.offerPrice,
    savings,
    savingsPercent,
    valid: invalidReason === null,
    invalidReason,
  }
}

const OFFER_INCLUDE = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      landingPageProduct: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              price: true,
              status: true,
              variants: { select: { id: true, size: true, color: true, stock: true, reservedStock: true } },
            },
          },
        },
      },
    },
  },
}

/**
 * Server-authoritative offer resolution for Batch 4 checkout.
 * Never trusts client prices: regular totals always derive from live
 * Product.price. Returns null when the offer doesn't belong to the page.
 */
export async function resolveLandingOffer(
  landingPageId: string,
  offerId: string
): Promise<ResolvedOffer | null> {
  const offer = await prisma.landingPageOffer.findFirst({
    where: { id: offerId, landingPageId },
    include: OFFER_INCLUDE,
  })
  if (!offer) return null
  return resolveOne(offer as unknown as OfferWithRelations)
}

/** All offers of a page in sortOrder, each server-priced. */
export async function resolveLandingOffers(landingPageId: string): Promise<ResolvedOffer[]> {
  const offers = await prisma.landingPageOffer.findMany({
    where: { landingPageId },
    orderBy: { sortOrder: "asc" },
    include: OFFER_INCLUDE,
  })
  return offers.map((o) => resolveOne(o as unknown as OfferWithRelations))
}

/**
 * Live regular total for a set of {landingPageProductId, quantity} pairs.
 * Used by offer write endpoints to validate offerPrice against current
 * real prices. Returns null when any link is missing/inactive.
 */
export async function computeRegularTotal(
  landingPageId: string,
  items: { landingPageProductId: string; quantity: number }[]
): Promise<number | null> {
  if (items.length === 0) return null
  const links = await prisma.landingPageProduct.findMany({
    where: { landingPageId, id: { in: items.map((i) => i.landingPageProductId) } },
    select: { id: true, product: { select: { price: true, status: true } } },
  })
  if (links.length !== items.length) return null
  let total = 0
  for (const item of items) {
    const link = links.find((l) => l.id === item.landingPageProductId)
    if (!link?.product || link.product.status !== "Active") return null
    total += link.product.price * item.quantity
  }
  return total
}

/**
 * Resolve live prices for a set of selected landing page product IDs.
 * Returns the regular total and per-item details for product-based checkout.
 */
export async function resolveLandingProductPrices(
  landingPageId: string,
  selectedLandingPageProductIds: string[]
): Promise<{ regularTotal: number; items: { landingPageProductId: string; productId: string; price: number }[] } | null> {
  if (selectedLandingPageProductIds.length === 0) return null
  const links = await prisma.landingPageProduct.findMany({
    where: { landingPageId, id: { in: selectedLandingPageProductIds } },
    select: {
      id: true,
      product: { select: { id: true, price: true, status: true } },
    },
  })
  if (links.length !== selectedLandingPageProductIds.length) return null
  let regularTotal = 0
  const items: { landingPageProductId: string; productId: string; price: number }[] = []
  for (const link of links) {
    if (!link.product || link.product.status !== "Active") return null
    regularTotal += link.product.price
    items.push({ landingPageProductId: link.id, productId: link.product.id, price: link.product.price })
  }
  return { regularTotal, items }
}

/**
 * Automatic offer resolution for product-based selection.
 * Given a set of selected landing page product IDs, finds the best (lowest price)
 * valid offer that matches the selection. Returns null if no offer applies.
 *
 * EXACT_COMBINATION: offer items must exactly match the selection (same products, same quantities).
 * QUANTITY_TIER: selected products must be eligible and total quantity >= minQuantity.
 */
export async function resolveBestOfferForSelection(
  landingPageId: string,
  selectedLandingPageProductIds: string[]
): Promise<ResolvedOffer | null> {
  if (selectedLandingPageProductIds.length === 0) return null

  const offers = await resolveLandingOffers(landingPageId)
  const eligible: ResolvedOffer[] = []

  for (const offer of offers) {
    if (!offer.valid) continue

    if (offer.matchType === "QUANTITY_TIER") {
      // QUANTITY_TIER: all selected products must be in the offer's eligible items,
      // and total quantity must meet minQuantity.
      const eligibleProductIds = new Set(offer.items.map((i) => i.landingPageProductId))
      const allEligible = selectedLandingPageProductIds.every((id) => eligibleProductIds.has(id))
      if (!allEligible) continue
      if (offer.minQuantity && selectedLandingPageProductIds.length < offer.minQuantity) continue
      eligible.push(offer)
    } else {
      // EXACT_COMBINATION: offer items must exactly match the selection.
      // Build expected product list from offer items.
      const expected: string[] = []
      for (const item of offer.items) {
        for (let i = 0; i < item.quantity; i++) {
          expected.push(item.landingPageProductId)
        }
      }
      const sortedExpected = [...expected].sort()
      const sortedSelected = [...selectedLandingPageProductIds].sort()
      if (JSON.stringify(sortedExpected) !== JSON.stringify(sortedSelected)) continue
      eligible.push(offer)
    }
  }

  // Return the valid offer with the lowest price (best deal for customer).
  if (eligible.length === 0) return null
  eligible.sort((a, b) => a.offerPrice - b.offerPrice)
  return eligible[0]
}
