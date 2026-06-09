import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { validateOrderForPayment, createBkashPayment } from "@/lib/payment/bkash"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return error("orderId is required")
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, total: true, paymentMethod: true, paymentStatus: true },
    })

    if (!order) {
      return error("Order not found", 404)
    }

    if (order.paymentMethod.toLowerCase() !== "bkash") {
      return error("Order is not a bKash payment")
    }

    const validation = await validateOrderForPayment(order.id, order.orderNumber, order.total)
    if (!validation.valid) {
      const messages: Record<string, string> = {
        already_paid: "Order is already paid",
        cancelled: "Order was cancelled",
        returned: "Order was returned",
        expired: "Payment window has expired. Please contact support.",
        wrong_status: `Order payment status is ${order.paymentStatus}, not pending.`,
        not_found: "Order not found",
        amount_mismatch: "Order amount has changed",
      }
      return error(messages[validation.reason] ?? "Cannot retry payment")
    }

    const callbackBase = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const bkashResult = await createBkashPayment(order.id, order.orderNumber, order.total, callbackBase)

    if ("error" in bkashResult) {
      return error(bkashResult.error)
    }

    const mode = await prisma.paymentMethodSetting.findUnique({ where: { provider: "BKASH" } })
    const baseUrl = mode?.mode === "LIVE"
      ? "https://checkout.pay.bka.sh/v1.2.0-beta"
      : "https://tokenized.sandbox.bka.sh/v1.2.0-beta"

    if (bkashResult.paymentExecuteStatus === "success" && bkashResult.trxId) {
      return success({
        paymentId: bkashResult.trxId,
        message: "Payment already completed",
      })
    }

    if (!bkashResult.paymentId) {
      return error("Failed to create payment. Please try again.")
    }

    const paymentUrl = `${baseUrl}/tokenized/checkout/pay/${bkashResult.paymentId}`

    return success({ paymentId: bkashResult.paymentId, paymentUrl })
  } catch (err) {
    console.error("[bkash/retry]", err)
    return error("Failed to retry payment")
  }
}