import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { productSchema } from "@/lib/validations"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

type SortOption = "newest" | "price-low" | "price-high"

const SORT_MAP: Record<SortOption, Record<string, "asc" | "desc">> = {
  newest: { createdAt: "desc" },
  "price-low": { price: "asc" },
  "price-high": { price: "desc" },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pageType = searchParams.get("pageType")
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const selector = searchParams.get("selector") === "true"
  const ids = searchParams.get("ids")
  const categoryId = searchParams.get("categoryId")

  const where: Record<string, unknown> = {}
  if (pageType) where.pageType = pageType
  if (status) where.status = status
  if (categoryId) where.categoryId = categoryId
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ]
  }
  if (ids) {
    where.id = { in: ids.split(",").filter(Boolean) }
  }
  if (selector && !status && !search && !ids) {
    where.status = "Active"
  }

  if (selector) {
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        oldPrice: true,
        images: true,
        status: true,
        variants: { select: { stock: true } },
      },
    })
    return success(products)
  }

  const sortParam = (searchParams.get("sort") as SortOption) || "newest"
  const orderBy = SORT_MAP[sortParam] || SORT_MAP.newest
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "24", 10) || 24))
  const skip = (page - 1) * limit

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return success({
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

    const body = await request.json()
    const { relatedProductIds, crossSellProductIds, upsellProductIds, landingPageSetting, ...restBody } = body

    const parsed = productSchema.safeParse(restBody)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const { variants, specifications, sizeChartIds, ...productData } = parsed.data

    const extraFields: Record<string, unknown> = {}
    if (body.paymentRuleOverride !== undefined) extraFields.paymentRuleOverride = body.paymentRuleOverride
    if (body.paymentRuleValueOverride !== undefined) extraFields.paymentRuleValueOverride = body.paymentRuleValueOverride

    const product = await prisma.product.create({
      data: {
        ...productData,
        ...extraFields,
        specifications: specifications ? {
          create: specifications.map((spec, index) => ({
            label: spec.label,
            value: spec.value,
            position: index,
          })),
        } : undefined,
        variants: {
          create: variants?.map((v) => ({
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            stock: v.stock,
            sku: v.sku,
          })) ?? [],
        },
        sizeCharts: sizeChartIds ? {
          create: sizeChartIds.map((sizeChartId) => ({ sizeChartId })),
        } : undefined,
      },
      include: { variants: true, category: true, specifications: true, sizeCharts: { include: { sizeChart: true } } },
    })

    if (landingPageSetting && typeof landingPageSetting === "object" && Object.keys(landingPageSetting).length > 0) {
      await prisma.landingPageSetting.create({
        data: { productId: product.id, ...landingPageSetting },
      })
    }

    const relationsToCreate: { relatedProductId: string; type: string; position: number }[] = []

    if (relatedProductIds && Array.isArray(relatedProductIds)) {
      relatedProductIds.forEach((rid: string, idx: number) => {
        if (rid !== product.id) relationsToCreate.push({ relatedProductId: rid, type: "RELATED", position: idx })
      })
    }
    if (crossSellProductIds && Array.isArray(crossSellProductIds)) {
      crossSellProductIds.forEach((rid: string, idx: number) => {
        if (rid !== product.id) relationsToCreate.push({ relatedProductId: rid, type: "CROSS_SELL", position: idx })
      })
    }
    if (upsellProductIds && Array.isArray(upsellProductIds)) {
      upsellProductIds.forEach((rid: string, idx: number) => {
        if (rid !== product.id) relationsToCreate.push({ relatedProductId: rid, type: "UPSELL", position: idx })
      })
    }

    if (relationsToCreate.length > 0) {
      await prisma.productRelation.createMany({
        data: relationsToCreate.map((r) => ({
          productId: product.id,
          relatedProductId: r.relatedProductId,
          type: r.type,
          position: r.position,
        })),
      })
    }

    return success({ ...product, relations: { RELATED: [], CROSS_SELL: [], UPSELL: [] } }, 201)
  } catch {
    return error("Failed to create product")
  }
}
