import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const session = await auth()
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get("phone")
  const userId = searchParams.get("userId")
  const status = searchParams.get("status")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = 25
  const skip = (page - 1) * limit

  if (!session?.user) return error("Unauthorized", 401)

  if (userId) {
    if (session.user.id !== userId && session.user.role !== "admin") {
      return error("Forbidden", 403)
    }
    const where = { userId }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, address: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.order.count({ where }),
    ])
    return success({ orders, total, page, pages: Math.ceil(total / limit) })
  }

  if (phone) {
    if (session.user.role !== "admin") return error("Forbidden", 403)
    const where = { customerPhone: phone }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, address: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.order.count({ where }),
    ])
    return success({ orders, total, page, pages: Math.ceil(total / limit) })
  }

  if (session.user.role !== "admin") return error("Forbidden", 403)

  const where: Record<string, unknown> = {}
  if (status && status !== "all") where.orderStatus = status

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, address: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.order.count({ where }),
  ])

  return success({ orders, total, page, pages: Math.ceil(total / limit) })
}
