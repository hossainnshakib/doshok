import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminPermission } from "@/lib/auth/admin"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("support")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const message = await prisma.contactMessage.findUnique({ where: { id } })

    if (!message) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: message })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch support message" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("support")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid message status" }, { status: 400 })
    }

    const { id } = await params
    const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 })
    }

    const message = await prisma.contactMessage.update({
      where: { id },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ success: true, data: message })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update support message" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("support")
    if (session instanceof NextResponse) return session

    const { id } = await params
    const existing = await prisma.contactMessage.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404 })
    }

    const message = await prisma.contactMessage.update({
      where: { id },
      data: { status: "archived" },
    })

    return NextResponse.json({ success: true, data: message })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to archive support message" }, { status: 500 })
  }
}
