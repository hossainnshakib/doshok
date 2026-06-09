import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)

  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, address: true },
  })

  if (!order) return error("Not found", 404)

  if (session.user.role !== "admin" && order.userId !== session.user.id) {
    return error("Forbidden", 403)
  }

  return success(order)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)
  if (session.user.role !== "admin") return error("Forbidden", 403)

  const { id } = await params

  try {
    const body = await request.json()
    const allowed = ["orderStatus", "paymentStatus", "trackingCode", "adminNote"]
    const filtered: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) filtered[key] = body[key]
    }
    const order = await prisma.order.update({
      where: { id },
      data: filtered,
      include: { items: true, address: true },
    })
    return success(order)
  } catch {
    return error("Failed to update order")
  }
}
