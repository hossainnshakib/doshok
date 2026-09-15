import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageOfferUpdateSchema } from "@/lib/validations"
import { computeRegularTotal, resolveLandingOffer } from "@/lib/landing-pages/offer-pricing"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id, offerId } = await params
    const offer = await prisma.landingPageOffer.findFirst({
      where: { id: offerId, landingPageId: id },
      include: { items: { select: { landingPageProductId: true, quantity: true } } },
    })
    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = landingPageOfferUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { name, badge, matchType, minQuantity, offerPrice, enabled, items } = parsed.data

    // Final item set after this update (provided or currently stored).
    const finalItems = items ?? offer.items.map((i) => ({ landingPageProductId: i.landingPageProductId, quantity: i.quantity }))
    const finalPrice = offerPrice ?? offer.offerPrice
    const finalMatchType = matchType ?? offer.matchType
    const finalMinQuantity = matchType === "QUANTITY_TIER" ? minQuantity : (matchType !== undefined ? null : offer.minQuantity)

    if (items) {
      const linkIds = items.map((i) => i.landingPageProductId)
      if (new Set(linkIds).size !== linkIds.length) {
        return NextResponse.json({ success: false, error: "Duplicate product in offer items" }, { status: 400 })
      }
      const links = await prisma.landingPageProduct.findMany({
        where: { landingPageId: id, id: { in: linkIds } },
        select: { id: true },
      })
      if (links.length !== linkIds.length) {
        return NextResponse.json({ success: false, error: "One or more products do not belong to this landing page" }, { status: 400 })
      }
    }

    if (items || offerPrice !== undefined) {
      const regularTotal = await computeRegularTotal(id, finalItems)
      if (regularTotal === null) {
        return NextResponse.json({ success: false, error: "A linked product is no longer available" }, { status: 400 })
      }
      if (finalPrice > regularTotal) {
        return NextResponse.json(
          { success: false, error: `Offer price cannot exceed the regular total of ৳${regularTotal.toLocaleString()}` },
          { status: 400 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.landingPageOffer.update({
        where: { id: offerId },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(badge !== undefined ? { badge: badge?.trim() || null } : {}),
          ...(matchType !== undefined ? { matchType: finalMatchType } : {}),
          ...(matchType !== undefined ? { minQuantity: finalMinQuantity } : {}),
          ...(offerPrice !== undefined ? { offerPrice } : {}),
          ...(enabled !== undefined ? { enabled } : {}),
        },
      })
      if (items) {
        await tx.landingPageOfferItem.deleteMany({ where: { offerId } })
        await tx.landingPageOfferItem.createMany({
          data: items.map((i) => ({
            offerId,
            landingPageProductId: i.landingPageProductId,
            quantity: i.quantity,
          })),
        })
      }
    })

    const resolved = await resolveLandingOffer(id, offerId)
    return NextResponse.json({ success: true, data: resolved })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update offer" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id, offerId } = await params
    const offer = await prisma.landingPageOffer.findFirst({
      where: { id: offerId, landingPageId: id },
      select: { id: true },
    })
    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found" }, { status: 404 })
    }

    // Offer items cascade; the landing page and products are untouched.
    await prisma.landingPageOffer.delete({ where: { id: offerId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete offer" }, { status: 500 })
  }
}
