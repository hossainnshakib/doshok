import { NextRequest } from "next/server"
import { success, error } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, orderId, orderNumber } = body

    const tokenRes = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APP-Key": process.env.BKASH_APP_KEY ?? "",
      },
      body: JSON.stringify({
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData?.id_token) return error("Failed to get bKash token")

    const paymentRes = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: tokenData.id_token,
        "X-APP-Key": process.env.BKASH_APP_KEY ?? "",
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: orderId,
        callbackURL: `${process.env.NEXTAUTH_URL}/api/payment/bkash/callback?orderId=${orderId}`,
        amount: amount.toString(),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: orderNumber,
      }),
    })
    const paymentData = await paymentRes.json()

    return success(paymentData)
  } catch {
    return error("bKash payment creation failed")
  }
}
