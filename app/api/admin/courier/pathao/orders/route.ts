import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { prisma } from "@/lib/prisma"
import { createOrder, refreshOrderStatus, getPathaoStatusLabel } from "@/lib/courier/pathao/orders"
import { getOrderConsignment } from "@/lib/courier"
import { z } from "zod"

export const dynamic = "force-dynamic"

const sendOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  storeId: z.string().min(1, "Store ID is required"),
  deliveryType: z.enum(["normal", "express", "partial"]).default("normal"),
  itemType: z.enum(["parcel", "document", "electronics", "food", "liquid", "fragile"]).default("parcel"),
  itemWeight: z.number().positive().max(50).default(0.5),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = sendOrderSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const { orderId, storeId, deliveryType, itemType, itemWeight } = parsed.data

    const existingConsignment = await getOrderConsignment(orderId)
    if (existingConsignment?.consignmentId) {
      return error("Order already sent to Pathao. Cannot create duplicate consignment.", 409)
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { address: true, items: true },
    })

    if (!order) {
      return error("Order not found", 404)
    }

    if (!order.customerName || !order.customerPhone || !order.address) {
      return error("Order must have customer name, phone, and address")
    }

    if (!order.address.thana || !order.address.district) {
      return error("Order address must have thana and district")
    }

    const recipientCity = order.address.district
    const recipientZone = order.address.thana

    const result = await createOrder(orderId, {
      storeId,
      recipient: {
        name: order.customerName,
        phone: order.customerPhone,
        address: order.address.fullAddress,
        city: recipientCity,
        zone: recipientZone,
      },
      deliveryType,
      itemType,
      itemQuantity: order.items.length,
      itemWeight,
      amountToCollect: order.total,
    })

    if (result.success && result.data) {
      return success({
        consignmentId: result.data.consignment_id,
        trackingCode: result.data.tracking_code,
        message: result.data.message,
      })
    }

    return error(result.message || "Failed to create order")
  } catch {
    return error("Failed to send order to Pathao")
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return error("Order ID is required")
    }

    const consignment = await getOrderConsignment(orderId)
    if (!consignment) {
      return error("No consignment found for this order", 404)
    }

    if (consignment.consignmentId) {
      const statusResult = await refreshOrderStatus(orderId)
      if (statusResult.success && statusResult.data) {
        return success({
          consignmentId: consignment.consignmentId,
          trackingCode: consignment.trackingCode,
          status: getPathaoStatusLabel(statusResult.data.status.id),
          statusId: statusResult.data.status.id,
          deliveryFee: statusResult.data.actual_delivery_fee,
          merchantReceivedAmount: statusResult.data.merchant_received_amount,
          updatedAt: statusResult.data.updated_at,
        })
      }
    }

    return success({
      consignmentId: consignment.consignmentId,
      trackingCode: consignment.trackingCode,
      status: getPathaoStatusLabel(consignment.courierStatus || "1"),
      statusId: consignment.courierStatus,
      deliveryFee: consignment.deliveryFee,
      message: consignment.courierMessage,
      syncedAt: consignment.syncedAt,
    })
  } catch {
    return error("Failed to get order status")
  }
}
