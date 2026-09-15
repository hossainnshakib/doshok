import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"
import { getRegistryEntry } from "@/lib/landing-pages/section-registry"

// Update a section's enabled flag and/or typed content.
// The section type can never be changed through this endpoint.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  try {
    const session = await requireAdminPermission("landing_pages")
    if (session instanceof NextResponse) return session

    const { id, sectionId } = await params
    const body = await req.json().catch(() => ({}))

    // Ownership check blocks cross-page section mutation.
    const section = await prisma.landingPageSection.findFirst({
      where: { id: sectionId, landingPageId: id },
    })
    if (!section) {
      return NextResponse.json({ success: false, error: "Section not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json({ success: false, error: "enabled must be a boolean" }, { status: 400 })
      }
      updateData.enabled = body.enabled
    }

    if (body.content !== undefined) {
      const entry = getRegistryEntry(section.type)
      if (!entry?.editable || !entry.schema) {
        return NextResponse.json(
          { success: false, error: `${entry?.label ?? section.type} is not editable yet` },
          { status: 400 }
        )
      }
      const parsed = entry.schema.safeParse(body.content ?? {})
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message ?? "Invalid section content" },
          { status: 400 }
        )
      }
      updateData.content = parsed.data
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 })
    }

    const updated = await prisma.landingPageSection.update({
      where: { id: sectionId },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update section" }, { status: 500 })
  }
}
