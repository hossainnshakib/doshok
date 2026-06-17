import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { mapPathaoStatus, getOrderStatusFromShipment, type PathaoWebhookPayload } from "@/lib/courier/status-map"
import { getPathaoWebhookSecret } from "@/lib/courier/webhook-verify"
import { sendOrderStatusEmail } from "@/lib/mailer"
import { applyInventorySideEffectsForOrderStatus } from "@/lib/services/inventory.service"
import type { ShipmentStatus } from "@/types"

export const dynamic = "force-dynamic"

async function verifyWebhook(request: NextRequest): Promise<boolean> {
  const secret = await getPathaoWebhookSecret()

  if (!secret) {
    return true
  }

  const signature = request.headers.get("x-pathao-signature")
  if (!signature) {
    return false
  }

  const body = await request.clone().text()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
  const expected = Buffer.from(sigBuffer).toString("base64")

  return signature === expected
}

function parsePayload(body: string): PathaoWebhookPayload | null {
  try {
    const raw = JSON.parse(body)
    if (typeof raw !== "object" || raw === null) return null
    return raw as PathaoWebhookPayload
  } catch {
    return null
  }
}

async function syncOrderStatus(
  order: {
    id: string
    orderNumber: string
    orderStatus: string
    customerName: string
    customerEmail: string
    customerPhone: string
    total: number
    subtotal: number
    deliveryFee: number
    paymentMethod: string
    items: { name: string; quantity: number; price: number; size: string | null; color: string | null }[]
  },
  shipmentStatus: ShipmentStatus
) {
  const newOrderStatus = getOrderStatusFromShipment(shipmentStatus)

  if (order.orderStatus === newOrderStatus) return

  await prisma.order.update({
    where: { id: order.id },
    data: { orderStatus: newOrderStatus },
  })

  const stockResult = await applyInventorySideEffectsForOrderStatus(order.id, newOrderStatus)
  if (!stockResult.success) {
    throw new Error(`Stock update failed: ${stockResult.error}`)
  }

  sendOrderStatusEmail(
    {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      total: order.total,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      paymentMethod: order.paymentMethod,
      orderStatus: newOrderStatus,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        size: i.size,
        color: i.color,
      })),
    },
    newOrderStatus
  ).catch(() => {})
}

export async function POST(request: NextRequest) {
  if (!(await verifyWebhook(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: string
  try {
    body = await request.text()
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 })
  }

  const payload = parsePayload(body)
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  if (!payload.order_id && !payload.tracking_code) {
    return NextResponse.json({ error: "Missing order_id or tracking_code" }, { status: 400 })
  }

  const trackingCode = typeof payload.tracking_code === "string"
    ? payload.tracking_code
    : payload.tracking_code !== undefined
      ? String(payload.tracking_code)
      : undefined

  const orderIdRaw = typeof payload.order_id === "number"
    ? String(payload.order_id)
    : payload.order_id

  const pathaoRawStatus = payload.status || "PENDING"
  const mappedStatus = mapPathaoStatus(pathaoRawStatus)

  let shipment = trackingCode
    ? await prisma.orderShipment.findFirst({
        where: { trackingCode, courierProvider: "PATHAO" },
      })
    : null

  if (!shipment && orderIdRaw) {
    const order = await prisma.order.findUnique({
      where: { orderNumber: String(orderIdRaw) },
      select: { id: true },
    })
    if (order) {
      shipment = await prisma.orderShipment.findUnique({
        where: { orderId: order.id },
      })
    }
  }

  if (!shipment) {
    console.warn("[pathao-webhook] No shipment found for:", { trackingCode, orderId: orderIdRaw })
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
  }

  if (shipment.status === mappedStatus) {
    return NextResponse.json({ success: true, message: "No change" }, { status: 200 })
  }

  const now = new Date()
  const courierPayloadJson = JSON.stringify(payload)

  const [updatedShipment] = await prisma.$transaction([
    prisma.orderShipment.update({
      where: { id: shipment.id },
      data: {
        status: mappedStatus,
        courierResponseJson: courierPayloadJson,
        lastCourierUpdate: now,
        lastCourierStatus: mappedStatus,
        lastCourierPayload: courierPayloadJson,
      },
      include: { order: { include: { items: true } } },
    }),
  ])

  try {
    await syncOrderStatus(updatedShipment.order, mappedStatus)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync order inventory"
    console.error("[pathao-webhook] Order status sync failed", {
      shipmentId: shipment.id,
      orderId: updatedShipment.orderId,
      status: mappedStatus,
      error: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  console.info("[pathao-webhook] Updated shipment", {
    shipmentId: shipment.id,
    orderId: updatedShipment.orderId,
    oldStatus: shipment.status,
    newStatus: mappedStatus,
  })

  return NextResponse.json({ success: true }, { status: 200 })
}

export async function GET() {
  return NextResponse.json({ status: "Pathao webhook endpoint active" }, { status: 200 })
}
