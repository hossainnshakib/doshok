import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (!item) return error("Not found", 404)
  return success(item)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const body = await request.json()
    const { id } = await context.params
    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.url !== undefined && { url: body.url }),
        ...(body.target !== undefined && { target: body.target }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.order !== undefined && { order: body.order }),
      },
    })
    return success(item)
  } catch {
    return error("Failed to update menu item")
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const { id } = await context.params

    const children = await prisma.menuItem.count({ where: { parentId: id } })
    if (children > 0) {
      return error("Cannot delete menu item with children. Remove or reassign children first.", 400)
    }

    await prisma.menuItem.delete({ where: { id } })
    return success({ deleted: true })
  } catch {
    return error("Failed to delete menu item")
  }
}