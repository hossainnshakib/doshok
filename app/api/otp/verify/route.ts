import { NextRequest } from "next/server"
import { success, error } from "@/lib/api-response"
import { otpVerifySchema } from "@/lib/validations"
import { verifyOtp } from "@/lib/otp"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = otpVerifySchema.safeParse(body)
    if (!parsed.success) return error("Valid email and 6-digit code are required")

    const { email, code } = parsed.data

    const result = await verifyOtp(email, code)
    if (!result.success) return error(result.error ?? "OTP verification failed")

    return success({ verified: true })
  } catch {
    return error("OTP verification failed")
  }
}
