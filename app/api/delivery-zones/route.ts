import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { deliveryZoneCreateSchema } from "@/lib/validations"

export async function GET() {
  const session = await requireAdminPermission("operations")
  if (session instanceof NextResponse) return session

  const zones = await prisma.deliveryZone.findMany({ orderBy: { name: "asc" } })
  return success(zones)
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = deliveryZoneCreateSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input")
    }

    const zone = await prisma.deliveryZone.create({ data: parsed.data })
    return success(zone, 201)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A delivery zone with this name already exists")
    }
    return error("Failed to create delivery zone")
  }
}
