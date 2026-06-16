import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? "active"

    const session = await auth()

    if (status === "all" || status === "draft") {
      if (!session?.user || session.user.role !== "admin") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }
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
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

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