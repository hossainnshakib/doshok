import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"

export async function GET() {
  const zones = await prisma.deliveryZone.findMany({ orderBy: { name: "asc" } })
  return success(zones)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const body = await request.json()
    const zone = await prisma.deliveryZone.create({ data: body })
    return success(zone, 201)
  } catch {
    return error("Failed to create delivery zone")
  }
}
