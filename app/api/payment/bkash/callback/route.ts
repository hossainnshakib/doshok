import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { error } from "@/lib/api-response"
import {
  verifyBkashPayment,
  validateOrderForPayment,
  checkIdempotency,
  processSuccessfulPayment,
} from "@/lib/payment/bkash"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return redirectToFailed(request.url, orderId, "missing_order_id")
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return redirectToFailed(request.url, orderId, "order_not_found")
    }

    const status = searchParams.get("status")
    const trxID = searchParams.get("trxID")

    if (status !== "success" || !trxID) {
      return redirectToFailed(request.url, orderId, "payment_not_success")
    }

    const validation = await validateOrderForPayment(
      orderId,
      order.orderNumber,
      order.total
    )
    if (!validation.valid) {
      return redirectToFailed(request.url, orderId, validation.reason)
    }

    const idempotency = await checkIdempotency(trxID)
    if (!idempotency.isNew && idempotency.transaction) {
      if (idempotency.transaction.status === "success") {
        return redirectToSuccess(request.url, orderId)
      }
      return redirectToFailed(request.url, orderId, "transaction_failed")
    }

    const verified = await verifyBkashPayment(trxID)
    if ("error" in verified) {
      return redirectToFailed(request.url, orderId, "verification_failed")
    }

    if (verified.paymentExecuteStatus !== "success") {
      return redirectToFailed(request.url, orderId, "payment_not_completed")
    }

    if (verified.merchantInvoiceNumber !== order.orderNumber) {
      return redirectToFailed(request.url, orderId, "invoice_mismatch")
    }

    const verifiedAmount = parseFloat(verified.amount)
    if (verifiedAmount !== order.total) {
      return redirectToFailed(request.url, orderId, "amount_mismatch")
    }

    const providerResponse = JSON.stringify(verified)
    const result = await processSuccessfulPayment(
      orderId,
      trxID,
      order.total,
      providerResponse
    )

    if (!result.success) {
      return redirectToFailed(request.url, orderId, result.reason)
    }

    return redirectToSuccess(request.url, orderId)
  } catch (err) {
    console.error("[bkash/callback]", err)
    return redirectToFailed(request.url, null, "callback_error")
  }
}

function redirectToSuccess(baseUrl: string, orderId: string | null): Response {
  const url = orderId
    ? `/order/${orderId}?payment=success`
    : "/order/failed?reason=unknown"
  return Response.redirect(new URL(url, baseUrl), 302)
}

function redirectToFailed(
  baseUrl: string,
  orderId: string | null,
  reason: string
): Response {
  if (!orderId) {
    return Response.redirect(new URL("/order/failed?reason=" + reason, baseUrl), 302)
  }
  return Response.redirect(
    new URL(`/order/failed?orderId=${orderId}&reason=${reason}`, baseUrl),
    302
  )
}