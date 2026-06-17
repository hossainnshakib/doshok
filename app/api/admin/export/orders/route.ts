import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toCsvRow } from "@/lib/csv"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

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
