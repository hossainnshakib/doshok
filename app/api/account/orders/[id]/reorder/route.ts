import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)
  if (session.user.role === "admin") return error("Admins cannot use customer reorder", 403)

  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { orderNumber: id },
    include: { items: true },
  })

  if (!order) return error("Order not found", 404)
  if (order.userId !== session.user.id) return error("Forbidden", 403)

  const productIds = [...new Set(order.items.map((i) => i.productId))]
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      status: true,
    },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const variantIds = order.items.map((i) => i.variantId).filter(Boolean) as string[]
  const variants = variantIds.length > 0
    ? await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
      })
    : []
  const variantMap = new Map(variants.map((v) => [v.id, v]))

  const reorderable: {
    productId: string
    variantId?: string
    name: string
    price: number
    size?: string
    color?: string
    colorHex?: string
    image?: string
    slug?: string
    quantity: number
  }[] = []

  const skipped: {
    productId: string
    variantId?: string
    name: string
    size?: string
    color?: string
    reason: string
  }[] = []

  for (const item of order.items) {
    const product = productMap.get(item.productId)

    if (!product) {
      skipped.push({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        name: item.name,
        size: item.size ?? undefined,
        color: item.color ?? undefined,
        reason: "Product no longer exists",
      })
      continue
    }

    if (product.status !== "Active") {
      skipped.push({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        name: product.name,
        size: item.size ?? undefined,
        color: item.color ?? undefined,
        reason: "Product is no longer available",
      })
      continue
    }

    if (item.variantId) {
      const variant = variantMap.get(item.variantId)

      if (!variant) {
        skipped.push({
          productId: item.productId,
          variantId: item.variantId,
          name: product.name,
          size: item.size ?? undefined,
          color: item.color ?? undefined,
          reason: "Variant no longer exists",
        })
        continue
      }

      const availableStock = Math.max(0, variant.stock - variant.reservedStock)
      if (availableStock < item.quantity) {
        skipped.push({
          productId: item.productId,
          variantId: item.variantId,
          name: product.name,
          size: variant.size,
          color: variant.color,
          reason: `Only ${availableStock} in stock (requested ${item.quantity})`,
        })
        continue
      }

      reorderable.push({
        productId: item.productId,
        variantId: item.variantId,
        name: product.name,
        price: product.price,
        size: variant.size,
        color: variant.color,
        colorHex: variant.colorHex ?? undefined,
        image: product.images[0] ?? undefined,
        slug: product.slug,
        quantity: item.quantity,
      })
    } else {
      reorderable.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        image: product.images[0] ?? undefined,
        slug: product.slug,
        quantity: item.quantity,
      })
    }
  }

  return success({
    note: "Prices and availability may have changed since your last order.",
    reorderable,
    skipped,
    orderNumber: order.orderNumber,
  })
}
