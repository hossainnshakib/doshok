import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import crypto from "crypto"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return error("Unauthorized", 401)
    }

    const { id } = await params

    const abandoned = await prisma.abandonedCheckout.findUnique({ where: { id } })
    if (!abandoned) return error("Not found", 404)

    const existingActive = await prisma.recoveryCheckoutToken.findFirst({
      where: { abandonedCheckoutId: id, usedAt: null, expiresAt: { gt: new Date() } },
    })

    if (existingActive) {
      await prisma.recoveryCheckoutToken.delete({ where: { id: existingActive.id } })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const record = await prisma.recoveryCheckoutToken.create({
      data: {
        token,
        abandonedCheckoutId: id,
        expiresAt,
        createdByAdminId: session.user.id,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const recoveryUrl = `${baseUrl}/recover-checkout?token=${record.token}`

    return success({
      token: record.token,
      recoveryUrl,
      expiresAt: record.expiresAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error("POST /api/admin/abandoned/[id]/recovery-link error:", err)
    return error("Failed to generate recovery link")
  }
}
