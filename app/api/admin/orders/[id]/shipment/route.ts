import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { shipmentCreateSchema, shipmentUpdateSchema } from "@/lib/validations"
import { createPathaoParcel } from "@/lib/courier/pathao"
import { createSteadfastParcel, type OrderForSteadfast } from "@/lib/courier/steadfast"
import { createRedxParcel, type OrderForRedx } from "@/lib/courier/redx"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

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
    if (session.user.role !== "admin") return error("Forbidden", 403)

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
      if (existing.consignmentId) {
        return error("A parcel has already been created for this order. Create a new shipment instead.")
      }
      return error("Shipment record already exists for this order. Remove it first to create a new one.")
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, address: true },
    })
    if (!order) return error("Order not found", 404)

    const isPathao = parsed.data.courierProvider === "PATHAO"

    if (isPathao) {
      const orderForParcel = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: order.total,
        paidAmount: order.paidAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        items: order.items,
        address: order.address,
      }

      const parcelResult = await createPathaoParcel(
        id,
        orderForParcel,
        parsed.data.cityId || undefined,
        parsed.data.areaId || undefined
      )

      if (!parcelResult.success) {
        return error(parcelResult.reason, 400)
      }

      const [shipment] = await prisma.$transaction([
        prisma.orderShipment.create({
          data: {
            orderId: id,
            courierProvider: "PATHAO",
            status: "PENDING",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            customerNote: parsed.data.customerNote || null,
            adminNote: parsed.data.adminNote || null,
          },
        }),
        prisma.order.update({
          where: { id },
          data: { orderStatus: "processing" },
        }),
      ])

      return success(shipment)
    }

    const isSteadfast = parsed.data.courierProvider === "STEADFAST"

    if (isSteadfast) {
      const orderForSteadfast: OrderForSteadfast = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: order.total,
        paidAmount: order.paidAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        items: order.items,
        address: order.address,
      }

      const parcelResult = await createSteadfastParcel(orderForSteadfast)

      if (!parcelResult.success) {
        return error(parcelResult.reason, 400)
      }

      const [shipment] = await prisma.$transaction([
        prisma.orderShipment.create({
          data: {
            orderId: id,
            courierProvider: "STEADFAST",
            status: "PENDING",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            customerNote: parsed.data.customerNote || null,
            adminNote: parsed.data.adminNote || null,
          },
        }),
        prisma.order.update({
          where: { id },
          data: { orderStatus: "processing" },
        }),
      ])

      return success(shipment)
    }

    const isRedx = parsed.data.courierProvider === "REDX"

    if (isRedx) {
      const orderForRedx: OrderForRedx = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: order.total,
        paidAmount: order.paidAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        items: order.items,
        address: order.address,
      }

      const parcelResult = await createRedxParcel(orderForRedx)

      if (!parcelResult.success) {
        return error(parcelResult.reason, 400)
      }

      const [shipment] = await prisma.$transaction([
        prisma.orderShipment.create({
          data: {
            orderId: id,
            courierProvider: "REDX",
            status: "PENDING",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            customerNote: parsed.data.customerNote || null,
            adminNote: parsed.data.adminNote || null,
          },
        }),
        prisma.order.update({
          where: { id },
          data: { orderStatus: "processing" },
        }),
      ])

      return success(shipment)
    }

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create shipment"
    return error(msg)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return error("Unauthorized", 401)
    if (session.user.role !== "admin") return error("Forbidden", 403)

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

    const updateData: Record<string, unknown> = {}
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.trackingCode !== undefined) updateData.trackingCode = parsed.data.trackingCode
    if (parsed.data.consignmentId !== undefined) updateData.consignmentId = parsed.data.consignmentId
    if (parsed.data.customerNote !== undefined) updateData.customerNote = parsed.data.customerNote
    if (parsed.data.adminNote !== undefined) updateData.adminNote = parsed.data.adminNote

    const shipment = await prisma.orderShipment.update({
      where: { orderId: id },
      data: updateData,
    })

    return success(shipment)
  } catch {
    return error("Failed to update shipment")
  }
}