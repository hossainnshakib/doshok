import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { forgotPasswordSchema } from "@/lib/validations"
import { success, error } from "@/lib/api-response"
import { isResetRateLimited, createAndSendResetToken } from "@/lib/password-reset"
import { rateLimitByIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const { limited: ipLimited } = rateLimitByIp(request, 5, 10 * 60 * 1000)
    if (ipLimited) return success({ message: "If an account exists, we sent a password reset link." })

    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return error(firstIssue?.message ?? "Invalid input")
    }

    const { email } = parsed.data
    const normalizedEmail = email.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    const emailLimited = await isResetRateLimited(normalizedEmail)
    if (emailLimited) {
      return success({ message: "If an account exists, we sent a password reset link." })
    }

    if (user) {
      await createAndSendResetToken(normalizedEmail)
    }

    return success({ message: "If an account exists, we sent a password reset link." })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong"
    return error(message)
  }
}
