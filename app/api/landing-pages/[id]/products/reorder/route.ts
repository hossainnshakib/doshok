import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageReorderSchema } from "@/lib/validations"

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
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { orderedIds } = parsed.data

    // Verify all items belong to this page
    const items = await prisma.landingPageItem.findMany({
      where: { id: { in: orderedIds }, landingPageId: id },
      select: { id: true },
    })
    if (items.length !== orderedIds.length) {
      return NextResponse.json(
        { success: false, error: "One or more items do not belong to this landing page" },
        { status: 400 }
      )
    }

    // Update sort orders
    await prisma.$transaction(
      orderedIds.map((itemId, index) =>
        prisma.landingPageItem.update({
          where: { id: itemId },
          data: { sortOrder: index },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to reorder items" }, { status: 500 })
  }
}
