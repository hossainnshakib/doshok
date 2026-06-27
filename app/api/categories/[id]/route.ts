import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const { parentId, ...rest } = body

    if (parentId === id) {
      return error("A category cannot be its own parent.")
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...rest,
        parentId: parentId || null,
      },
    })
    revalidatePath("/", "page")
    return success(category)
  } catch {
    return error("Failed to update category")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return session

    const productCount = await prisma.product.count({ where: { categoryId: id } })
    if (productCount > 0) {
      return error(`Cannot delete category with ${productCount} product(s). Remove or reassign them first.`)
    }

    const childCount = await prisma.category.count({ where: { parentId: id } })
    if (childCount > 0) {
      return error(`Cannot delete category with ${childCount} sub-category(s). Remove or reassign them first.`)
    }

    await prisma.category.delete({ where: { id } })
    revalidatePath("/", "page")
    return success({ deleted: true })
  } catch {
    return error("Failed to delete category")
  }
}
