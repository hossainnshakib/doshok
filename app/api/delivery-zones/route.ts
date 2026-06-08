import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function GET() {
  const zones = await prisma.deliveryZone.findMany({ orderBy: { name: "asc" } })
  return success(zones)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const zone = await prisma.deliveryZone.create({ data: body })
    return success(zone, 201)
  } catch {
    return error("Failed to create delivery zone")
  }
}
