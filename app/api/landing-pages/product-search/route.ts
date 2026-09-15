import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"

// Admin product search scoped to the landing_pages permission so roles
// without the products permission (e.g. content_manager) can still build
// landing pages from existing products. Returns minimal public-safe fields.
export async function GET(req: NextRequest) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { searchParams } = new URL(req.url)
    const search = (searchParams.get("search") ?? "").trim()

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        oldPrice: true,
        images: true,
        status: true,
      },
    })

    return NextResponse.json({ success: true, data: products })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to search products" }, { status: 500 })
  }
}
