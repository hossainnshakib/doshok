import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { rateLimitByIp } from "@/lib/rate-limit"
import {
  isBkashEnabled,
  createBkashPayment,
  validateOrderForPayment,
  initiatePaymentTransaction,
} from "@/lib/payment/bkash"
import { resolvePaymentAmount } from "@/lib/payment/payment-amount"

const PAYMENT_EXPIRY_HOURS = 2

export async function POST(request: NextRequest) {
  try {
    const { limited } = rateLimitByIp(request, 5, 60 * 1000)
    if (limited) return error("Too many requests. Please try again later.", 429)

    const enabled = await isBkashEnabled()
    if (!enabled) return error("bKash payment is not enabled")

    const body = await request.json()
    const { orderId, orderNumber } = body

    if (!orderId || !orderNumber) {
      return error("orderId and orderNumber are required")
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return error("Order not found", 404)

    if (order.paymentMethod.toLowerCase() !== "bkash") {
      return error("Order is not a bKash payment")
    }

    if (order.paymentStatus !== "pending") {
      return error(`Order is not awaiting payment (status: ${order.paymentStatus})`)
    }

    const paymentAmount = resolvePaymentAmount(order)
    const validation = await validateOrderForPayment(orderId, orderNumber, paymentAmount)
    if (!validation.valid) {
      const messages: Record<string, string> = {
        not_found: "Order not found",
        already_paid: "Order is already paid",
        cancelled: "Order was cancelled",
        returned: "Order was returned",
        expired: "Payment window has expired",
        wrong_status: "Order is not in pending payment status",
        amount_mismatch: "Order amount does not match",
      }
      return error(messages[validation.reason] ?? "Order validation failed")
    }

    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000)
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentExpiresAt: expiresAt },
    })

    const callbackBase = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const result = await createBkashPayment(orderId, orderNumber, paymentAmount, callbackBase)

    if ("error" in result) return error(result.error)

    if (result.paymentExecuteStatus === "success" && result.trxId) {
      await initiatePaymentTransaction(orderId, result.trxId, paymentAmount, "initiated")
    }

    return success(result)
  } catch (err) {
    console.error("[bkash/create]", err)
    return error("Failed to create bKash payment")
  }
}