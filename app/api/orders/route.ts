import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const session = await auth()
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get("phone")
  const userId = searchParams.get("userId")

  if (userId) {
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.id !== userId && session.user.role !== "admin") {
      return error("Forbidden", 403)
    }
    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: true, address: true },
      orderBy: { createdAt: "desc" },
    })
    return success(orders)
  }

  if (phone) {
    const orders = await prisma.order.findMany({
      where: { customerPhone: phone },
      include: { items: true, address: true },
      orderBy: { createdAt: "desc" },
    })
    return success(orders)
  }

  if (!session?.user) return error("Unauthorized", 401)
  if (session.user.role !== "admin") return error("Forbidden", 403)

  const orders = await prisma.order.findMany({
    include: { items: true, address: true },
    orderBy: { createdAt: "desc" },
  })
  return success(orders)
}
