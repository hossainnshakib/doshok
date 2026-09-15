import { prisma } from "@/lib/prisma"
import type { ResolvedOffer, ResolvedOfferItem } from "./types"

type OfferWithRelations = {
  id: string
  landingPageId: string
  name: string
  badge: string | null
  pricingType: string
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
