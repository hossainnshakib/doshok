import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { paymentMethodUpdateSchema } from "@/lib/validations"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const methods = await prisma.paymentMethodSetting.findMany({
      orderBy: { createdAt: "asc" },
    })

    const result = methods.map((m) => ({
      id: m.id,
      provider: m.provider,
      displayName: m.displayName,
      enabled: m.enabled,
      mode: m.mode,
      supportsFullPayment: m.supportsFullPayment,
      supportsPartialPayment: m.supportsPartialPayment,
      supportsCodDeliveryCharge: m.supportsCodDeliveryCharge,
      instructions: m.instructions,
      credentials: {},
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }))

    return success(result)
  } catch {
    return error("Failed to fetch payment methods")
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const body = await request.json()
    const parsed = paymentMethodUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input")
    }

    const { provider, ...data } = parsed.data

    const method = await prisma.paymentMethodSetting.upsert({
      where: { provider },
      update: {
        displayName: data.displayName,
        enabled: data.enabled,
        instructions: data.instructions || null,
      },
      create: {
        provider,
        displayName: data.displayName,
        enabled: data.enabled,
        instructions: data.instructions || null,
      },
    })

    return success({
      id: method.id,
      provider: method.provider,
      displayName: method.displayName,
      enabled: method.enabled,
      mode: method.mode,
      supportsFullPayment: method.supportsFullPayment,
      supportsPartialPayment: method.supportsPartialPayment,
      supportsCodDeliveryCharge: method.supportsCodDeliveryCharge,
      instructions: method.instructions,
    })
  } catch {
    return error("Failed to update payment method")
  }
}
