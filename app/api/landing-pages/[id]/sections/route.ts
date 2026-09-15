import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { CREATABLE_SECTION_TYPES, getRegistryEntry } from "@/lib/landing-pages/section-registry"

// On-demand section creation. Only GALLERY may be created this way — all
// other singleton sections are seeded at page creation and cannot be
// duplicated or type-switched by the client.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const type = typeof body?.type === "string" ? body.type : ""

    if (!(CREATABLE_SECTION_TYPES as string[]).includes(type)) {
      return NextResponse.json({ success: false, error: "This section type cannot be created on demand" }, { status: 400 })
    }

    const page = await prisma.landingPage.findUnique({
      where: { id },
      select: { id: true, sections: { select: { id: true, type: true, sortOrder: true } } },
    })
    if (!page) {
      return NextResponse.json({ success: false, error: "Landing page not found" }, { status: 404 })
    }

    if (page.sections.some((s) => s.type === type)) {
      return NextResponse.json({ success: false, error: "This section already exists on the page" }, { status: 409 })
    }

    const entry = getRegistryEntry(type)
    if (!entry) {
      return NextResponse.json({ success: false, error: "Unknown section type" }, { status: 400 })
    }

    const maxOrder = page.sections.reduce((m, s) => Math.max(m, s.sortOrder), -1)
    const section = await prisma.landingPageSection.create({
      data: {
        landingPageId: id,
        type,
        enabled: entry.defaultEnabled,
        sortOrder: maxOrder + 1,
        content: entry.defaultContent() as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ success: true, data: section }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create section" }, { status: 500 })
  }
}
