import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageOfferCreateSchema } from "@/lib/validations"
import { computeRegularTotal, resolveLandingOffer, resolveLandingOffers } from "@/lib/landing-pages/offer-pricing"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const page = await prisma.landingPage.findUnique({ where: { id }, select: { id: true } })
    if (!page) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    const offers = await resolveLandingOffers(id)
    return NextResponse.json({ success: true, data: offers })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch offers" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const page = await prisma.landingPage.findUnique({ where: { id }, select: { id: true } })
    if (!page) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = landingPageOfferCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { name, badge, pricingType, matchType, minQuantity, offerPrice, enabled, items } = parsed.data

    const itemIds = items.map((i) => i.landingPageItemId)
    if (new Set(itemIds).size !== itemIds.length) {
      return NextResponse.json({ success: false, error: "Duplicate item in offer items" }, { status: 400 })
    }

    const landingItems = await prisma.landingPageItem.findMany({
      where: { landingPageId: id, id: { in: itemIds } },
      select: { id: true },
    })
    if (landingItems.length !== itemIds.length) {
      return NextResponse.json({ success: false, error: "One or more items do not belong to this landing page" }, { status: 400 })
    }

    const regularTotal = await computeRegularTotal(id, items)
    if (regularTotal === null) {
      return NextResponse.json({ success: false, error: "A linked item is no longer available" }, { status: 400 })
    }
    if (offerPrice > regularTotal) {
      return NextResponse.json(
        { success: false, error: `Offer price cannot exceed the regular total of ৳${regularTotal.toLocaleString()}` },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.landingPageOffer.aggregate({
      where: { landingPageId: id },
      _max: { sortOrder: true },
    })

    const created = await prisma.$transaction(async (tx) => {
      const offer = await tx.landingPageOffer.create({
        data: {
          landingPageId: id,
          name: name.trim(),
          badge: badge?.trim() || null,
          pricingType,
          matchType: matchType ?? "EXACT_COMBINATION",
          minQuantity: matchType === "QUANTITY_TIER" ? minQuantity : null,
          offerPrice,
          enabled,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      })
      await tx.landingPageOfferItem.createMany({
        data: items.map((i) => ({
          offerId: offer.id,
          landingPageItemId: i.landingPageItemId,
          quantity: i.quantity,
        })),
      })
      return offer
    })

    const resolved = await resolveLandingOffer(id, created.id)
    return NextResponse.json({ success: true, data: resolved }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create offer" }, { status: 500 })
  }
}
