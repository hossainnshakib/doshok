import { prisma } from "@/lib/prisma"

export type ReleaseResult = {
  processed: number
  skipped: number
  failed: number
  details: Array<{
    orderId: string
    orderNumber: string
    status: "released" | "skipped" | "failed"
    reason?: string
  }>
}

export type ReleaseByOrderResult = {
  released: boolean
  reason?: string
}

export async function releaseExpiredReservations(): Promise<ReleaseResult> {
  const result: ReleaseResult = { processed: 0, skipped: 0, failed: 0, details: [] }

  const expiredOrders = await prisma.order.findMany({
    where: {
      reservationExpiresAt: { lt: new Date() },
      stockRestoredAt: null,
      paymentStatus: { in: ["pending", "failed"] },
      orderStatus: "pending",
    },
    include: {
      items: {
        where: { OR: [{ variantId: { not: null } }, { landingPageItemId: { not: null } }] },
        select: { id: true, variantId: true, productId: true, quantity: true, landingPageItemId: true, landingPageItemVariantId: true },
      },
    },
  })

  for (const order of expiredOrders) {
    try {
      const releaseResult = await releaseExpiredReservationByOrderId(order.id)
      if (releaseResult.released) {
        result.processed++
        result.details.push({ orderId: order.id, orderNumber: order.orderNumber, status: "released" })
      } else {
        result.skipped++
        result.details.push({ orderId: order.id, orderNumber: order.orderNumber, status: "skipped", reason: releaseResult.reason })
      }
    } catch (err) {
      result.failed++
      result.details.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "failed",
        reason: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return result
}

export async function releaseExpiredReservationByOrderId(orderId: string): Promise<ReleaseByOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { OR: [{ variantId: { not: null } }, { landingPageItemId: { not: null } }] },
        select: { id: true, variantId: true, productId: true, quantity: true, landingPageItemId: true, landingPageItemVariantId: true },
      },
    },
  })

  if (!order) return { released: false, reason: "Order not found" }
  if (order.stockRestoredAt) return { released: false, reason: "Stock already restored" }
  if (order.paymentStatus === "paid") return { released: false, reason: "Order already paid" }
  if (!["pending", "failed"].includes(order.paymentStatus)) {
    return { released: false, reason: `Payment status is ${order.paymentStatus}` }
  }
  if (order.orderStatus !== "pending") return { released: false, reason: `Order status is ${order.orderStatus}` }

  const alreadyExpired = await prisma.stockMovement.findFirst({
    where: { orderId, type: "order_reservation_expired" },
    select: { id: true },
  })
  if (alreadyExpired) return { released: false, reason: "Reservation already expired" }

  const stockRestoredAt = new Date()
  let released = false

  await prisma.$transaction(async (tx) => {
    const recheck = await tx.order.findUnique({
      where: { id: orderId },
      select: { stockRestoredAt: true, paymentStatus: true, orderStatus: true },
    })

    if (recheck?.stockRestoredAt) return
    if (recheck?.paymentStatus === "paid") return
    if (recheck?.orderStatus !== "pending") return

    const alreadyExpiredRecheck = await tx.stockMovement.findFirst({
      where: { orderId, type: "order_reservation_expired" },
      select: { id: true },
    })
    if (alreadyExpiredRecheck) return

    for (const item of order.items) {
      if (item.landingPageItemId) {
        if (item.landingPageItemVariantId) {
          const variant = await tx.landingPageItemVariant.findUnique({ where: { id: item.landingPageItemVariantId } })
          if (!variant) continue

          const result = await tx.$executeRaw`
            UPDATE "LandingPageItemVariant"
            SET "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0)
            WHERE id = ${item.landingPageItemVariantId}
              AND "reservedStock" >= ${item.quantity}
          `

          if (result === 0) continue
        } else {
          const landingItem = await tx.landingPageItem.findUnique({ where: { id: item.landingPageItemId } })
          if (!landingItem) continue

          const result = await tx.$executeRaw`
            UPDATE "LandingPageItem"
            SET "reservedStock" = GREATEST("reservedStock" - ${item.quantity}, 0)
            WHERE id = ${item.landingPageItemId}
              AND "reservedStock" >= ${item.quantity}
          `

          if (result === 0) continue
        }

        continue
      }

      if (!item.variantId || !item.productId) continue

      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
      if (!variant) continue

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { reservedStock: { decrement: item.quantity } },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          orderId,
          orderItemId: item.id,
          type: "order_reservation_expired",
          quantity: item.quantity,
          beforeStock: variant.stock,
          afterStock: variant.stock,
          beforeReserved: variant.reservedStock,
          afterReserved: Math.max(0, variant.reservedStock - item.quantity),
          reason: "Reservation expired",
        },
      })
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        stockRestoredAt,
        orderStatus: "cancelled",
        paymentStatus: "cancelled",
        reservationExpiresAt: null,
      },
    })

    released = true
  })

  return { released, reason: released ? undefined : "Reservation not released" }
}
