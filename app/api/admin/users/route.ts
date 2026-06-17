import { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { ROLES } from "@/lib/permissions"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission("settings")
    if (session instanceof NextResponse) return session

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {
      role: { not: "customer" },
    }
    if (role && ROLES.includes(role as typeof ROLES[number])) {
      where.role = role === "customer" ? { not: "customer" } : role
    }
    if (status === "active") where.isActive = true
    if (status === "inactive") where.isActive = false

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return success(users)
  } catch {
    return error("Failed to fetch users")
  }
}
