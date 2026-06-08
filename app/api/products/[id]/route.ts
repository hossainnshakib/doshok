import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { productSchema } from "@/lib/validations"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, category: true },
  })

  if (!product) return error("Not found", 404)
  return success(product)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const { variants, ...productData } = body

    if (variants) {
      await prisma.productVariant.deleteMany({ where: { productId: id } })
      await prisma.productVariant.createMany({
        data: variants.map((v: { size: string; color: string; colorHex?: string; stock: number; sku?: string }) => ({
          productId: id,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          stock: v.stock,
          sku: v.sku,
        })),
      })
    }

    const product = await prisma.product.update({
      where: { id },
      data: productData,
      include: { variants: true, category: true },
    })
    return success(product)
  } catch {
    return error("Failed to update product")
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.product.delete({ where: { id } })
    return success({ deleted: true })
  } catch {
    return error("Failed to delete product")
  }
}
