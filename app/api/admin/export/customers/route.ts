import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { toCsvRow } from "@/lib/csv"
import { requireAdminPermission } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireAdminPermission("import_export")
  if (session instanceof NextResponse) return session

  const customers = await prisma.user.findMany({
    where: { role: "customer" },
    include: {
      _count: {
        select: { orders: true, addresses: true },
      },
      orders: {
        select: { total: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const headers = [
    "id",
    "name",
    "email",
    "phone",
    "role",
    "status",
    "orderCount",
    "totalSpent",
    "addressCount",
    "createdAt",
    "updatedAt",
  ]

  const rows = customers.map((c) => {
    const totalSpent = c.orders.reduce((s, o) => s + o.total, 0)

    return toCsvRow([
      c.id,
      c.name ?? "",
      c.email ?? "",
      c.phone ?? "",
      c.role,
      c.status,
      c._count.orders,
      totalSpent,
      c._count.addresses,
      c.createdAt.toISOString(),
      c.updatedAt.toISOString(),
    ])
  })

  const csv = [toCsvRow(headers), ...rows].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-export-${Date.now()}.csv"`,
    },
  })
}
