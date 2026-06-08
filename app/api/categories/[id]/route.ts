import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const category = await prisma.category.update({
      where: { id },
      data: body,
    })
    return success(category)
  } catch {
    return error("Failed to update category")
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const productCount = await prisma.product.count({ where: { categoryId: id } })
    if (productCount > 0) {
      return error(`Cannot delete category with ${productCount} product(s). Remove or reassign them first.`)
    }
    await prisma.category.delete({ where: { id } })
    return success({ deleted: true })
  } catch {
    return error("Failed to delete category")
  }
}
