import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? "active"

    if (status === "all" || status === "draft") {
      const session = await requireAdminPermission("cms")
      if (session instanceof NextResponse) return session
    }

    const where = status === "all" ? {} : { status: status === "draft" ? "draft" : "active" }

    const pages = await prisma.page.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: pages })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch pages" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const body = await req.json()
    const { title, slug, excerpt, content, seoTitle, seoDescription, seoImage, status } = body

    if (!title || !slug || !content) {
      return NextResponse.json({ success: false, error: "Title, slug, and content are required" }, { status: 400 })
    }

    const existing = await prisma.page.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ success: false, error: "A page with this slug already exists" }, { status: 409 })
    }

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        seoTitle,
        seoDescription,
        seoImage,
        status: status ?? "draft",
      },
    })

    return NextResponse.json({ success: true, data: page })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create page" }, { status: 500 })
  }
}
