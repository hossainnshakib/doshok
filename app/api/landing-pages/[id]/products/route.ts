import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageItemCreateSchema, landingPageImportProductSchema } from "@/lib/validations"

// POST /api/landing-pages/[id]/items - Create manual item OR import from product
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.landingPage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    // Check if this is an import request
    if (body.sourceProductId) {
      const importParsed = landingPageImportProductSchema.safeParse(body)
      if (!importParsed.success) {
        return NextResponse.json(
          { success: false, error: importParsed.error.issues[0]?.message ?? "Invalid input" },
          { status: 400 }
        )
      }

      const product = await prisma.product.findUnique({
        where: { id: importParsed.data.sourceProductId },
        select: {
          id: true, name: true, description: true, shortDescription: true,
          price: true, oldPrice: true, images: true, status: true,
          variants: { select: { size: true, color: true, colorHex: true, sku: true, stock: true, reservedStock: true } },
        },
      })
      if (!product) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
      }

      // Get max sortOrder
      const maxSort = await prisma.landingPageItem.aggregate({
        where: { landingPageId: id },
        _max: { sortOrder: true },
      })

      // Copy product data into a new LandingPageItem
      const itemName = importParsed.data.name || product.name
      const itemPrice = importParsed.data.price || product.price

      const item = await prisma.$transaction(async (tx) => {
        const newItem = await tx.landingPageItem.create({
          data: {
            landingPageId: id,
            name: itemName,
            description: product.description || null,
            shortDescription: product.shortDescription || null,
            price: itemPrice,
            compareAtPrice: (product.oldPrice && product.oldPrice > product.price) ? product.oldPrice : null,
            images: product.images || [],
            sku: null,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
            isPrimary: false,
            active: product.status === "Active",
            ctaLabel: null,
            stock: 0,
            reservedStock: 0,
            importedFromProductId: product.id,
            // Copy variants
            variants: {
              create: product.variants.map((v, idx) => ({
                name: [v.size, v.color].filter(Boolean).join(" / ") || `Variant ${idx + 1}`,
                size: v.size || null,
                color: v.color || null,
                colorHex: v.colorHex || null,
                sku: v.sku || null,
                priceOverride: null,
                stock: v.stock,
                reservedStock: v.reservedStock,
                active: true,
                sortOrder: idx,
              })),
            },
          },
          include: { variants: { orderBy: { sortOrder: "asc" } } },
        })
        return newItem
      })

      return NextResponse.json({ success: true, data: item }, { status: 201 })
    }

    // Manual item creation
    const parsed = landingPageItemCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const maxSort = await prisma.landingPageItem.aggregate({
      where: { landingPageId: id },
      _max: { sortOrder: true },
    })

    const item = await prisma.landingPageItem.create({
      data: {
        landingPageId: id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        shortDescription: parsed.data.shortDescription || null,
        price: parsed.data.price,
        compareAtPrice: parsed.data.compareAtPrice || null,
        images: parsed.data.images || [],
        sku: parsed.data.sku || null,
        sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
        isPrimary: parsed.data.isPrimary ?? false,
        active: true,
        ctaLabel: parsed.data.ctaLabel || null,
        stock: parsed.data.stock ?? 0,
        reservedStock: 0,
      },
      include: { variants: { orderBy: { sortOrder: "asc" } } },
    })

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create item" }, { status: 500 })
  }
}
