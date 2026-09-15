import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageCreateSchema } from "@/lib/validations"
import { heroPrefillFromProduct } from "@/lib/landing-pages/section-schemas"
import { defaultBenefitsContent, defaultProductsContent } from "@/lib/landing-pages/section-schemas"

const DEFAULT_SECTIONS = [
  { type: "BENEFITS", sortOrder: 1, content: defaultBenefitsContent() },
  { type: "PRODUCTS", sortOrder: 2, content: defaultProductsContent() },
  { type: "OFFERS", sortOrder: 3, content: {} },
  { type: "REVIEWS", sortOrder: 4, content: {} },
  { type: "FAQ", sortOrder: 5, content: {} },
  { type: "CHECKOUT", sortOrder: 6, content: {} },
]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const pageParam = parseInt(searchParams.get("page") ?? "1", 10) || 1
    const limitParam = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10) || 50)

    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const where: Record<string, unknown> = {}
    if (status && status !== "all") {
      where.status = status
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    const [landingPages, total] = await Promise.all([
      prisma.landingPage.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (pageParam - 1) * limitParam,
        take: limitParam,
        include: {
          sourceProduct: { select: { id: true, name: true, slug: true, images: true } },
          products: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } },
          _count: { select: { sections: true, products: true } },
        },
      }),
      prisma.landingPage.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        landingPages,
        pagination: {
          page: pageParam,
          limit: limitParam,
          total,
          totalPages: Math.ceil(total / limitParam),
        },
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch landing pages" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const body = await req.json()
    const parsed = landingPageCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { title, slug, creationMode, sourceProductId, seoTitle, seoDescription, ogTitle, ogDescription, ogImage, canonicalUrl } = parsed.data

    const existing = await prisma.landingPage.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ success: false, error: "A landing page with this slug already exists" }, { status: 409 })
    }

    let prefilledData: Record<string, unknown> = {}
    let heroContent: Prisma.InputJsonValue =
      heroPrefillFromProduct({ name: title }) as unknown as Prisma.InputJsonValue

    if (creationMode === "existing_product" && sourceProductId) {
      const product = await prisma.product.findUnique({
        where: { id: sourceProductId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          shortDescription: true,
          images: true,
          seoTitle: true,
          seoDescription: true,
          seoImage: true,
        },
      })

      if (!product) {
        return NextResponse.json({ success: false, error: "Source product not found" }, { status: 404 })
      }

      prefilledData = {
        seoTitle: product.seoTitle || product.name,
        seoDescription: product.seoDescription || product.shortDescription || product.description || undefined,
        ogTitle: product.name,
        ogDescription: product.shortDescription || product.description || undefined,
        ogImage: product.seoImage || (product.images && product.images[0]) || undefined,
      }

      // Initialize HERO from the product snapshot (creation-time only).
      heroContent = heroPrefillFromProduct({
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        images: product.images,
      }) as unknown as Prisma.InputJsonValue
    }

    const landingPage = await prisma.landingPage.create({
      data: {
        title,
        slug,
        status: "draft",
        creationMode,
        sourceProductId: creationMode === "existing_product" ? sourceProductId : null,
        seoTitle: seoTitle || (prefilledData.seoTitle as string) || null,
        seoDescription: seoDescription || (prefilledData.seoDescription as string) || null,
        ogTitle: ogTitle || (prefilledData.ogTitle as string) || null,
        ogDescription: ogDescription || (prefilledData.ogDescription as string) || null,
        ogImage: ogImage || (prefilledData.ogImage as string) || null,
        canonicalUrl: canonicalUrl || null,
        sections: {
          create: [{ type: "HERO", sortOrder: 0, content: heroContent }, ...DEFAULT_SECTIONS],
        },
        products: creationMode === "existing_product" && sourceProductId
          ? {
              create: {
                productId: sourceProductId,
                sortOrder: 0,
                displayTitle: (prefilledData.ogTitle as string) || null,
                displayDescription: (prefilledData.ogDescription as string) || null,
                displayImage: (prefilledData.ogImage as string) || null,
              },
            }
          : undefined,
      },
      include: {
        sourceProduct: { select: { id: true, name: true, slug: true, images: true } },
        products: { include: { product: { select: { id: true, name: true, slug: true } } } },
        sections: { orderBy: { sortOrder: "asc" } },
      },
    })

    return NextResponse.json({ success: true, data: landingPage }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create landing page" }, { status: 500 })
  }
}
