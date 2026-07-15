import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { deleteCourierDataByEnvironment } from "@/lib/courier"
import { PATHAO_PROVIDER_CODE } from "@/lib/courier/pathao/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

const cleanupSchema = z.object({
  environment: z.enum(["sandbox", "live"]),
  deleteTokens: z.boolean().default(true),
  deleteStores: z.boolean().default(true),
  deleteLocations: z.boolean().default(true),
  deleteLogs: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = cleanupSchema.safeParse(body)

    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const { environment, ...options } = parsed.data

    const results = await deleteCourierDataByEnvironment(PATHAO_PROVIDER_CODE, environment, options)

    return success({
      message: `Cleanup completed for ${environment} environment`,
      ...results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Pathao Cleanup] Failed:", message)
    return error(`Failed to cleanup: ${message}`)
  }
}
