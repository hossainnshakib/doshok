import { NextRequest } from "next/server"
import { resetPasswordSchema } from "@/lib/validations"
import { success, error } from "@/lib/api-response"
import { resetPassword } from "@/lib/password-reset"
import { rateLimitByIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const { limited } = rateLimitByIp(request, 5, 15 * 60 * 1000)
    if (limited) return error("Too many requests. Please try again later.", 429)

    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return error(firstIssue?.message ?? "Invalid input")
    }

    const { token, password } = parsed.data
    const result = await resetPassword(token, password)

    if (!result.success) {
      return error(result.error ?? "Password reset failed")
    }

    return success({ message: "Password reset successfully. You can now sign in with your new password." })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Password reset failed"
    return error(message)
  }
}
