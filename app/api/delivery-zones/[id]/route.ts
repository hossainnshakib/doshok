import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { deliveryZoneUpdateSchema } from "@/lib/validations"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = deliveryZoneUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input")
    }

    const zone = await prisma.deliveryZone.update({ where: { id }, data: parsed.data })
    return success(zone)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return error("A delivery zone with this name already exists")
      if (err.code === "P2025") return error("Delivery zone not found")
    }
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return error("Delivery zone not found")
    }
    return error("Failed to delete delivery zone")
  }
}
