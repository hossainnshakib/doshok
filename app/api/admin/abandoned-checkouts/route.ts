import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

const STATUSES = new Set(["active", "recovered", "converted", "expired"])

function itemCount(raw: string): number {
  try {
    const items = JSON.parse(raw) as Array<{ quantity?: number }>
    if (!Array.isArray(items)) return 0
    return items.reduce((sum, item) => sum + (Number.isFinite(item.quantity) ? Number(item.quantity) : 1), 0)
  } catch {
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission("orders")
    if (session instanceof NextResponse) return session

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")?.trim()
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const skip = (page - 1) * limit

    const where: Prisma.AbandonedCheckoutWhereInput = {}

    if (status && status !== "all") {
      if (!STATUSES.has(status)) return error("Invalid status", 400)
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { token: { contains: search, mode: "insensitive" } },
      ]
    }

    if (from || to) {
      where.lastActivityAt = {}
      if (from) where.lastActivityAt.gte = new Date(from)
      if (to) where.lastActivityAt.lte = new Date(to)
    }

    const [rows, total, stats] = await Promise.all([
      prisma.abandonedCheckout.findMany({
        where,
        orderBy: { lastActivityAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.abandonedCheckout.count({ where }),
      prisma.abandonedCheckout.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ])

    const statusCounts = Object.fromEntries(stats.map((row) => [row.status, row._count.status]))
    const origin = request.nextUrl.origin

    return success({
      checkouts: rows.map((row) => ({
        id: row.id,
        token: row.token,
        name: row.name,
        email: row.email,
        phone: row.phone,
        couponCode: row.couponCode,
        subtotal: row.subtotal,
        deliveryFee: row.deliveryFee,
        discount: row.discount,
        total: row.total,
        status: row.status,
        orderId: row.orderId,
        lastStep: row.lastStep,
        lastActivityAt: row.lastActivityAt,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        itemCount: itemCount(row.cartItems),
        recoveryUrl: `${origin}/checkout/recover/${row.token}`,
      })),
      stats: {
        active: statusCounts.active ?? 0,
        recovered: statusCounts.recovered ?? 0,
        converted: statusCounts.converted ?? 0,
        expired: statusCounts.expired ?? 0,
        total: stats.reduce((sum, row) => sum + row._count.status, 0),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    return error("Failed to fetch abandoned checkouts")
  }
}
