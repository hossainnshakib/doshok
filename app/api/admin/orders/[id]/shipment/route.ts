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

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, address: true },
    })
    if (!order) return error("Order not found", 404)

    if (order.orderStatus === "cancelled") {
      return error("Cannot create shipment for a cancelled order")
    }
    if (order.orderStatus === "returned") {
      return error("Cannot create shipment for a returned order")
    }
    if (order.paymentStatus === "refunded") {
      return error("Cannot create shipment for a refunded order")
    }
    if (!order.address) {
      return error("Order has no delivery address. Please set an address first.")
    }
    if (!order.address.fullAddress || !order.address.division) {
      return error("Order address is incomplete. Please update the delivery address.")
    }
    if (!order.customerPhone) {
      return error("Customer phone number is missing. Please update the order.")
    }

    const collectionAmount = order.dueAmount > 0 ? order.dueAmount : 0

    const provider = parsed.data.courierProvider

    const setting = await prisma.courierProviderSetting.findUnique({
      where: { provider },
    })
    if (!setting || !setting.enabled) {
      return error(`${provider} is not enabled. Enable it in Courier Methods first.`)
    }

    const existing = await prisma.orderShipment.findUnique({
      where: { orderId: id },
    })
    if (existing && existing.consignmentId) {
      return error("Shipment already exists.", 409)
    }

    const notes = {
      customerNote: parsed.data.customerNote || null,
      adminNote: parsed.data.adminNote || null,
    }

    if (provider === "PATHAO") {
      const orderForParcel = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: order.total,
        paidAmount: order.paidAmount,
        dueAmount: order.dueAmount,
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
        const errorJson = JSON.stringify({ error: parcelResult.reason, detail: parcelResult.detail })
        await prisma.orderShipment.upsert({
          where: { orderId: id },
          create: {
            orderId: id,
            courierProvider: provider,
            status: "FAILED",
            collectionAmount,
            courierResponseJson: errorJson,
            ...notes,
          },
          update: {
            status: "FAILED",
            courierProvider: provider,
            collectionAmount,
            courierResponseJson: errorJson,
            trackingCode: null,
            consignmentId: null,
            customerNote: notes.customerNote,
            adminNote: notes.adminNote,
          },
        })
        return error(parcelResult.reason, 400)
      }

      const [shipment] = await prisma.$transaction([
        prisma.orderShipment.upsert({
          where: { orderId: id },
          create: {
            orderId: id,
            courierProvider: "PATHAO",
            status: "PENDING",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            collectionAmount,
            ...notes,
          },
          update: {
            status: "PENDING",
            courierProvider: "PATHAO",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            collectionAmount,
            customerNote: notes.customerNote,
            adminNote: notes.adminNote,
          },
        }),
        prisma.order.update({
          where: { id },
          data: { orderStatus: "processing" },
        }),
      ])

      return success(shipment)
    }

    if (provider === "STEADFAST") {
      const orderForSteadfast: OrderForSteadfast = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: order.total,
        paidAmount: order.paidAmount,
        dueAmount: order.dueAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        items: order.items,
        address: order.address,
      }

      const parcelResult = await createSteadfastParcel(orderForSteadfast)

      if (!parcelResult.success) {
        const errorJson = JSON.stringify({ error: parcelResult.reason, detail: parcelResult.detail })
        await prisma.orderShipment.upsert({
          where: { orderId: id },
          create: {
            orderId: id,
            courierProvider: provider,
            status: "FAILED",
            collectionAmount,
            courierResponseJson: errorJson,
            ...notes,
          },
          update: {
            status: "FAILED",
            courierProvider: provider,
            collectionAmount,
            courierResponseJson: errorJson,
            trackingCode: null,
            consignmentId: null,
            customerNote: notes.customerNote,
            adminNote: notes.adminNote,
          },
        })
        return error(parcelResult.reason, 400)
      }

      const [shipment] = await prisma.$transaction([
        prisma.orderShipment.upsert({
          where: { orderId: id },
          create: {
            orderId: id,
            courierProvider: "STEADFAST",
            status: "PENDING",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            collectionAmount,
            ...notes,
          },
          update: {
            status: "PENDING",
            courierProvider: "STEADFAST",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            collectionAmount,
            customerNote: notes.customerNote,
            adminNote: notes.adminNote,
          },
        }),
        prisma.order.update({
          where: { id },
          data: { orderStatus: "processing" },
        }),
      ])

      return success(shipment)
    }

    if (provider === "REDX") {
      const orderForRedx: OrderForRedx = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total: order.total,
        paidAmount: order.paidAmount,
        dueAmount: order.dueAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        items: order.items,
        address: order.address,
      }

      const parcelResult = await createRedxParcel(orderForRedx)

      if (!parcelResult.success) {
        const errorJson = JSON.stringify({ error: parcelResult.reason, detail: parcelResult.detail })
        await prisma.orderShipment.upsert({
          where: { orderId: id },
          create: {
            orderId: id,
            courierProvider: provider,
            status: "FAILED",
            collectionAmount,
            courierResponseJson: errorJson,
            ...notes,
          },
          update: {
            status: "FAILED",
            courierProvider: provider,
            collectionAmount,
            courierResponseJson: errorJson,
            trackingCode: null,
            consignmentId: null,
            customerNote: notes.customerNote,
            adminNote: notes.adminNote,
          },
        })
        return error(parcelResult.reason, 400)
      }

      const [shipment] = await prisma.$transaction([
        prisma.orderShipment.upsert({
          where: { orderId: id },
          create: {
            orderId: id,
            courierProvider: "REDX",
            status: "PENDING",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            collectionAmount,
            ...notes,
          },
          update: {
            status: "PENDING",
            courierProvider: "REDX",
            trackingCode: parcelResult.trackingCode,
            consignmentId: parcelResult.consignmentId,
            courierResponseJson: JSON.stringify(parcelResult.response),
            collectionAmount,
            customerNote: notes.customerNote,
            adminNote: notes.adminNote,
          },
        }),
        prisma.order.update({
          where: { id },
          data: { orderStatus: "processing" },
        }),
      ])

      return success(shipment)
    }

    const shipment = await prisma.orderShipment.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        courierProvider: provider,
        status: "SETUP_READY",
        collectionAmount,
        ...notes,
      },
      update: {
        courierProvider: provider,
        status: "SETUP_READY",
        collectionAmount,
        customerNote: notes.customerNote,
        adminNote: notes.adminNote,
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
    if (parsed.data.courierResponseJson !== undefined) updateData.courierResponseJson = parsed.data.courierResponseJson
    if (parsed.data.courierProvider !== undefined) updateData.courierProvider = parsed.data.courierProvider

    const shipment = await prisma.orderShipment.update({
      where: { orderId: id },
      data: updateData,
    })

    return success(shipment)
  } catch {
    return error("Failed to update shipment")
  }
}