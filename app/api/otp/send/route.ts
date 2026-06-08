import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { otpSendSchema } from "@/lib/validations"
import { isRateLimited, createOtp } from "@/lib/otp"
import { sendOtpEmail } from "@/lib/mailer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = otpSendSchema.safeParse(body)
    if (!parsed.success) return error("Valid email is required")

    const { email } = parsed.data

    const limited = await isRateLimited(email)
    if (limited) return error("Too many OTP requests. Please try again later.")

    const code = await createOtp(email)

    await sendOtpEmail(email, code)

    return success({ sent: true })
  } catch {
    return error("Failed to send OTP")
  }
}
