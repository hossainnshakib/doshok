import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageProductUpdateSchema } from "@/lib/validations"

// Update landing-specific presentation fields of a linked product.
// Never touches the real Product row.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productLinkId: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id, productLinkId } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = landingPageProductUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const link = await prisma.landingPageProduct.findFirst({
      where: { id: productLinkId, landingPageId: id },
    })
    if (!link) {
      return NextResponse.json({ success: false, error: "Linked product not found" }, { status: 404 })
    }

    const { displayTitle, displayDescription, displayImage, ctaLabel, sortOrder } = parsed.data
    const updateData: Record<string, unknown> = {}
    if (displayTitle !== undefined) updateData.displayTitle = displayTitle || null
    if (displayDescription !== undefined) updateData.displayDescription = displayDescription || null
    if (displayImage !== undefined) updateData.displayImage = displayImage || null
    if (ctaLabel !== undefined) updateData.ctaLabel = ctaLabel || null
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const updated = await prisma.landingPageProduct.update({
      where: { id: productLinkId },
      data: updateData,
      include: { product: { select: { id: true, name: true, slug: true, images: true, price: true, oldPrice: true, status: true } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update linked product" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productLinkId: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id, productLinkId } = await params

    const link = await prisma.landingPageProduct.findFirst({
      where: { id: productLinkId, landingPageId: id },
    })
    if (!link) {
      return NextResponse.json({ success: false, error: "Linked product not found" }, { status: 404 })
    }

    // Reject while referenced by an offer instead of silently corrupting it.
    // (DB cascades still protect page/product deletes; this guard is the
    // safe UX for deliberate link removal.)
    const referencingOffers = await prisma.landingPageOfferItem.count({
      where: { landingPageProductId: productLinkId },
    })
    if (referencingOffers > 0) {
      return NextResponse.json(
        { success: false, error: "This product is part of one or more landing offers. Remove it from the offers first." },
        { status: 409 }
      )
    }

    await prisma.landingPageProduct.delete({ where: { id: productLinkId } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to remove product" }, { status: 500 })
  }
}
