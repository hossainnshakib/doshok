import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: true,
      category: true,
      specifications: { orderBy: { position: "asc" } },
      sizeCharts: { include: { sizeChart: true } },
        relatedProducts: {
        include: {
          relatedProduct: {
            include: {
              variants: true,
              category: true,
            },
          },
        },
        orderBy: { position: "asc" },
      },
      targetRelations: {
        include: {
          product: {
            include: {
              variants: true,
              category: true,
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  })

  if (!product) return error("Not found", 404)
  if (product.status !== "Active") {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return error("Not found", 404)
  }

  const groupedRelations: Record<string, unknown[]> = {
    RELATED: [],
    CROSS_SELL: [],
    UPSELL: [],
  }

  product.relatedProducts.forEach((r) => {
    if (r.relatedProduct.status === "Active") {
      groupedRelations[r.type] = groupedRelations[r.type] || []
      groupedRelations[r.type].push(r.relatedProduct)
    }
  })

  product.targetRelations.forEach((r) => {
    if (r.product.status === "Active") {
      groupedRelations[r.type] = groupedRelations[r.type] || []
      groupedRelations[r.type].push(r.product)
    }
  })

  const { relatedProducts, targetRelations, ...productData } = product

  return success({ ...productData, relations: groupedRelations })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return session

    const body = await request.json()

    const { variants, specifications, sizeChartIds, relatedProductIds, crossSellProductIds, upsellProductIds, ...productData } = body
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { price: true, oldPrice: true },
    })

    if (!existingProduct) return error("Not found", 404)

    const nextPrice = typeof productData.price === "number" ? productData.price : existingProduct.price
    const nextOldPrice = productData.oldPrice === undefined ? existingProduct.oldPrice : productData.oldPrice
    if (typeof nextPrice !== "number" || nextPrice <= 0) {
      return error("Price must be a positive number")
    }
    if (nextOldPrice !== null && nextOldPrice !== undefined && nextOldPrice <= nextPrice) {
      return error("Compare price must be greater than the current price")
    }

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

    if (relatedProductIds !== undefined || crossSellProductIds !== undefined || upsellProductIds !== undefined) {
      await prisma.productRelation.deleteMany({ where: { productId: id } })

      const relationsToCreate: { relatedProductId: string; type: string; position: number }[] = []

      if (relatedProductIds && Array.isArray(relatedProductIds)) {
        relatedProductIds.forEach((rid: string, idx: number) => {
          if (rid !== id) {
            relationsToCreate.push({ relatedProductId: rid, type: "RELATED", position: idx })
          }
        })
      }
      if (crossSellProductIds && Array.isArray(crossSellProductIds)) {
        crossSellProductIds.forEach((rid: string, idx: number) => {
          if (rid !== id) {
            relationsToCreate.push({ relatedProductId: rid, type: "CROSS_SELL", position: idx })
          }
        })
      }
      if (upsellProductIds && Array.isArray(upsellProductIds)) {
        upsellProductIds.forEach((rid: string, idx: number) => {
          if (rid !== id) {
            relationsToCreate.push({ relatedProductId: rid, type: "UPSELL", position: idx })
          }
        })
      }

      if (relationsToCreate.length > 0) {
        await prisma.productRelation.createMany({
          data: relationsToCreate.map((r) => ({
            productId: id,
            relatedProductId: r.relatedProductId,
            type: r.type,
            position: r.position,
          })),
        })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: productData,
      include: {
        variants: true,
        category: true,
        specifications: { orderBy: { position: "asc" } },
        sizeCharts: { include: { sizeChart: true } },
        relatedProducts: {
          include: {
            relatedProduct: {
              include: { variants: true, category: true },
            },
          },
          orderBy: { position: "asc" },
        },
        targetRelations: {
          include: {
            product: {
              include: { variants: true, category: true },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    })

    const groupedRelations: Record<string, unknown[]> = {
      RELATED: [],
      CROSS_SELL: [],
      UPSELL: [],
    }
    product.relatedProducts.forEach((r) => {
      if (r.relatedProduct.status === "Active") {
        groupedRelations[r.type] = groupedRelations[r.type] || []
        groupedRelations[r.type].push(r.relatedProduct)
      }
    })
    product.targetRelations.forEach((r) => {
      if (r.product.status === "Active") {
        groupedRelations[r.type] = groupedRelations[r.type] || []
        groupedRelations[r.type].push(r.product)
      }
    })

    const { relatedProducts, targetRelations, ...productDataRest } = product
    revalidatePath("/", "page")
    return success({ ...productDataRest, relations: groupedRelations })
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
    const session = await requireAdminPermission("products")
    if (session instanceof NextResponse) return session

    await prisma.product.delete({ where: { id } })
    revalidatePath("/", "page")
    return success({ deleted: true })
  } catch {
    return error("Failed to delete product")
  }
}
