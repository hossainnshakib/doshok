import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { productSchema } from "@/lib/validations"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pageType = searchParams.get("pageType")

  const where = pageType ? { pageType } : {}

  const products = await prisma.product.findMany({
    where,
    include: { variants: true, category: true },
    orderBy: { createdAt: "desc" },
  })
  return success(products)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const { variants, ...productData } = parsed.data

    const product = await prisma.product.create({
      data: {
        ...productData,
        variants: {
          create: variants?.map((v) => ({
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            stock: v.stock,
            sku: v.sku,
          })) ?? [],
        },
      },
      include: { variants: true, category: true },
    })

    return success(product, 201)
  } catch {
    return error("Failed to create product")
  }
}
