import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { sizeChartUpdateSchema } from "@/lib/validations"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const chart = await prisma.sizeChart.findUnique({
    where: { id },
    include: { rows: { orderBy: { position: "asc" } } },
  })
  if (!chart) return error("Size chart not found", 404)
  return success({
    ...chart,
    rows: chart.rows.map((r) => ({ ...r, measurements: r.measurements as Record<string, number> })),
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const { id } = await params
    const body = await request.json()
    const parsed = sizeChartUpdateSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const existing = await prisma.sizeChart.findUnique({ where: { id } })
    if (!existing) return error("Size chart not found", 404)

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugConflict = await prisma.sizeChart.findUnique({ where: { slug: parsed.data.slug } })
      if (slugConflict) return error("A chart with this slug already exists", 409)
    }

    const { rows, ...chartData } = parsed.data

    if (rows !== undefined) {
      await prisma.sizeChartRow.deleteMany({ where: { sizeChartId: id } })
    }

    const chart = await prisma.sizeChart.update({
      where: { id },
      data: {
        ...chartData,
        rows: rows ? {
          create: rows.map((row, index) => ({
            id: row.id,
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
    })
  } catch {
    return error("Failed to update size chart")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const { id } = await params
    const chart = await prisma.sizeChart.findUnique({ where: { id } })
    if (!chart) return error("Size chart not found", 404)

    await prisma.sizeChart.delete({ where: { id } })
    return success({ message: "Size chart deleted" })
  } catch {
    return error("Failed to delete size chart")
  }
}