import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { ROLES } from "@/lib/permissions"

const ADMIN_ROLES = ROLES.filter((role) => role !== "customer")

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminPermission("settings")
    if (session instanceof NextResponse) return session

    if (session.user.role !== "super_admin") {
      return error("Only super_admin can manage admin users", 403)
    }

    const { id } = await params
    const body = await request.json()
    const { role, isActive } = body as {
      role?: string
      isActive?: boolean
    }

    const currentUserId = session.user.id

    if (role !== undefined) {
      if (!ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number])) {
        return error("Invalid role")
      }
    }

    const response = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id } })
      if (!target) return error("User not found", 404)
      if (target.role === "customer") return error("Cannot manage customer users", 403)

      if (isActive === false && id === currentUserId) {
        return error("Cannot deactivate yourself", 403)
      }

      if (role !== undefined && id === currentUserId && target.role === "super_admin" && role !== "super_admin") {
        return error("Cannot remove your own super_admin role", 403)
      }

      const demotesSuperAdmin = role !== undefined && target.role === "super_admin" && role !== "super_admin"
      const deactivatesSuperAdmin = isActive === false && target.role === "super_admin" && target.isActive
      if (demotesSuperAdmin || deactivatesSuperAdmin) {
        const activeSuperAdminCount = await tx.user.count({
          where: { role: "super_admin", isActive: true },
        })
        if (activeSuperAdminCount <= 1) {
          return error("Cannot demote or deactivate the last remaining super_admin", 403)
        }
      }

      const updateData: Record<string, unknown> = {}
      if (role !== undefined) updateData.role = role
      if (isActive !== undefined) updateData.isActive = isActive

      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      })

      return success(updated)
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })

    return response
  } catch {
    return error("Failed to update user")
  }
}
