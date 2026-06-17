import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermission } from "@/lib/auth/admin"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const admin = searchParams.get("admin") === "true"

    if (admin) {
      const session = await requireAdminPermission("careers")
      if (session instanceof NextResponse) return session
    }

    let where = {}
    if (!admin) {
      where = { status: "Open" }
    } else if (status && status !== "all") {
      where = { status }
    }

    const posts = await prisma.careerPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: posts })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch career posts" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminPermission("careers")
    if (session instanceof NextResponse) return session

    const body = await req.json()
    const {
      title, slug, department, location, employmentType,
      salaryRange, deadline, excerpt, description,
      responsibilities, requirements, benefits, status
    } = body

    if (!title || !slug || !department || !location || !employmentType || !description) {
      return NextResponse.json({ success: false, error: "Required fields missing" }, { status: 400 })
    }

    const existing = await prisma.careerPost.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ success: false, error: "A post with this slug already exists" }, { status: 409 })
    }

    const post = await prisma.careerPost.create({
      data: {
        title,
        slug,
        department,
        location,
        employmentType,
        salaryRange: salaryRange || null,
        deadline: deadline ? new Date(deadline) : null,
        excerpt: excerpt || null,
        description,
        responsibilities: responsibilities || null,
        requirements: requirements || null,
        benefits: benefits || null,
        status: status || "Draft",
      },
    })

    return NextResponse.json({ success: true, data: post })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create career post" }, { status: 500 })
  }
}
