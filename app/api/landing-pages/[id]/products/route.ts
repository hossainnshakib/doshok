import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageProductSchema } from "@/lib/validations"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const body = await req.json()
    const parsed = landingPageProductSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const existing = await prisma.landingPage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    const { productId, sortOrder, displayTitle, displayDescription, displayImage, ctaLabel, overridePrice } = parsed.data

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const existingProduct = await prisma.landingPageProduct.findUnique({
      where: { landingPageId_productId: { landingPageId: id, productId } },
    })
    if (existingProduct) {
      return NextResponse.json({ success: false, error: "Product already linked to this landing page" }, { status: 409 })
    }

    const landingPageProduct = await prisma.landingPageProduct.create({
      data: {
        landingPageId: id,
        productId,
        sortOrder,
        displayTitle: displayTitle || null,
        displayDescription: displayDescription || null,
        displayImage: displayImage || null,
        ctaLabel: ctaLabel || null,
        overridePrice: overridePrice || null,
      },
      include: { product: { select: { id: true, name: true, slug: true, images: true, price: true } } },
    })

    return NextResponse.json({ success: true, data: landingPageProduct }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to add product" }, { status: 500 })
  }
}
