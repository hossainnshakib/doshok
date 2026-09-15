import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { landingPageReorderSchema } from "@/lib/validations"

// Persist a full section ordering. The submitted ID list must match the
// page's existing section set exactly — no cross-page IDs, no omissions.
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
      select: { id: true, sections: { select: { id: true } } },
    })
    if (!page) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    const current = new Set(page.sections.map((s) => s.id))
    const submitted = parsed.data.orderedIds
    if (submitted.length !== current.size || !submitted.every((sid) => current.has(sid))) {
      return NextResponse.json({ success: false, error: "orderedIds must match the page sections exactly" }, { status: 400 })
    }

    await prisma.$transaction(
      submitted.map((sid, index) =>
        prisma.landingPageSection.update({ where: { id: sid }, data: { sortOrder: index } })
      )
    )

    const sections = await prisma.landingPageSection.findMany({
      where: { landingPageId: id },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: sections })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to reorder sections" }, { status: 500 })
  }
}
