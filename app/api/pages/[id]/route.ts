import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const page = await prisma.page.findUnique({ where: { id } })
    if (!page) {
      return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: page })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch page" }, { status: 500 })
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
    const { title, slug, excerpt, content, seoTitle, seoDescription, seoImage, status } = body

    if (slug) {
      const existing = await prisma.page.findFirst({ where: { slug, id: { not: id } } })
      if (existing) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 })
      }
    }

    const page = await prisma.page.update({
      where: { id },
      data: { title, slug, excerpt, content, seoTitle, seoDescription, seoImage, status },
    })

    return NextResponse.json({ success: true, data: page })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update page" }, { status: 500 })
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
    await prisma.page.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete page" }, { status: 500 })
  }
}