import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("productId")
  const variantId = searchParams.get("variantId")
  const requestedQty = parseInt(searchParams.get("quantity") ?? "1", 10)

  if (!productId) return error("productId is required")

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true, name: true },
    })

    if (!product) return error("Product not found", 404)
    if (product.status !== "Active") {
      return error("This product is no longer available")
    }

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, stock: true, reservedStock: true, size: true, color: true },
      })

      if (!variant) return error("Variant not found")

      const availableStock = Math.max(0, variant.stock - variant.reservedStock)
      const canFulfill = availableStock >= requestedQty

      if (!canFulfill) {
        return error(
          availableStock === 0
            ? "This variant is out of stock"
            : `Only ${availableStock} available, requested ${requestedQty}`
        )
      }

      const cappedQty = Math.min(requestedQty, availableStock)
      return success({
        stock: variant.stock,
        reservedStock: variant.reservedStock,
        availableStock,
        requestedQuantity: requestedQty,
        canFulfill,
        capped: cappedQty,
        cappedMessage:
          cappedQty < requestedQty
            ? `Only ${availableStock} available. Added ${cappedQty} to cart.`
            : null,
      })
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId },
      select: { id: true, stock: true, reservedStock: true },
    })

    const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)
    const totalReserved = variants.reduce((sum, v) => sum + v.reservedStock, 0)
    const totalAvailable = Math.max(0, totalStock - totalReserved)

    if (totalAvailable === 0) {
      return error("This product is out of stock")
    }

    const canFulfill = totalAvailable >= requestedQty
    if (!canFulfill) {
      return error(`Only ${totalAvailable} available, requested ${requestedQty}`)
    }

    const cappedQty = Math.min(requestedQty, totalAvailable)
    return success({
      stock: totalStock,
      reservedStock: totalReserved,
      availableStock: totalAvailable,
      requestedQuantity: requestedQty,
      canFulfill,
      capped: cappedQty,
      cappedMessage:
        cappedQty < requestedQty
          ? `Only ${totalAvailable} available. Added ${cappedQty} to cart.`
          : null,
    })
  } catch {
    return error("Failed to check stock")
  }
}