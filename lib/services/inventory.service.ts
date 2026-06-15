import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export type StockSnapshot = {
  variantId: string
  productId: string
  currentStock: number
  reservedStock: number
  availableStock: number
  lowStockThreshold: number
  isLowStock: boolean
  isOutOfStock: boolean
}

export type MovementType =
  | "manual_adjustment"
  | "order_reserved"
  | "order_reservation_released"
  | "order_reservation_expired"
  | "order_confirmed_deducted"
  | "order_delivered_deducted"
  | "order_cancelled_restored"
  | "order_returned_restored"
  | "stock_correction"

export type StockMovementFilter = {
  productId?: string
  variantId?: string
  orderId?: string
  type?: string
  fromDate?: Date
  toDate?: Date
}

export async function getStockSnapshot(variantId: string): Promise<StockSnapshot | null> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      productId: true,
      stock: true,
      reservedStock: true,
      lowStockThreshold: true,
    },
  })

  if (!variant) return null

  const currentStock = variant.stock
  const reservedStock = variant.reservedStock
  const availableStock = Math.max(0, currentStock - reservedStock)
  const isLowStock = availableStock > 0 && availableStock <= variant.lowStockThreshold
  const isOutOfStock = availableStock === 0

  return {
    variantId: variant.id,
    productId: variant.productId,
    currentStock,
    reservedStock,
    availableStock,
    lowStockThreshold: variant.lowStockThreshold,
    isLowStock,
    isOutOfStock,
  }
}

export async function checkStockAvailability(
  variantId: string,
  quantity: number
): Promise<{ available: boolean; availableStock: number; message?: string }> {
  const snapshot = await getStockSnapshot(variantId)
  if (!snapshot) return { available: false, availableStock: 0, message: "Variant not found" }

  if (snapshot.availableStock < quantity) {
    return {
      available: false,
      availableStock: snapshot.availableStock,
      message: `Only ${snapshot.availableStock} available, requested ${quantity}`,
    }
  }

  return { available: true, availableStock: snapshot.availableStock }
}

export async function reserveStockForOrder(
  orderId: string,
  items: Array<{ variantId: string; productId: string; quantity: number; orderItemId: string }>,
  reason?: string
): Promise<{ success: boolean; error?: string; failedItems?: string[] }> {
  const failedItems: string[] = []

  for (const item of items) {
    if (!item.variantId) continue

    const snapshot = await getStockSnapshot(item.variantId)
    if (!snapshot) {
      failedItems.push(item.variantId)
      continue
    }

    if (snapshot.availableStock < item.quantity) {
      failedItems.push(item.variantId)
      continue
    }
  }

  if (failedItems.length > 0) {
    return { success: false, error: "Insufficient stock for some items", failedItems }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.variantId) continue

      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
      if (!variant) continue

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { reservedStock: { increment: item.quantity } },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          orderId,
          orderItemId: item.orderItemId,
          type: "order_reserved",
          quantity: item.quantity,
          beforeStock: variant.stock,
          afterStock: variant.stock,
          beforeReserved: variant.reservedStock,
          afterReserved: variant.reservedStock + item.quantity,
          reason: reason ?? "Order created",
        },
      })
    }
  })

  return { success: true }
}

export async function releaseStockForOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const movements = await prisma.stockMovement.findMany({
    where: { orderId, type: "order_reserved" },
    select: { variantId: true, quantity: true, productId: true },
  })

  if (movements.length === 0) {
    return { success: true }
  }

  const variantReleases = new Map<string, { productId: string; quantity: number }>()
  for (const m of movements) {
    if (!m.variantId) continue
    const existing = variantReleases.get(m.variantId)
    if (existing) {
      existing.quantity += m.quantity
    } else {
      variantReleases.set(m.variantId, { productId: m.productId, quantity: m.quantity })
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const [variantId, release] of variantReleases) {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } })
      if (!variant) continue

      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          reservedStock: { decrement: release.quantity },
        },
      })

      await tx.stockMovement.create({
        data: {
          productId: release.productId,
          variantId,
          orderId,
          type: "order_reservation_released",
          quantity: release.quantity,
          beforeStock: variant.stock,
          afterStock: variant.stock,
          beforeReserved: variant.reservedStock,
          afterReserved: Math.max(0, variant.reservedStock - release.quantity),
          reason: reason ?? "Order cancelled",
        },
      })
    }
  })

  return { success: true }
}

export async function finalizeStockDeductionForDeliveredOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const alreadyDelivered = await prisma.stockMovement.findFirst({
    where: { orderId, type: "order_delivered_deducted" },
    select: { id: true },
  })
  if (alreadyDelivered) return { success: true }

  const alreadyConfirmed = await prisma.stockMovement.findFirst({
    where: { orderId, type: "order_confirmed_deducted" },
    select: { id: true },
  })
  if (alreadyConfirmed) return { success: true }

  const reservedMovements = await prisma.stockMovement.findMany({
    where: { orderId, type: "order_reserved" },
    select: { variantId: true, quantity: true, productId: true },
  })

  if (reservedMovements.length === 0) {
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId, variantId: { not: null } },
      select: { variantId: true, quantity: true, productId: true },
    })

    if (orderItems.length === 0) return { success: true }

    await prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        if (!item.variantId) continue

        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant) continue

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            orderId,
            type: "order_delivered_deducted",
            quantity: item.quantity,
            beforeStock: variant.stock,
            afterStock: variant.stock - item.quantity,
            beforeReserved: variant.reservedStock,
            afterReserved: variant.reservedStock,
            reason: "Order delivered",
          },
        })
      }
    })

    return { success: true }
  }

  const variantDeductions = new Map<string, { productId: string; quantity: number }>()
  for (const m of reservedMovements) {
    if (!m.variantId) continue
    const existing = variantDeductions.get(m.variantId)
    if (existing) {
      existing.quantity += m.quantity
    } else {
      variantDeductions.set(m.variantId, { productId: m.productId, quantity: m.quantity })
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const [variantId, deduction] of variantDeductions) {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } })
      if (!variant) continue

      const newStock = variant.stock - deduction.quantity
      const newReserved = Math.max(0, variant.reservedStock - deduction.quantity)

      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          stock: newStock,
          reservedStock: newReserved,
        },
      })

      await tx.stockMovement.create({
        data: {
          productId: deduction.productId,
          variantId,
          orderId,
          type: "order_delivered_deducted",
          quantity: deduction.quantity,
          beforeStock: variant.stock,
          afterStock: newStock,
          beforeReserved: variant.reservedStock,
          afterReserved: newReserved,
          reason: "Order delivered",
        },
      })
    }
  })

  return { success: true }
}

export async function finalizeStockDeductionForConfirmedOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const alreadyDeducted = await prisma.stockMovement.findFirst({
    where: { orderId, type: "order_confirmed_deducted" },
  })

  if (alreadyDeducted) {
    return { success: true }
  }

  const reservedMovements = await prisma.stockMovement.findMany({
    where: { orderId, type: "order_reserved" },
    select: { variantId: true, quantity: true, productId: true },
  })

  const variantDeductions = new Map<string, { productId: string; quantity: number }>()
  for (const m of reservedMovements) {
    if (!m.variantId) continue
    const existing = variantDeductions.get(m.variantId)
    if (existing) {
      existing.quantity += m.quantity
    } else {
      variantDeductions.set(m.variantId, { productId: m.productId, quantity: m.quantity })
    }
  }

  if (variantDeductions.size === 0) {
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId, variantId: { not: null } },
      select: { variantId: true, quantity: true, productId: true },
    })

    if (orderItems.length === 0) return { success: true }

    await prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        if (!item.variantId) continue

        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant) continue

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            orderId,
            type: "order_confirmed_deducted",
            quantity: item.quantity,
            beforeStock: variant.stock,
            afterStock: variant.stock - item.quantity,
            beforeReserved: variant.reservedStock,
            afterReserved: variant.reservedStock,
            reason: "Order confirmed",
          },
        })
      }
    })

    return { success: true }
  }

  await prisma.$transaction(async (tx) => {
    for (const [variantId, deduction] of variantDeductions) {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } })
      if (!variant) continue

      const newStock = variant.stock - deduction.quantity
      const newReserved = Math.max(0, variant.reservedStock - deduction.quantity)

      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          stock: newStock,
          reservedStock: newReserved,
        },
      })

      await tx.stockMovement.create({
        data: {
          productId: deduction.productId,
          variantId,
          orderId,
          type: "order_confirmed_deducted",
          quantity: deduction.quantity,
          beforeStock: variant.stock,
          afterStock: newStock,
          beforeReserved: variant.reservedStock,
          afterReserved: newReserved,
          reason: "Order confirmed",
        },
      })
    }
  })

  return { success: true }
}

export async function restoreStockForCancelledOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  // Idempotency: check order.stockRestoredAt as shared guard
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { stockRestoredAt: true },
  })
  if (order?.stockRestoredAt) return { success: true }

  // Keep movement-based guard as secondary
  const alreadyRestored = await prisma.stockMovement.findFirst({
    where: { orderId, type: "order_cancelled_restored" },
  })
  if (alreadyRestored) return { success: true }

  const stockRestoredAt = new Date()
  const confirmedDeduction = await prisma.stockMovement.findFirst({
    where: { orderId, type: "order_confirmed_deducted" },
  })

  const reservedMovements = await prisma.stockMovement.findMany({
    where: { orderId, type: "order_reserved" },
    select: { variantId: true, quantity: true, productId: true },
  })

  if (confirmedDeduction) {
    // Order was confirmed/deducted — restore stock from deductions
    const deductedMovements = await prisma.stockMovement.findMany({
      where: { orderId, type: "order_confirmed_deducted" },
      select: { variantId: true, quantity: true, productId: true },
    })

    await prisma.$transaction(async (tx) => {
      const recheck = await tx.order.findUnique({
        where: { id: orderId },
        select: { stockRestoredAt: true },
      })
      if (recheck?.stockRestoredAt) return

      for (const m of deductedMovements) {
        if (!m.variantId) continue
        const variant = await tx.productVariant.findUnique({ where: { id: m.variantId } })
        if (!variant) continue

        await tx.productVariant.update({
          where: { id: m.variantId },
          data: { stock: { increment: m.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            productId: m.productId,
            variantId: m.variantId,
            orderId,
            type: "order_cancelled_restored",
            quantity: m.quantity,
            beforeStock: variant.stock,
            afterStock: variant.stock + m.quantity,
            beforeReserved: variant.reservedStock,
            afterReserved: variant.reservedStock,
            reason: "Order cancelled",
          },
        })
      }

      await tx.order.update({
        where: { id: orderId },
        data: { stockRestoredAt },
      })
    })
  } else if (reservedMovements.length > 0) {
    // Order was only reserved (pending) — release reserved stock, do NOT touch stock
    const variantReleases = new Map<string, { productId: string; quantity: number }>()
    for (const m of reservedMovements) {
      if (!m.variantId) continue
      const existing = variantReleases.get(m.variantId)
      if (existing) {
        existing.quantity += m.quantity
      } else {
        variantReleases.set(m.variantId, { productId: m.productId, quantity: m.quantity })
      }
    }

    await prisma.$transaction(async (tx) => {
      const recheck = await tx.order.findUnique({
        where: { id: orderId },
        select: { stockRestoredAt: true },
      })
      if (recheck?.stockRestoredAt) return

      for (const [variantId, release] of variantReleases) {
        const variant = await tx.productVariant.findUnique({ where: { id: variantId } })
        if (!variant) continue

        const newReserved = Math.max(0, variant.reservedStock - release.quantity)

        await tx.productVariant.update({
          where: { id: variantId },
          data: { reservedStock: newReserved },
        })

        await tx.stockMovement.create({
          data: {
            productId: release.productId,
            variantId,
            orderId,
            type: "order_cancelled_restored",
            quantity: release.quantity,
            beforeStock: variant.stock,
            afterStock: variant.stock,
            beforeReserved: variant.reservedStock,
            afterReserved: newReserved,
            reason: "Order cancelled (reservation released)",
          },
        })
      }

      await tx.order.update({
        where: { id: orderId },
        data: { stockRestoredAt },
      })
    })
  }

  return { success: true }
}

export async function restoreStockForReturnedOrder(
  orderId: string,
  items: Array<{ variantId: string; productId: string; quantity: number }>,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.variantId) continue

      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
      if (!variant) continue

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      })

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          orderId,
          type: "order_returned_restored",
          quantity: item.quantity,
          beforeStock: variant.stock,
          afterStock: variant.stock + item.quantity,
          beforeReserved: variant.reservedStock,
          afterReserved: variant.reservedStock,
          reason: reason ?? "Order returned",
        },
      })
    }
  })

  return { success: true }
}

export async function manualAdjustStock(
  variantId: string,
  quantity: number,
  reason: string,
  note?: string,
  createdById?: string
): Promise<{ success: boolean; error?: string }> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, productId: true, stock: true, reservedStock: true },
  })

  if (!variant) return { success: false, error: "Variant not found" }

  const newStock = variant.stock + quantity
  if (newStock < 0) {
    return { success: false, error: `Cannot reduce stock below 0. Current: ${variant.stock}, requested: ${Math.abs(quantity)}` }
  }

  if (newStock < variant.reservedStock) {
    return { success: false, error: `Cannot reduce stock below reserved amount (${variant.reservedStock}). Available: ${variant.stock - variant.reservedStock}` }
  }

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock },
    })

    await tx.stockMovement.create({
      data: {
        productId: variant.productId,
        variantId,
        type: "manual_adjustment",
        quantity,
        beforeStock: variant.stock,
        afterStock: newStock,
        beforeReserved: variant.reservedStock,
        afterReserved: variant.reservedStock,
        reason,
        note,
        createdById,
      },
    })
  })

  return { success: true }
}

export async function getLowStockItems(limit = 20): Promise<Array<{
  variantId: string
  productId: string
  productName: string
  productImage: string | null
  categoryName: string
  size: string
  color: string
  currentStock: number
  reservedStock: number
  availableStock: number
  lowStockThreshold: number
}>> {
  const candidateIds = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "ProductVariant"
    WHERE ("stock" - "reservedStock") <= "lowStockThreshold"
      AND "lowStockThreshold" > 0
    ORDER BY ("stock" - "reservedStock") ASC
    LIMIT ${limit}
  `

  if (candidateIds.length === 0) return []

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: candidateIds.map((v) => v.id) } },
    include: {
      product: {
        include: { category: true },
      },
    },
  })

  const idOrder = new Map(candidateIds.map((v, i) => [v.id, i]))
  variants.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

  return variants.map((v) => {
    const available = Math.max(0, v.stock - v.reservedStock)
    return {
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      productImage: v.product.images[0] ?? null,
      categoryName: v.product.category.name,
      size: v.size,
      color: v.color,
      currentStock: v.stock,
      reservedStock: v.reservedStock,
      availableStock: available,
      lowStockThreshold: v.lowStockThreshold,
    }
  })
}

export async function getStockMovements(filters: StockMovementFilter, limit = 50, offset = 0) {
  const where: Prisma.StockMovementWhereInput = {}

  if (filters.productId) where.productId = filters.productId
  if (filters.variantId) where.variantId = filters.variantId
  if (filters.orderId) where.orderId = filters.orderId
  if (filters.type) where.type = filters.type

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {}
    if (filters.fromDate) where.createdAt.gte = filters.fromDate
    if (filters.toDate) where.createdAt.lte = filters.toDate
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { name: true } },
        variant: { select: { size: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.stockMovement.count({ where }),
  ])

  return { movements, total }
}

export async function getAllStockOverview(limit = 100, offset = 0) {
  const variants = await prisma.productVariant.findMany({
    include: {
      product: {
        include: { category: true },
      },
    },
    orderBy: { product: { createdAt: "desc" } },
    take: limit,
    skip: offset,
  })

  return variants.map((v) => {
    const available = Math.max(0, v.stock - v.reservedStock)
    return {
      variantId: v.id,
      productId: v.productId,
      productName: v.product.name,
      productImage: v.product.images[0] ?? null,
      productSlug: v.product.slug,
      categoryName: v.product.category.name,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      sku: v.sku,
      currentStock: v.stock,
      reservedStock: v.reservedStock,
      availableStock: available,
      lowStockThreshold: v.lowStockThreshold,
      status: available === 0 ? "out_of_stock" : available <= v.lowStockThreshold ? "low_stock" : "in_stock",
    }
  })
}

export async function getInventoryStats() {
  const [totalVariants, lowStockCount, outOfStockCount, totalMovementsToday] = await Promise.all([
    prisma.productVariant.count(),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "ProductVariant"
      WHERE ("stock" - "reservedStock") <= "lowStockThreshold"
        AND "lowStockThreshold" > 0
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "ProductVariant"
      WHERE ("stock" - "reservedStock") <= 0
    `,
    prisma.stockMovement.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ])

  return {
    totalVariants,
    lowStockCount: Number(lowStockCount[0]?.count ?? 0),
    outOfStockCount: Number(outOfStockCount[0]?.count ?? 0),
    totalMovementsToday,
  }
}