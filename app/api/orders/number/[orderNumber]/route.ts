import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      address: true,
      shipment: {
        select: {
          courierProvider: true,
          status: true,
          trackingCode: true,
          customerNote: true,
        },
      },
    },
  })

  if (!order) return error("Not found", 404)
  return success(order)
}
