import { NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { getLocalStores } from "@/lib/courier/pathao/locations"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const stores = await getLocalStores()

    return success(stores)
  } catch {
    return error("Failed to fetch stores")
  }
}
