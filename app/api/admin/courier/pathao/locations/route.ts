import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { getLocalCities, getLocalZones, getLocalAreas } from "@/lib/courier/pathao/locations"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")
    const parentId = searchParams.get("parentId")

    if (type === "cities") {
      const cities = await getLocalCities()
      return success(cities)
    }

    if (type === "zones") {
      const zones = await getLocalZones(parentId ?? undefined)
      return success(zones)
    }

    if (type === "areas") {
      const areas = await getLocalAreas(parentId ?? undefined)
      return success(areas)
    }

    return error("Invalid type parameter. Use: cities, zones, areas")
  } catch {
    return error("Failed to fetch locations")
  }
}
