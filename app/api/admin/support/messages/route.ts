import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminPermission } from "@/lib/auth/admin"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const statusSchema = z.enum(["new", "read", "archived"])

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission("support")
    if (session instanceof NextResponse) return session

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") ?? "new"
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const skip = (page - 1) * limit

    const parsedStatus = status === "all" ? null : statusSchema.safeParse(status)
    if (parsedStatus && !parsedStatus.success) {
      return NextResponse.json({ success: false, error: "Invalid message status" }, { status: 400 })
    }

    const where = parsedStatus ? { status: parsedStatus.data } : {}

    const [messages, total, stats] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ])

    const statusCounts = Object.fromEntries(stats.map((item) => [item.status, item._count.status]))

    return NextResponse.json({
      success: true,
      data: {
        messages,
        stats: {
          new: statusCounts.new ?? 0,
          read: statusCounts.read ?? 0,
          archived: statusCounts.archived ?? 0,
          total: stats.reduce((sum, item) => sum + item._count.status, 0),
        },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch support messages" }, { status: 500 })
  }
}
