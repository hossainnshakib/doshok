import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { getCourierLogs } from "@/lib/courier"

export const dynamic = "force-dynamic"

interface LogEntry {
  id: string
  providerCode: string
  orderId: string | null
  action: string
  requestUrl: string | null
  requestMethod: string | null
  requestBody: object | null
  responseBody: object | null
  responseStatus: number | null
  errorMessage: string | null
  durationMs: number | null
  createdAt: Date
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const searchParams = request.nextUrl.searchParams
    const providerCode = searchParams.get("providerCode") ?? "pathao"
    const environment = searchParams.get("environment") ?? undefined
    const orderId = searchParams.get("orderId") ?? undefined
    const limit = parseInt(searchParams.get("limit") ?? "50")
    const offset = parseInt(searchParams.get("offset") ?? "0")

    const result = await getCourierLogs({
      providerCode,
      environment,
      orderId,
      limit,
      offset,
    })

    const logs = (result.logs as LogEntry[]).map((log) => ({
      id: log.id,
      providerCode: log.providerCode,
      environment: (log as { environment?: string }).environment ?? "sandbox",
      orderId: log.orderId,
      action: log.action,
      requestUrl: log.requestUrl,
      requestMethod: log.requestMethod,
      responseStatus: log.responseStatus,
      errorMessage: log.errorMessage,
      durationMs: log.durationMs,
      createdAt: log.createdAt,
      hasRequestBody: !!log.requestBody,
      hasResponseBody: !!log.responseBody,
    }))

    return success({ logs, total: result.total })
  } catch {
    return error("Failed to fetch courier logs")
  }
}
