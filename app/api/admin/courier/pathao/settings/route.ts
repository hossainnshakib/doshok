import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { getCourierProviderByCode, upsertCourierProvider, getCourierToken } from "@/lib/courier"
import { issueAccessToken } from "@/lib/courier/pathao/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

const pathaoCredentialsSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  defaultStoreId: z.string().optional(),
})

const pathaoSettingsSchema = z.object({
  environment: z.enum(["sandbox", "live"]).default("sandbox"),
  isActive: z.boolean().default(false),
  credentials: pathaoCredentialsSchema,
})

export async function GET() {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const provider = await getCourierProviderByCode("pathao")

    if (!provider) {
      return success({
        code: "pathao",
        name: "Pathao",
        environment: "sandbox",
        isActive: false,
        credentials: null,
        tokenStatus: null,
      })
    }

    const token = await getCourierToken("pathao")
    let tokenStatus: { valid: boolean; expiresAt?: string } | null = null

    if (token) {
      const isExpired = new Date(token.expiresAt) < new Date()
      tokenStatus = {
        valid: !isExpired,
        expiresAt: token.expiresAt.toISOString(),
      }
    }

    const safeCredentials = provider.credentials ? {
      hasClientId: !!provider.credentials.clientId,
      hasClientSecret: !!provider.credentials.clientSecret,
      hasUsername: !!provider.credentials.username,
      hasPassword: !!provider.credentials.password,
      hasDefaultStoreId: !!provider.credentials.defaultStoreId,
    } : null

    return success({
      code: provider.code,
      name: provider.name,
      environment: provider.environment,
      isActive: provider.isActive,
      credentials: safeCredentials,
      tokenStatus,
    })
  } catch {
    return error("Failed to fetch Pathao settings")
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = pathaoSettingsSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => i.message).join("; ")
      console.error("[Pathao Settings] Validation failed:", issues)
      return error(`Validation failed: ${issues}`, 400)
    }

    const { environment, isActive, credentials } = parsed.data

    const existingProvider = await getCourierProviderByCode("pathao")
    const existingCreds = existingProvider?.credentials as { clientId?: string; clientSecret?: string; username?: string; password?: string; defaultStoreId?: string } | null

    const newCredentials = {
      clientId: credentials.clientId || existingCreds?.clientId || undefined,
      clientSecret: credentials.clientSecret || existingCreds?.clientSecret || undefined,
      username: credentials.username || existingCreds?.username || undefined,
      password: credentials.password || existingCreds?.password || undefined,
      defaultStoreId: credentials.defaultStoreId || existingCreds?.defaultStoreId || undefined,
    }

    if (!newCredentials.clientId || !newCredentials.clientSecret || !newCredentials.username || !newCredentials.password) {
      return error("All credential fields (clientId, clientSecret, username, password) are required. Please fill in all four fields.", 400)
    }

    console.info("[Pathao Settings] Saving credentials for environment:", environment)

    await upsertCourierProvider({
      code: "pathao",
      name: "Pathao",
      environment,
      isActive,
      credentials: newCredentials,
    })

    return success({ message: "Pathao settings saved" })
  } catch (err) {
    console.error("[Pathao Settings] Save failed:", err)
    return error("Failed to save Pathao settings")
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    if (body.action === "test_connection") {
      const result = await issueAccessToken()
      if (result.success) {
        return success({ message: "Connection successful", expiresAt: result.expiresAt?.toISOString() })
      }
      const errorMessage = result.message || "Connection failed"
      console.error("[Pathao Settings] Test connection failed:", errorMessage, "Code:", result.code)
      return error(errorMessage)
    }

    return error("Invalid action")
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Pathao Settings] Action failed:", message)
    return error(`Failed to perform action: ${message}`)
  }
}
