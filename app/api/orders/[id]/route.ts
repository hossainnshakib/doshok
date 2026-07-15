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

  const userId = session.user.id
  const { id } = await params

  try {
    const body = await request.json()
    const allowed = ["orderStatus", "paymentStatus", "trackingCode", "adminNote"]
    const filtered: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) filtered[key] = body[key]
    }

    const currentOrder = await prisma.order.findUnique({ where: { id } })
    if (!currentOrder) {
      console.error(`[OrderUpdate] Order not found: ${id}, user: ${userId}`)
      return error("Order not found", 404)
    }

    if (filtered.orderStatus && !(ORDER_STATUSES as readonly string[]).includes(filtered.orderStatus as string)) {
      const invalidStatus = filtered.orderStatus
      console.error(`[OrderUpdate] Invalid order status: "${invalidStatus}", order: ${id}, user: ${userId}`)
      return error(`Invalid order status: "${invalidStatus}". Valid values: ${ORDER_STATUSES.join(", ")}`)
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "shipped", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "returned", "cancelled"],
      delivered: ["returned"],
      cancelled: [],
      returned: [],
    }

    const newStatus = filtered.orderStatus as string | undefined
    if (newStatus && newStatus !== currentOrder.orderStatus) {
      const allowed = allowedTransitions[currentOrder.orderStatus]
      if (!allowed || !allowed.includes(newStatus)) {
        const current = currentOrder.orderStatus
        console.error(`[OrderUpdate] Invalid transition: ${current} -> ${newStatus}, order: ${id}, user: ${userId}`)
        return error(`Cannot change order status from "${current}" to "${newStatus}". Allowed transitions from "${current}": ${allowed?.join(", ") || "none"}`)
      }
    }

    if (
      filtered.orderStatus &&
      filtered.orderStatus !== currentOrder.orderStatus
    ) {
      const stockResult = await applyInventorySideEffectsForOrderStatus(id, filtered.orderStatus as string)
      if (!stockResult.success) {
        console.error(`[OrderUpdate] Stock update failed: ${stockResult.error}, order: ${id}, user: ${userId}`)
        return error(`Stock update failed: ${stockResult.error}`)
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: filtered,
      include: { items: true, address: true },
    })

    console.info(`[OrderUpdate] Success: order ${id}, status: ${order.orderStatus}, paymentStatus: ${order.paymentStatus}, user: ${userId}`)

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
    }

    return success(order)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error(`[OrderUpdate] Unexpected error: ${errMsg}, order: ${id}, user: ${userId}, stack: ${err instanceof Error ? err.stack : ""}`)
    return error(`Failed to update order: ${errMsg}`)
  }
}
