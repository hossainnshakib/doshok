import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { shipmentCreateSchema, shipmentUpdateSchema } from "@/lib/validations"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)

    const { id } = await params

    const shipment = await prisma.orderShipment.findUnique({
      where: { orderId: id },
    })

    return success(shipment)
  } catch {
    return error("Failed to fetch shipment")
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)

    const { id } = await params
    const body = await request.json()
    const parsed = shipmentCreateSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input")
    }

    const existing = await prisma.orderShipment.findUnique({
      where: { orderId: id },
    })
    if (existing) {
      return error("Shipment already exists for this order")
    }

    const order = await prisma.order.findUnique({
      where: { id },
    })
    if (!order) return error("Order not found", 404)

    const shipment = await prisma.orderShipment.create({
      data: {
        orderId: id,
        courierProvider: parsed.data.courierProvider,
        status: "SETUP_READY",
        customerNote: parsed.data.customerNote || null,
        adminNote: parsed.data.adminNote || null,
      },
    })

    return success(shipment)
  } catch {
    return error("Failed to create shipment")
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)

    const { id } = await params
    const body = await request.json()
    const parsed = shipmentUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input")
    }

    const existing = await prisma.orderShipment.findUnique({
      where: { orderId: id },
    })
    if (!existing) return error("No shipment found for this order", 404)

    const shipment = await prisma.orderShipment.update({
      where: { orderId: id },
      data: parsed.data,
    })

    return success(shipment)
  } catch {
    return error("Failed to update shipment")
  }
}
