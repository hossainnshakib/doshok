import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageReorderSchema } from "@/lib/validations"

// Persist a full offer ordering. The submitted ID list must match the
// page's existing offer set exactly.
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
      select: { id: true, offers: { select: { id: true } } },
    })
    if (!page) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    const current = new Set(page.offers.map((o) => o.id))
    const submitted = parsed.data.orderedIds
    if (submitted.length !== current.size || !submitted.every((oid) => current.has(oid))) {
      return NextResponse.json({ success: false, error: "orderedIds must match the offers exactly" }, { status: 400 })
    }

    await prisma.$transaction(
      submitted.map((oid, index) =>
        prisma.landingPageOffer.update({ where: { id: oid }, data: { sortOrder: index } })
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to reorder offers" }, { status: 500 })
  }
}
