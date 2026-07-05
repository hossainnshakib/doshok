import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { syncAllCities, syncZonesForCity, syncAreasForZone, syncAllStores } from "@/lib/courier/pathao/locations"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const { action } = body

    if (action === "sync_stores") {
      const result = await syncAllStores()
      if (result.errors.length > 0 && result.synced === 0) {
        return error(`Sync stores failed: ${result.errors.join("; ")}`)
      }
      return success(result)
    }

    if (action === "sync_cities") {
      const result = await syncAllCities()
      if (result.errors.length > 0 && result.synced === 0) {
        return error(`Sync cities failed: ${result.errors.join("; ")}`)
      }
      return success(result)
    }

    if (action === "sync_zones") {
      const { cityId } = body
      if (!cityId) {
        return error("cityId is required for sync_zones")
      }
      const result = await syncZonesForCity(cityId)
      if (result.errors.length > 0 && result.synced === 0) {
        return error(`Sync zones failed: ${result.errors.join("; ")}`)
      }
      return success(result)
    }

    if (action === "sync_areas") {
      const { zoneId } = body
      if (!zoneId) {
        return error("zoneId is required for sync_areas")
      }
      const result = await syncAreasForZone(zoneId)
      if (result.errors.length > 0 && result.synced === 0) {
        return error(`Sync areas failed: ${result.errors.join("; ")}`)
      }
      return success(result)
    }

    return error("Invalid action")
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Pathao Sync] Failed:", message)
    return error(`Failed to sync: ${message}`)
  }
}
