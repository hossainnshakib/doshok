import { NextRequest } from "next/server"
import { success, error } from "@/lib/api-response"
import { sendCheckoutOtp } from "@/lib/checkout/otp.service"
import { rateLimitByIp, rateLimitByKey } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const ipLimit = rateLimitByIp(request, 5, 60_000)
    if (ipLimit.limited) {
      return error("Too many requests. Please try again later.", 429)
    }

    const body = await request.json()
    const { phone } = body

    if (!phone || typeof phone !== "string") {
      return error("Phone number is required")
    }

    const phoneLimit = rateLimitByKey(`otp:send:phone:${phone}`, 3, 60_000)
    if (phoneLimit.limited) {
      return error("Too many requests. Please try again later.", 429)
    }

    const result = await sendCheckoutOtp(phone)
    return success(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send OTP"
    return error(message)
  }
}
