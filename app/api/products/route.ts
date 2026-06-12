import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { productSchema } from "@/lib/validations"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pageType = searchParams.get("pageType")
  const status = searchParams.get("status")

  const where: Record<string, unknown> = {}
  if (pageType) where.pageType = pageType
  if (status) where.status = status

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      price: true,
    },
  })
  return success(products)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)

    const body = await request.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const { variants, specifications, sizeChartIds, ...productData } = parsed.data

    const product = await prisma.product.create({
      data: {
        ...productData,
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

    return success(product, 201)
  } catch {
    return error("Failed to create product")
  }
}
