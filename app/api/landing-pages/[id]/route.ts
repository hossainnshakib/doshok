import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageUpdateSchema } from "@/lib/validations"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const landingPage = await prisma.landingPage.findUnique({
      where: { id },
      include: {
        sourceProduct: { select: { id: true, name: true, slug: true, images: true, price: true, status: true, shortDescription: true, description: true } },
        products: {
          include: { product: { select: { id: true, name: true, slug: true, images: true, price: true, oldPrice: true, status: true, variants: { select: { stock: true } } } } },
          orderBy: { sortOrder: "asc" },
        },
        sections: { orderBy: { sortOrder: "asc" } },
      },
    })

    if (!landingPage) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: landingPage })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch landing page" }, { status: 500 })
  }
}

export async function PATCH(
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

    const parsed = landingPageUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { title, slug, status, template, seoTitle, seoDescription, ogTitle, ogDescription, ogImage, canonicalUrl, robotsIndex, robotsFollow } = parsed.data

    if (slug && slug !== existing.slug) {
      const slugTaken = await prisma.landingPage.findFirst({ where: { slug, id: { not: id } } })
      if (slugTaken) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (slug !== undefined) updateData.slug = slug
    if (template !== undefined) updateData.template = template
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle || null
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription || null
    if (ogTitle !== undefined) updateData.ogTitle = ogTitle || null
    if (ogDescription !== undefined) updateData.ogDescription = ogDescription || null
    if (ogImage !== undefined) updateData.ogImage = ogImage || null
    if (canonicalUrl !== undefined) updateData.canonicalUrl = canonicalUrl || null
    if (robotsIndex !== undefined) updateData.robotsIndex = robotsIndex
    if (robotsFollow !== undefined) updateData.robotsFollow = robotsFollow

    // Handle status transitions
    if (status && status !== existing.status) {
      if (status === "published") {
        // Validate publish readiness
        if (!title && !existing.title) {
          return NextResponse.json({ success: false, error: "Title is required to publish" }, { status: 400 })
        }
        const slugToCheck = slug || existing.slug
        if (!slugToCheck) {
          return NextResponse.json({ success: false, error: "Slug is required to publish" }, { status: 400 })
        }
        updateData.status = "published"
        updateData.publishedAt = new Date()
        updateData.archivedAt = null
        updateData.robotsIndex = robotsIndex ?? existing.robotsIndex
      } else if (status === "archived") {
        updateData.status = "archived"
        updateData.archivedAt = new Date()
        updateData.publishedAt = existing.publishedAt
      } else if (status === "draft") {
        updateData.status = "draft"
        updateData.publishedAt = null
        updateData.archivedAt = null
      }
    }

    const landingPage = await prisma.landingPage.update({
      where: { id },
      data: updateData,
      include: {
        sourceProduct: { select: { id: true, name: true, slug: true, images: true } },
        products: { include: { product: { select: { id: true, name: true, slug: true } } } },
        sections: { orderBy: { sortOrder: "asc" } },
      },
    })

    return NextResponse.json({ success: true, data: landingPage })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update landing page" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params

    const existing = await prisma.landingPage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    // Archive instead of delete for published pages
    if (existing.status === "published") {
      await prisma.landingPage.update({
        where: { id },
        data: { status: "archived", archivedAt: new Date() },
      })
      return NextResponse.json({ success: true })
    }

    await prisma.landingPage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete landing page" }, { status: 500 })
  }
}
