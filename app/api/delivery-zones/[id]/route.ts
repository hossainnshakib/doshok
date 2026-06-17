import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const zone = await prisma.deliveryZone.update({ where: { id }, data: body })
    return success(zone)
  } catch {
    return error("Failed to update delivery zone")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    await prisma.deliveryZone.delete({ where: { id } })
    return success({ deleted: true })
  } catch {
    return error("Failed to delete delivery zone")
  }
}
