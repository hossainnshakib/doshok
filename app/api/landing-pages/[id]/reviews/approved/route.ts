import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"

// Approved product reviews for products that were imported into this page's items.
// Only products referenced via importedFromProductId are included.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const page = await prisma.landingPage.findUnique({
      where: { id },
      select: { id: true, items: { select: { importedFromProductId: true } } },
    })
    if (!page) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    const productIds = page.items
      .map((item) => item.importedFromProductId)
      .filter((pid): pid is string => pid !== null)

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const reviews = await prisma.productReview.findMany({
      where: { productId: { in: productIds }, status: "approved" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        content: true,
        isVerifiedBuyer: true,
        createdAt: true,
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    })

    return NextResponse.json({ success: true, data: reviews })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch reviews" }, { status: 500 })
  }
}
