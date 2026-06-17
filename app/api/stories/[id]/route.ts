import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const story = await prisma.story.findUnique({ where: { id } })
    if (!story) {
      return NextResponse.json({ success: false, error: "Story not found" }, { status: 404 })
    }

    if (story.status !== "active") {
      const session = await requireAdminPermission("cms")
      if (session instanceof NextResponse) return session
    }

    return NextResponse.json({ success: true, data: story })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch story" }, { status: 500 })
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
    const { title, slug, excerpt, content, image, status, seoTitle, seoDescription, seoImage, seoKeywords } = body

    if (slug) {
      const existing = await prisma.story.findFirst({ where: { slug, id: { not: id } } })
      if (existing) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 })
      }
    }

    const story = await prisma.story.update({
      where: { id },
      data: { title, slug, excerpt, content, image, status, seoTitle, seoDescription, seoImage, seoKeywords },
    })

    return NextResponse.json({ success: true, data: story })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update story" }, { status: 500 })
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
    await prisma.story.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete story" }, { status: 500 })
  }
}
