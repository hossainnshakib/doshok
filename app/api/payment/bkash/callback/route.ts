import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    const status = searchParams.get("status")
    const trxID = searchParams.get("trxID")

    if (!orderId) return error("Missing orderId")

    if (status === "success" && trxID) {
      const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "paid",
          bkashTrxId: trxID,
          paidAmount: order.total,
        },
      })
      return Response.redirect(new URL(`/order/success?orderId=${orderId}`, request.url))
    }

    return Response.redirect(new URL(`/order/failed?orderId=${orderId}`, request.url))
  } catch {
    return error("Payment callback failed")
  }
}
