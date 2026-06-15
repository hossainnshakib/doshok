import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

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
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    await prisma.deliveryZone.delete({ where: { id } })
    return success({ deleted: true })
  } catch {
    return error("Failed to delete delivery zone")
  }
}
