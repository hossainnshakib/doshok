import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

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
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { title, slug, excerpt, content, image, status } = body

    if (slug) {
      const existing = await prisma.story.findFirst({ where: { slug, id: { not: id } } })
      if (existing) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 })
      }
    }

    const story = await prisma.story.update({
      where: { id },
      data: { title, slug, excerpt, content, image, status },
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
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    await prisma.story.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete story" }, { status: 500 })
  }
}