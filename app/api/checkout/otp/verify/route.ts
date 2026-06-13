import { NextRequest } from "next/server"
import { success, error } from "@/lib/api-response"
import { verifyCheckoutOtp } from "@/lib/checkout/otp.service"
import { rateLimitByIp, rateLimitByKey } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const ipLimit = rateLimitByIp(request, 10, 60_000)
    if (ipLimit.limited) {
      return error("Too many requests. Please try again later.", 429)
    }

    const body = await request.json()
    const { phone, code } = body

    if (!phone || typeof phone !== "string") {
      return error("Phone number is required")
    }

    if (!code || typeof code !== "string") {
      return error("Verification code is required")
    }

    const phoneLimit = rateLimitByKey(`otp:verify:phone:${phone}`, 5, 60_000)
    if (phoneLimit.limited) {
      return error("Too many requests. Please try again later.", 429)
    }

    const result = await verifyCheckoutOtp(phone, code)
    return success(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to verify OTP"
    return error(message)
  }
}
