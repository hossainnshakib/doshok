import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { courierMethodUpdateSchema, courierCredentialsMap } from "@/lib/validations"
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

    const methods = await prisma.courierProviderSetting.findMany({
      orderBy: { createdAt: "asc" },
    })

    const result = methods.map((m) => {
      let credentials: Record<string, string> = {}
      if (m.credentialsJson) {
        try {
          const decrypted = decrypt(m.credentialsJson, "courier")
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
        isDefault: m.isDefault,
        instructions: m.instructions,
        pickupName: m.pickupName,
        pickupPhone: m.pickupPhone,
        pickupAddress: m.pickupAddress,
        pickupCity: m.pickupCity,
        pickupZone: m.pickupZone,
        credentials: maskCredentials(credentials),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }
    })

    return success(result)
  } catch {
    return error("Failed to fetch courier methods")
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const body = await request.json()
    const parsed = courierMethodUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input")
    }

    const { provider, credentials, ...data } = parsed.data
    const existing = await prisma.courierProviderSetting.findUnique({
      where: { provider },
    })

    let credentialsJson: string | null = existing?.credentialsJson ?? null

    const credsSchema = courierCredentialsMap[provider]
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
      credentialsJson = encrypt(JSON.stringify(parsedCreds), "courier")
    } else if (existing && existing.credentialsJson) {
      const existingCreds = JSON.parse(decrypt(existing.credentialsJson, "courier"))
      const merged = { ...existingCreds }
      for (const [key, val] of Object.entries(parsedCreds)) {
        if (val && !val.startsWith("********")) {
          merged[key] = val
        }
      }
      credentialsJson = encrypt(JSON.stringify(merged), "courier")
    }

    if (data.isDefault) {
      await prisma.courierProviderSetting.updateMany({
        where: { isDefault: true, provider: { not: provider } },
        data: { isDefault: false },
      })
    }

    const method = await prisma.courierProviderSetting.upsert({
      where: { provider },
      update: {
        displayName: data.displayName,
        enabled: data.enabled,
        mode: data.mode,
        isDefault: data.isDefault,
        instructions: data.instructions || null,
        pickupName: data.pickupName || null,
        pickupPhone: data.pickupPhone || null,
        pickupAddress: data.pickupAddress || null,
        pickupCity: data.pickupCity || null,
        pickupZone: data.pickupZone || null,
        credentialsJson,
      },
      create: {
        provider,
        displayName: data.displayName,
        enabled: data.enabled,
        mode: data.mode,
        isDefault: data.isDefault,
        instructions: data.instructions || null,
        pickupName: data.pickupName || null,
        pickupPhone: data.pickupPhone || null,
        pickupAddress: data.pickupAddress || null,
        pickupCity: data.pickupCity || null,
        pickupZone: data.pickupZone || null,
        credentialsJson,
      },
    })

    return success({
      id: method.id,
      provider: method.provider,
      displayName: method.displayName,
      enabled: method.enabled,
      mode: method.mode,
      isDefault: method.isDefault,
      instructions: method.instructions,
      pickupName: method.pickupName,
      pickupPhone: method.pickupPhone,
      pickupAddress: method.pickupAddress,
      pickupCity: method.pickupCity,
      pickupZone: method.pickupZone,
    })
  } catch {
    return error("Failed to update courier method")
  }
}
