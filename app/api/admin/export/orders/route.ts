import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { toCsvRow } from "@/lib/csv"
import { requireAdminPermission } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireAdminPermission("import_export")
  if (session instanceof NextResponse) return session

  const orders = await prisma.order.findMany({
    include: {
      address: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const headers = [
    "id",
    "orderNumber",
    "customerName",
    "customerPhone",
    "customerEmail",
    "orderStatus",
    "paymentStatus",
    "paymentMethod",
    "subtotal",
    "discount",
    "deliveryFee",
    "total",
    "paidAmount",
    "dueAmount",
    "itemCount",
    "deliveryAddressSummary",
    "createdAt",
    "updatedAt",
  ]

  const rows = orders.map((o) => {
    const addr = o.address
    const addressSummary = addr
      ? `${addr.fullAddress}, ${addr.thana}, ${addr.district}, ${addr.division}`
      : ""

    return toCsvRow([
      o.id,
      o.orderNumber,
      o.customerName,
      o.customerPhone,
      o.customerEmail,
      o.orderStatus,
      o.paymentStatus,
      o.paymentMethod,
      o.subtotal,
      o.discount,
      o.deliveryFee,
      o.total,
      o.paidAmount,
      o.dueAmount,
      o.items.length,
      addressSummary,
      o.createdAt.toISOString(),
      o.updatedAt.toISOString(),
    ])
  })

  const csv = [toCsvRow(headers), ...rows].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-export-${Date.now()}.csv"`,
    },
  })
}
