import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageReorderSchema } from "@/lib/validations"

// Persist a full linked-product ordering. The submitted link-ID list must
// match the page's existing links exactly.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = landingPageReorderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "orderedIds must be a non-empty array" }, { status: 400 })
    }

    const page = await prisma.landingPage.findUnique({
      where: { id },
      select: { id: true, products: { select: { id: true } } },
    })
    if (!page) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    const current = new Set(page.products.map((p) => p.id))
    const submitted = parsed.data.orderedIds
    if (submitted.length !== current.size || !submitted.every((lid) => current.has(lid))) {
      return NextResponse.json({ success: false, error: "orderedIds must match the linked products exactly" }, { status: 400 })
    }

    await prisma.$transaction(
      submitted.map((lid, index) =>
        prisma.landingPageProduct.update({ where: { id: lid }, data: { sortOrder: index } })
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to reorder products" }, { status: 500 })
  }
}
