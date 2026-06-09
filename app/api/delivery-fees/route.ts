import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import type { DeliveryZone } from "@/types"

const ZONE_MAP: Record<DeliveryZone, string> = {
  chatto: "Inside Chattogram",
  dhaka: "Dhaka",
  outside: "Outside Dhaka",
}

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zone = searchParams.get("zone") as DeliveryZone | null

    if (zone && ZONE_MAP[zone]) {
      const deliveryZone = await prisma.deliveryZone.findUnique({
        where: { name: ZONE_MAP[zone] },
      })
      return success({ zone, fee: deliveryZone?.fee ?? 100 })
    }

    const allZones = await prisma.deliveryZone.findMany()
    const feeMap: Record<string, number> = {}
    for (const [key, name] of Object.entries(ZONE_MAP)) {
      const dbZone = allZones.find((z) => z.name === name)
      feeMap[key] = dbZone?.fee ?? 100
    }

    return success(feeMap)
  } catch {
    return error("Failed to fetch delivery fees")
  }
}