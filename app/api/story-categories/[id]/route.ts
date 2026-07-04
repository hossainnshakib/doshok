import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const category = await prisma.storyCategory.findUnique({ where: { id } })
    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: category })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch category" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const body = await req.json()
    const { name, description, sortOrder, isActive } = body

    const existing = await prisma.storyCategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
      }
      data.name = name.trim()
      const newSlug = slugify(name)
      const slugConflict = await prisma.storyCategory.findFirst({ where: { slug: newSlug, id: { not: id } } })
      if (slugConflict) {
        return NextResponse.json({ success: false, error: "A category with this name already exists" }, { status: 409 })
      }
      data.slug = newSlug
    }
    if (description !== undefined) data.description = description || null
    if (sortOrder !== undefined) data.sortOrder = sortOrder
    if (isActive !== undefined) data.isActive = isActive

    const category = await prisma.storyCategory.update({ where: { id }, data })

    return NextResponse.json({ success: true, data: category })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const { id } = await params

    const storyCount = await prisma.story.count({ where: { storyCategoryId: id } })
    if (storyCount > 0) {
      return NextResponse.json({ success: false, error: `Cannot delete category used by ${storyCount} story(ies). Reassign stories first.` }, { status: 400 })
    }

    await prisma.storyCategory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete category" }, { status: 500 })
  }
}
