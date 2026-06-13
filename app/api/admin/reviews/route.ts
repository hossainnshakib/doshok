import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recalculateProductRating } from "@/lib/reviews"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? "pending"
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const skip = (page - 1) * limit

    const where = status === "all" ? {} : { status }

    const [reviews, total, stats] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, slug: true, images: true } },
          user: { select: { name: true, email: true, firstName: true, lastName: true } },
          order: { select: { orderNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.productReview.count({ where }),
      prisma.productReview.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ])

    const statusCounts = Object.fromEntries(stats.map((s) => [s.status, s._count.status]))

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        stats: {
          pending: statusCounts["pending"] ?? 0,
          approved: statusCounts["approved"] ?? 0,
          rejected: statusCounts["rejected"] ?? 0,
          total: statusCounts["pending"] + statusCounts["approved"] + statusCounts["rejected"],
        },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch reviews" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, reviewId, reviewIds } = body

    const ids = reviewIds ?? (reviewId ? [reviewId] : [])
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "No review IDs provided" }, { status: 400 })
    }

    if (!["approve", "reject", "delete"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    if (action === "delete") {
      const deleted = await prisma.productReview.deleteMany({ where: { id: { in: ids } } })
      return NextResponse.json({ success: true, data: { count: deleted.count } })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"

    const updated = await prisma.productReview.updateMany({
      where: { id: { in: ids } },
      data: {
        status: newStatus,
        approvedAt: newStatus === "approved" ? new Date() : null,
        approvedBy: newStatus === "approved" ? session.user.id : null,
      },
    })

    if (action === "approve") {
      const reviews = await prisma.productReview.findMany({
        where: { id: { in: ids } },
        select: { productId: true },
      })
      const productIds = [...new Set(reviews.map((r) => r.productId))]
      await Promise.all(productIds.map((pid) => recalculateProductRating(pid)))
    }

    if (action === "reject") {
      const reviews = await prisma.productReview.findMany({
        where: { id: { in: ids } },
        select: { productId: true },
      })
      const productIds = [...new Set(reviews.map((r) => r.productId))]
      await Promise.all(productIds.map((pid) => recalculateProductRating(pid)))
    }

    return NextResponse.json({ success: true, data: { count: updated.count } })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update reviews" }, { status: 500 })
  }
}