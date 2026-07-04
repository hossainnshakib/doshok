import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const all = searchParams.get("all") === "true"

    const where = all ? {} : { isActive: true }

    const categories = await prisma.storyCategory.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminPermission("cms")
    if (session instanceof NextResponse) return session

    const body = await req.json()
    const { name, description, sortOrder, isActive } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
    }

    const slug = slugify(name)

    const existing = await prisma.storyCategory.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ success: false, error: "A category with this name already exists" }, { status: 409 })
    }

    const category = await prisma.storyCategory.create({
      data: {
        name: name.trim(),
        slug,
        description: description || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    })

    return NextResponse.json({ success: true, data: category })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create category" }, { status: 500 })
  }
}
