import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageItemUpdateSchema } from "@/lib/validations"

// PATCH - Update a landing page item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productLinkId: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id, productLinkId } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = landingPageItemUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const item = await prisma.landingPageItem.findFirst({
      where: { id: productLinkId, landingPageId: id },
    })
    if (!item) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const d = parsed.data
    if (d.name !== undefined) updateData.name = d.name
    if (d.description !== undefined) updateData.description = d.description || null
    if (d.shortDescription !== undefined) updateData.shortDescription = d.shortDescription || null
    if (d.price !== undefined) updateData.price = d.price
    if (d.compareAtPrice !== undefined) updateData.compareAtPrice = d.compareAtPrice || null
    if (d.images !== undefined) updateData.images = d.images
    if (d.sku !== undefined) updateData.sku = d.sku || null
    if (d.sortOrder !== undefined) updateData.sortOrder = d.sortOrder
    if (d.isPrimary !== undefined) updateData.isPrimary = d.isPrimary
    if (d.ctaLabel !== undefined) updateData.ctaLabel = d.ctaLabel || null
    if (d.stock !== undefined) updateData.stock = d.stock

    // If isPrimary is being set to true, unset other primaries
    if (d.isPrimary === true) {
      await prisma.landingPageItem.updateMany({
        where: { landingPageId: id, isPrimary: true, id: { not: productLinkId } },
        data: { isPrimary: false },
      })
    }

    const updated = await prisma.landingPageItem.update({
      where: { id: productLinkId },
      data: updateData,
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update item" }, { status: 500 })
  }
}

// DELETE - Remove a landing page item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productLinkId: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id, productLinkId } = await params

    const item = await prisma.landingPageItem.findFirst({
      where: { id: productLinkId, landingPageId: id },
    })
    if (!item) {
      return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 })
    }

    // Reject if referenced by orders
    const orderCount = await prisma.orderItem.count({
      where: { landingPageItemId: productLinkId },
    })
    if (orderCount > 0) {
      return NextResponse.json(
        { success: false, error: "This item has associated orders and cannot be deleted." },
        { status: 409 }
      )
    }

    // Reject if referenced by offers (items cascade via FK)
    const offerItemCount = await prisma.landingPageOfferItem.count({
      where: { landingPageItemId: productLinkId },
    })
    if (offerItemCount > 0) {
      return NextResponse.json(
        { success: false, error: "This item is part of one or more offers. Remove it from offers first." },
        { status: 409 }
      )
    }

    // Delete variants first, then item
    await prisma.$transaction(async (tx) => {
      await tx.landingPageItemVariant.deleteMany({ where: { landingPageItemId: productLinkId } })
      await tx.landingPageItem.delete({ where: { id: productLinkId } })
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete item" }, { status: 500 })
  }
}
