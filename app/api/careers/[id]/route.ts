import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const post = await prisma.careerPost.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ success: false, error: "Career post not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: post })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch career post" }, { status: 500 })
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

    const { id } = await params
    const body = await req.json()
    const {
      title, slug, department, location, employmentType,
      salaryRange, deadline, excerpt, description,
      responsibilities, requirements, benefits, status
    } = body

    if (slug) {
      const existing = await prisma.careerPost.findFirst({ where: { slug, id: { not: id } } })
      if (existing) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (slug !== undefined) updateData.slug = slug
    if (department !== undefined) updateData.department = department
    if (location !== undefined) updateData.location = location
    if (employmentType !== undefined) updateData.employmentType = employmentType
    if (salaryRange !== undefined) updateData.salaryRange = salaryRange
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null
    if (excerpt !== undefined) updateData.excerpt = excerpt
    if (description !== undefined) updateData.description = description
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities
    if (requirements !== undefined) updateData.requirements = requirements
    if (benefits !== undefined) updateData.benefits = benefits
    if (status !== undefined) updateData.status = status

    const post = await prisma.careerPost.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: post })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update career post" }, { status: 500 })
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

    const { id } = await params
    await prisma.careerPost.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete career post" }, { status: 500 })
  }
}