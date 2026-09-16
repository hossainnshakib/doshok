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
    landingPageItemId: string
    landingPageItem: {
      id: string
      name: string
      description: string | null
      price: number
      images: string[]
      active: boolean
      stock: number
      reservedStock: number
      variants: {
        id: string
        size: string | null
        color: string | null
        colorHex: string | null
        stock: number
        reservedStock: number
        active: boolean
      }[]
    } | null
  }[]
}

function resolveOne(offer: OfferWithRelations): ResolvedOffer {
  const items: ResolvedOfferItem[] = []
  let invalidReason: string | null = null
  let hasInactive = false

  for (const item of offer.items) {
    const link = item.landingPageItem
    if (!link) continue
    if (!link.active) hasInactive = true
    const unitPrice = link.price
    const activeVariants = link.variants.filter((v) => v.active)
    const available =
      activeVariants.length > 0
        ? activeVariants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reservedStock), 0)
        : Math.max(0, link.stock - link.reservedStock)
    items.push({
      landingPageItemId: link.id,
      itemName: link.name,
      displayName: link.name,
      image: link.images[0] || null,
      quantity: item.quantity,
      unitPrice,
      lineRegularTotal: unitPrice * item.quantity,
      available,
      requiresVariant: activeVariants.length > 0,
      variants: activeVariants.map((v) => ({
        variantId: v.id,
        size: v.size ?? "",
        color: v.color ?? "",
        colorHex: v.colorHex ?? undefined,
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
    invalidReason = "Contains an item that is no longer available"
  } else if (items.length === 0) {
    invalidReason = "Offer has no items"
  } else {
    const bad = items.find((i) => i.quantity > i.available)
    if (bad) invalidReason = `Only ${bad.available} available for ${bad.displayName}`
  }

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
      landingPageItem: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          active: true,
          stock: true,
          reservedStock: true,
          variants: {
            where: { active: true },
            orderBy: { sortOrder: "asc" as const },
            select: {
              id: true,
              size: true,
              color: true,
              colorHex: true,
              stock: true,
              reservedStock: true,
              active: true,
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
 * LandingPageItem.price. Returns null when the offer doesn't belong to the page.
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
 * Live regular total for a set of {landingPageItemId, quantity} pairs.
 * Used by offer write endpoints to validate offerPrice against current
 * real prices. Returns null when any item is missing/inactive.
 */
export async function computeRegularTotal(
  landingPageId: string,
  items: { landingPageItemId: string; quantity: number }[]
): Promise<number | null> {
  if (items.length === 0) return null
  const itemIds = items.map((i) => i.landingPageItemId)
  const landingItems = await prisma.landingPageItem.findMany({
    where: { id: { in: itemIds }, landingPageId },
    select: { id: true, price: true, active: true },
  })
  if (landingItems.length !== items.length) return null
  let total = 0
  for (const item of items) {
    const li = landingItems.find((l) => l.id === item.landingPageItemId)
    if (!li || !li.active) return null
    total += li.price * item.quantity
  }
  return total
}

/**
 * Resolve live prices for a set of selected landing page item IDs.
 * Returns the regular total and per-item details for product-based checkout.
 */
export async function resolveLandingItemPrices(
  landingPageId: string,
  selectedLandingPageItemIds: string[]
): Promise<{ regularTotal: number; items: { landingPageItemId: string; price: number }[] } | null> {
  if (selectedLandingPageItemIds.length === 0) return null
  const landingItems = await prisma.landingPageItem.findMany({
    where: { id: { in: selectedLandingPageItemIds }, landingPageId },
    select: { id: true, price: true, active: true },
  })
  if (landingItems.length !== selectedLandingPageItemIds.length) return null
  let regularTotal = 0
  const items: { landingPageItemId: string; price: number }[] = []
  for (const li of landingItems) {
    if (!li.active) return null
    regularTotal += li.price
    items.push({ landingPageItemId: li.id, price: li.price })
  }
  return { regularTotal, items }
}

/**
 * Automatic offer resolution for product-based selection.
 * Given a set of selected landing page item IDs, finds the best (lowest price)
 * valid offer that matches the selection. Returns null if no offer applies.
 *
 * EXACT_COMBINATION: offer items must exactly match the selection (same items, same quantities).
 * QUANTITY_TIER: selected items must be eligible and total quantity >= minQuantity.
 */
export async function resolveBestOfferForSelection(
  landingPageId: string,
  selectedLandingPageItemIds: string[]
): Promise<ResolvedOffer | null> {
  if (selectedLandingPageItemIds.length === 0) return null

  const offers = await resolveLandingOffers(landingPageId)
  const eligible: ResolvedOffer[] = []

  for (const offer of offers) {
    if (!offer.valid) continue

    if (offer.matchType === "QUANTITY_TIER") {
      const eligibleItemIds = new Set(offer.items.map((i) => i.landingPageItemId))
      const allEligible = selectedLandingPageItemIds.every((id) => eligibleItemIds.has(id))
      if (!allEligible) continue
      if (offer.minQuantity && selectedLandingPageItemIds.length < offer.minQuantity) continue
      eligible.push(offer)
    } else {
      const expected: string[] = []
      for (const item of offer.items) {
        for (let i = 0; i < item.quantity; i++) {
          expected.push(item.landingPageItemId)
        }
      }
      const sortedExpected = [...expected].sort()
      const sortedSelected = [...selectedLandingPageItemIds].sort()
      if (JSON.stringify(sortedExpected) !== JSON.stringify(sortedSelected)) continue
      eligible.push(offer)
    }
  }

  if (eligible.length === 0) return null
  eligible.sort((a, b) => a.offerPrice - b.offerPrice)
  return eligible[0]
}
