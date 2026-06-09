import { NextRequest } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations"
import { success, error } from "@/lib/api-response"
import { createAndSendVerificationToken } from "@/lib/email-verification"
import { rateLimitByIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const { limited } = rateLimitByIp(request, 5, 10 * 60 * 1000)
    if (limited) return error("Too many registration attempts. Please try again later.", 429)

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return error(firstIssue?.message ?? "Invalid input")
    }

    const { firstName, lastName, email, password } = parsed.data

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    })

    if (existing) {
      return error("An account with this email already exists")
    }

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "customer",
        status: "active",
      },
    })

    await createAndSendVerificationToken(email.toLowerCase(), user.id)

    return success({ message: "Account created successfully. Check your email to verify your account." }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create account"
    return error(message)
  }
}
