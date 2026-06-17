import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { sendOrderStatusEmail } from "@/lib/mailer"
import { ORDER_STATUSES } from "@/types"
import { applyInventorySideEffectsForOrderStatus } from "@/lib/services/inventory.service"

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

  if (order.userId !== session.user.id) {
    const adminSession = await requireAdminPermission("orders")
    if (adminSession instanceof NextResponse) return adminSession
  }

  return success(order)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminPermission("orders")
  if (session instanceof NextResponse) return session

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

    const allowedTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "shipped", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "returned"],
      delivered: ["returned"],
      cancelled: [],
      returned: [],
    }

    const newStatus = filtered.orderStatus as string
    if (newStatus && newStatus !== currentOrder.orderStatus) {
      const allowed = allowedTransitions[currentOrder.orderStatus]
      if (!allowed || !allowed.includes(newStatus)) {
        return error("Invalid order status transition")
      }
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

      const stockResult = await applyInventorySideEffectsForOrderStatus(id, filtered.orderStatus as string)
      if (!stockResult.success) {
        return error(`Stock update failed: ${stockResult.error}`)
      }
    }

    return success(order)
  } catch (err) {
    console.error(err)
    return error("Failed to update order")
  }
}
