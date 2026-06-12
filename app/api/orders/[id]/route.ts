import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { sendOrderStatusEmail } from "@/lib/mailer"
import { ORDER_STATUSES } from "@/types"
import {
  releaseStockForOrder,
  finalizeStockDeductionForConfirmedOrder,
  finalizeStockDeductionForDeliveredOrder,
  restoreStockForCancelledOrder,
} from "@/lib/services/inventory.service"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)

  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, address: true },
  })

  if (!order) return error("Not found", 404)

  if (session.user.role !== "admin" && order.userId !== session.user.id) {
    return error("Forbidden", 403)
  }

  return success(order)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return error("Unauthorized", 401)
  if (session.user.role !== "admin") return error("Forbidden", 403)

  const { id } = await params

  try {
    const body = await request.json()
    const allowed = ["orderStatus", "paymentStatus", "trackingCode", "adminNote"]
    const filtered: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) filtered[key] = body[key]
    }

    const currentOrder = await prisma.order.findUnique({ where: { id } })
    if (!currentOrder) return error("Order not found", 404)

    if (filtered.orderStatus && !ORDER_STATUSES.includes(filtered.orderStatus as any)) {
      return error("Invalid order status")
    }

    const shipmentSyncMap: Record<string, string> = {
      shipped: "DISPATCHED",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
      returned: "RETURNED",
    }

    if (filtered.orderStatus && shipmentSyncMap[filtered.orderStatus as string]) {
      const shipmentStatus = shipmentSyncMap[filtered.orderStatus as string]
      await prisma.orderShipment.upsert({
        where: { orderId: id },
        create: { orderId: id, status: shipmentStatus },
        update: { status: shipmentStatus },
      })
    }

    const order = await prisma.order.update({
      where: { id },
      data: filtered,
      include: { items: true, address: true },
    })

    if (
      filtered.orderStatus &&
      filtered.orderStatus !== currentOrder.orderStatus
    ) {
      const emailData = {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        total: order.total,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          size: i.size,
          color: i.color,
        })),
      }
      sendOrderStatusEmail(emailData, filtered.orderStatus as string).catch(() => {})

      if (filtered.orderStatus === "confirmed" || filtered.orderStatus === "processing") {
        finalizeStockDeductionForConfirmedOrder(id).catch((err) => {
          console.error("Failed to deduct stock on confirmation:", err)
        })
      }

      if (filtered.orderStatus === "cancelled") {
        restoreStockForCancelledOrder(id).catch((err) => {
          console.error("Failed to restore stock on cancellation:", err)
        })
      }

      if (filtered.orderStatus === "delivered") {
        finalizeStockDeductionForDeliveredOrder(id).catch((err) => {
          console.error("Failed to finalize stock on delivery:", err)
        })
      }
    }

    return success(order)
  } catch (err) {
    console.error(err)
    return error("Failed to update order")
  }
}
