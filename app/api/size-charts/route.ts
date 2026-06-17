import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { sizeChartSchema } from "@/lib/validations"
import { requireAdminPermission } from "@/lib/auth/admin"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const charts = await prisma.sizeChart.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      rows: { orderBy: { position: "asc" } },
      _count: { select: { products: true } },
    },
  })
  return success(charts.map((c) => ({
    ...c,
    rows: c.rows.map((r) => ({ ...r, measurements: r.measurements as Record<string, number> })),
  })))
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = sizeChartSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const { rows, ...chartData } = parsed.data

    const existing = await prisma.sizeChart.findUnique({ where: { slug: chartData.slug } })
    if (existing) return error("A chart with this slug already exists", 409)

    const chart = await prisma.sizeChart.create({
      data: {
        ...chartData,
        rows: rows ? {
          create: rows.map((row, index) => ({
            label: row.label,
            position: row.position ?? index,
            measurements: row.measurements,
          })),
        } : undefined,
      },
      include: { rows: { orderBy: { position: "asc" } } },
    })

    return success({
      ...chart,
      rows: chart.rows.map((r) => ({ ...r, measurements: r.measurements as Record<string, number> })),
    }, 201)
  } catch {
    return error("Failed to create size chart")
  }
}
