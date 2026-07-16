import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { prisma } from "@/lib/prisma"
import { createOrder, refreshOrderStatus, getPathaoStatusLabel } from "@/lib/courier/pathao/orders"
import { getOrderConsignment, getCourierProviderByCode, getCourierToken, createCourierLog } from "@/lib/courier"
import { PATHAO_PROVIDER_CODE } from "@/lib/courier/pathao/client"
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
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  console.log(`[${requestId}] send_order_start`)

  try {
    const session = await requireAdminPermission("operations")
    console.log(`[${requestId}] auth_result:`, session instanceof NextResponse ? "denied" : "allowed")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = sendOrderSchema.safeParse(body)
    if (!parsed.success) {
      console.log(`[${requestId}] validation_failed:`, parsed.error.issues[0]?.message)
      return error(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const { orderId, storeId, deliveryType, itemType, itemWeight } = parsed.data
    console.log(`[${requestId}] order=${orderId} store=${storeId}`)

    const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
    const environment = provider?.environment ?? "sandbox"
    console.log(`[${requestId}] provider_env=${environment}`)

    const courierStore = await prisma.courierStore.findUnique({
      where: { providerCode_environment_storeId: { providerCode: PATHAO_PROVIDER_CODE, environment, storeId } },
    })

    if (!courierStore) {
      return error(`Store ${storeId} not found in ${environment} environment. Please sync stores first.`, 400)
    }

    const existingConsignment = await getOrderConsignment(orderId)
    if (existingConsignment?.consignmentId) {
      return NextResponse.json(
        {
          success: false,
          error: "This order has already been sent to Pathao.",
          data: {
            consignmentId: existingConsignment.consignmentId,
            trackingCode: existingConsignment.trackingCode,
          },
        },
        { status: 409 }
      )
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

    const tokenInfo = await getCourierToken(PATHAO_PROVIDER_CODE, environment)
    if (!tokenInfo) {
      return error(`No access token found for ${environment} environment. Please configure Pathao credentials.`, 401)
    }

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

    console.log(`[${requestId}] pathao_create_success:`, {
      success: result.success,
      hasData: !!result.data,
      consignment_id: result.data?.consignment_id,
      code: result.code,
      message: result.message,
    })

    const sanitizedRequestBody = {
      store_id: storeId,
      recipient_name: order.customerName,
      recipient_phone: order.customerPhone,
      recipient_address: order.address.fullAddress,
      recipient_city: recipientCity,
      recipient_zone: recipientZone,
      delivery_type: deliveryType === "normal" ? 1 : deliveryType === "express" ? 5 : 3,
      item_type: itemType === "parcel" ? 1 : itemType === "document" ? 2 : itemType === "electronics" ? 3 : itemType === "food" ? 4 : itemType === "liquid" ? 5 : 6,
      item_quantity: order.items.length,
      item_weight: itemWeight,
      amount_to_collect: order.total,
      item_description: `${order.items.length} item(s)`,
    }

    if (result.success && result.data && result.data.consignment_id !== undefined) {
      const consignmentId = String(result.data.consignment_id)
      const trackingCode = result.data.tracking_code || null
      const finalResponse = {
        success: true,
        data: {
          consignmentId,
          trackingCode,
          message: result.data.message || null,
        },
      }

      try {
        await createCourierLog({
          providerCode: PATHAO_PROVIDER_CODE,
          environment,
          orderId,
          action: "create_order_detailed",
          requestUrl: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/create/order",
          requestMethod: "POST",
          requestBody: sanitizedRequestBody,
          responseBody: result.data as object,
          responseStatus: 200,
          durationMs: null,
          correlationId: requestId,
          parsedConsignmentId: consignmentId,
          parsedTrackingCode: trackingCode,
          finalResponseToFrontend: finalResponse,
          errorMessage: null,
        })
        console.log(`[${requestId}] detailed_log_saved_success`)
      } catch (logErr) {
        console.error(`[${requestId}] detailed_log_save_failed:`, logErr instanceof Error ? logErr.message : logErr)
      }

      console.log(`[${requestId}] returning_success with consignmentId=`, result.data.consignment_id)
      return success({
        consignmentId,
        trackingCode,
        message: result.data.message || null,
      })
    }

    const isPathaoAuthError = result.code === 401
    if (isPathaoAuthError) {
      try {
        await createCourierLog({
          providerCode: PATHAO_PROVIDER_CODE,
          environment,
          orderId,
          action: "create_order_detailed",
          requestUrl: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/create/order",
          requestMethod: "POST",
          requestBody: sanitizedRequestBody,
          responseBody: null,
          responseStatus: 401,
          durationMs: null,
          correlationId: requestId,
          parsedConsignmentId: null,
          parsedTrackingCode: null,
          finalResponseToFrontend: { success: false, error: `Pathao API unauthorized: ${result.message}` },
          errorMessage: `Pathao API unauthorized: ${result.message}`,
        })
      } catch (logErr) {
        console.error(`[${requestId}] detailed_log_save_failed:`, logErr instanceof Error ? logErr.message : logErr)
      }
      console.log(`[${requestId}] pathao_401_error:`, result.message)
      return error(`Pathao API unauthorized: ${result.message}`, 401)
    }

    try {
      await createCourierLog({
        providerCode: PATHAO_PROVIDER_CODE,
        environment,
        orderId,
        action: "create_order_detailed",
        requestUrl: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/create/order",
        requestMethod: "POST",
        requestBody: sanitizedRequestBody,
        responseBody: null,
        responseStatus: result.code || 500,
        durationMs: null,
        correlationId: requestId,
        parsedConsignmentId: null,
        parsedTrackingCode: null,
        finalResponseToFrontend: { success: false, error: result.message || "Failed to create order" },
        errorMessage: result.message || "Failed to create order",
      })
    } catch (logErr) {
      console.error(`[${requestId}] detailed_log_save_failed:`, logErr instanceof Error ? logErr.message : logErr)
    }

    console.log(`[${requestId}] returning_error:`, result.message)
    return error(result.message || "Failed to create order")
  } catch (err) {
    console.error(`[${requestId}] ========== FULL CATCH ==========`)
    console.error(`[${requestId}] err:`, err)
    console.error(`[${requestId}] typeof err:`, typeof err)
    console.error(`[${requestId}] err?.name:`, (err as { name?: string })?.name)
    console.error(`[${requestId}] err?.message:`, (err as { message?: string })?.message)
    console.error(`[${requestId}] err?.stack:`, (err as Error)?.stack)
    console.error(`[${requestId}] JSON.stringify(err):`, JSON.stringify(err, null, 2))
    console.error(`[${requestId}] ========== END CATCH ==========`)

    const message = err instanceof Error ? err.message : "Unknown error"
    return error(`Failed to send order to Pathao: ${message}`)
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
