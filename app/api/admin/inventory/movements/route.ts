import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { getStockMovements } from "@/lib/services/inventory.service"
import { requireAdminPermission } from "@/lib/auth/admin"

export async function GET(request: NextRequest) {
  const session = await requireAdminPermission("inventory")
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10))
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)
  const type = searchParams.get("type") ?? undefined

  const result = await getStockMovements(
    type ? { type } : {},
    limit,
    offset
  )

  return success(result)
}
