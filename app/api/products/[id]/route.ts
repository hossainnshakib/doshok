import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { productSchema } from "@/lib/validations"
import { auth } from "@/lib/auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, category: true, specifications: { orderBy: { position: "asc" } }, sizeCharts: { include: { sizeChart: true } } },
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
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)

    const body = await request.json()

    const { variants, specifications, sizeChartIds, ...productData } = body

    if (variants && Array.isArray(variants)) {
      const existingVariants = await prisma.productVariant.findMany({
        where: { productId: id },
        select: { id: true, size: true, color: true },
      })
      const existingMap = new Map(
        existingVariants.map((v) => [`${v.size}::${v.color}`, v.id])
      )

      const upsertOps = variants.map(
        (v: { id?: string; size: string; color: string; colorHex?: string; stock: number; sku?: string; lowStockThreshold?: number }) => {
          const key = `${v.size}::${v.color}`
          const existingId = existingMap.get(key)
          return prisma.productVariant.upsert({
            where: existingId ? { id: existingId } : { id: "__never_match__" },
            create: {
              productId: id,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              stock: v.stock,
              sku: v.sku ?? null,
              lowStockThreshold: v.lowStockThreshold ?? 5,
            },
            update: {
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? null,
              stock: v.stock,
              sku: v.sku ?? null,
              lowStockThreshold: v.lowStockThreshold ?? 5,
            },
          })
        }
      )

      await prisma.$transaction(upsertOps)

      const submittedKeys = new Set(variants.map((v: { size: string; color: string }) => `${v.size}::${v.color}`))
      const toDelete = existingVariants.filter((v) => !submittedKeys.has(`${v.size}::${v.color}`))
      if (toDelete.length > 0) {
        await prisma.productVariant.deleteMany({
          where: { id: { in: toDelete.map((v) => v.id) } },
        })
      }
    }

    if (specifications !== undefined) {
      await prisma.productSpecification.deleteMany({ where: { productId: id } })
      if (specifications && specifications.length > 0) {
        await prisma.productSpecification.createMany({
          data: specifications.map((spec: { label: string; value: string }, index: number) => ({
            productId: id,
            label: spec.label,
            value: spec.value,
            position: index,
          })),
        })
      }
    }

    if (sizeChartIds !== undefined) {
      await prisma.productSizeChart.deleteMany({ where: { productId: id } })
      if (sizeChartIds && sizeChartIds.length > 0) {
        await prisma.productSizeChart.createMany({
          data: sizeChartIds.map((sizeChartId: string) => ({
            productId: id,
            sizeChartId,
          })),
        })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: productData,
      include: { variants: true, category: true, specifications: { orderBy: { position: "asc" } }, sizeCharts: { include: { sizeChart: true } } },
    })
    return success(product)
  } catch {
    return error("Failed to update product")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)

    await prisma.product.delete({ where: { id } })
    return success({ deleted: true })
  } catch {
    return error("Failed to delete product")
  }
}
