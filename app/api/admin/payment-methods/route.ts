import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { paymentMethodUpdateSchema, providerCredentialsMap } from "@/lib/validations"
import { encrypt, decrypt } from "@/lib/encryption"

export const dynamic = "force-dynamic"

function maskCredentials(creds: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {}
  for (const [key, val] of Object.entries(creds)) {
    masked[key] = val ? "********" : ""
  }
  return masked
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const methods = await prisma.paymentMethodSetting.findMany({
      orderBy: { createdAt: "asc" },
    })

    const result = methods.map((m) => {
      let credentials: Record<string, string> = {}
      if (m.credentialsJson) {
        try {
          const decrypted = decrypt(m.credentialsJson, "payment")
          credentials = JSON.parse(decrypted)
        } catch {
          credentials = {}
        }
      }

      return {
        id: m.id,
        provider: m.provider,
        displayName: m.displayName,
        enabled: m.enabled,
        mode: m.mode,
        supportsFullPayment: m.supportsFullPayment,
        supportsPartialPayment: m.supportsPartialPayment,
        supportsCodDeliveryCharge: m.supportsCodDeliveryCharge,
        instructions: m.instructions,
        credentials: maskCredentials(credentials),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }
    })

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

    const { provider, credentials, ...data } = parsed.data
    const existing = await prisma.paymentMethodSetting.findUnique({
      where: { provider },
    })

    let credentialsJson: string | null = existing?.credentialsJson ?? null

    const credsSchema = providerCredentialsMap[provider]
    let parsedCreds: Record<string, string> = {}
    if (credsSchema) {
      const credResult = credsSchema.safeParse(credentials ?? {})
      if (credResult.success) {
        parsedCreds = credResult.data as Record<string, string>
      } else {
        parsedCreds = (credentials ?? {}) as Record<string, string>
      }
    }

    const hasNewValues = Object.values(parsedCreds).some((v) => v && !v.startsWith("********"))
    if (hasNewValues) {
      credentialsJson = encrypt(JSON.stringify(parsedCreds), "payment")
    } else if (existing && existing.credentialsJson) {
      const existingCreds = JSON.parse(decrypt(existing.credentialsJson, "payment"))
      const merged = { ...existingCreds }
      for (const [key, val] of Object.entries(parsedCreds)) {
        if (val && !val.startsWith("********")) {
          merged[key] = val
        }
      }
      credentialsJson = encrypt(JSON.stringify(merged), "payment")
    }

    const method = await prisma.paymentMethodSetting.upsert({
      where: { provider },
      update: {
        displayName: data.displayName,
        enabled: data.enabled,
        mode: data.mode,
        supportsFullPayment: data.supportsFullPayment,
        supportsPartialPayment: data.supportsPartialPayment,
        supportsCodDeliveryCharge: data.supportsCodDeliveryCharge,
        instructions: data.instructions || null,
        credentialsJson,
      },
      create: {
        provider,
        displayName: data.displayName,
        enabled: data.enabled,
        mode: data.mode,
        supportsFullPayment: data.supportsFullPayment,
        supportsPartialPayment: data.supportsPartialPayment,
        supportsCodDeliveryCharge: data.supportsCodDeliveryCharge,
        instructions: data.instructions || null,
        credentialsJson,
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
      credentials: parsedCreds,
    })
  } catch {
    return error("Failed to update payment method")
  }
}
