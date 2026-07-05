import {
  getPathaoEndpoints,
  pathaoRequest,
  type PathaoApiResponse,
  PATHAO_PROVIDER_CODE,
} from "./client"
import {
  getValidToken,
} from "./auth"
import {
  getCourierProviderByCode,
  getCourierStores,
  getOrderConsignment,
  upsertOrderConsignment,
  updateConsignmentStatus,
  type CourierDeliveryType,
  type CourierItemType,
} from "@/lib/courier"

export interface PathaoOrderItem {
  name: string
  category: string
  quantity: number
}

export interface PathaoRecipient {
  name: string
  phone: string
  address: string
  city: string
  zone: string
  area?: string
  postalCode?: string
}

export interface PathaoOrderPayload {
  storeId: string
  recipient: PathaoRecipient
  deliveryType: CourierDeliveryType
  itemType: CourierItemType
  itemQuantity: number
  itemWeight: number
  amountToCollect: number
  itemDescription?: string
  recipientPhone?: string
}

export interface PathaoOrderResponse {
  consignment_id: number
  consignment_code: string
  tracking_code: string
  status: number
  message: string
}

export interface PathaoOrderInfo {
  consignment_id: number
  consignment_code: string
  tracking_code: string
  status: {
    id: number
    label: string
    label_en: string
  }
  delivery_fee: number
  cod_amount: number
  actual_delivery_fee: number
  merchant_received_amount: number
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  city: {
    id: number
    name: string
  }
  zone: {
    id: number
    name: string
  }
  area?: {
    id: number
    name: string
  }
  delivery_type: string
  created_at: string
  updated_at: string
}

export const PATHAO_DELIVERY_TYPE_MAP: Record<CourierDeliveryType, number> = {
  normal: 1,
  express: 5,
  partial: 3,
}

export const PATHAO_ITEM_TYPE_MAP: Record<CourierItemType, number> = {
  parcel: 1,
  document: 2,
  electronics: 3,
  food: 4,
  liquid: 5,
  fragile: 6,
}

export async function createOrder(
  orderId: string,
  payload: PathaoOrderPayload
): Promise<PathaoApiResponse<PathaoOrderResponse>> {
  const existingConsignment = await getOrderConsignment(orderId)
  if (existingConsignment?.consignmentId) {
    return {
      success: false,
      data: null as unknown as PathaoOrderResponse,
      message: "Order already has a consignment. Cannot create duplicate.",
      code: 409,
    }
  }

  const tokenResult = await getValidToken()
  if (!tokenResult.success) {
    return {
      success: false,
      data: null as unknown as PathaoOrderResponse,
      message: tokenResult.message,
    }
  }

  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"
  const endpoints = getPathaoEndpoints(environment)

  const deliveryTypeId = PATHAO_DELIVERY_TYPE_MAP[payload.deliveryType] ?? 1
  const itemTypeId = PATHAO_ITEM_TYPE_MAP[payload.itemType] ?? 1

  const orderPayload = {
    store_id: payload.storeId,
    recipient_name: payload.recipient.name,
    recipient_phone: payload.recipient.phone,
    recipient_address: payload.recipient.address,
    recipient_city: payload.recipient.city,
    recipient_zone: payload.recipient.zone,
    recipient_area: payload.recipient.area || null,
    recipient_postcode: payload.recipient.postalCode || null,
    delivery_type: deliveryTypeId,
    item_type: itemTypeId,
    item_quantity: payload.itemQuantity,
    item_weight: payload.itemWeight,
    amount_to_collect: payload.amountToCollect,
    item_description: payload.itemDescription || `${payload.itemQuantity} item(s)`,
  }

  const result = await pathaoRequest<PathaoOrderResponse>(
    endpoints.ORDERS,
    {
      method: "POST",
      body: orderPayload,
      accessToken: tokenResult.data.accessToken,
      providerCode: PATHAO_PROVIDER_CODE,
      orderId,
      action: "create_order",
    }
  )

  if (result.success && result.data) {
    await upsertOrderConsignment({
      orderId,
      providerCode: PATHAO_PROVIDER_CODE,
      storeId: payload.storeId,
      consignmentId: String(result.data.consignment_id),
      trackingCode: result.data.tracking_code,
      recipientName: payload.recipient.name,
      recipientPhone: payload.recipient.phone,
      recipientAddress: payload.recipient.address,
      deliveryType: payload.deliveryType,
      itemType: payload.itemType,
      itemQuantity: payload.itemQuantity,
      itemWeight: payload.itemWeight,
      amountToCollect: payload.amountToCollect,
      courierStatus: String(result.data.status),
      courierMessage: result.data.message,
      responseJson: result as object,
    })
  }

  return result
}

export async function getOrderInfo(consignmentId: string): Promise<PathaoApiResponse<PathaoOrderInfo>> {
  const tokenResult = await getValidToken()
  if (!tokenResult.success) {
    return {
      success: false,
      data: null as unknown as PathaoOrderInfo,
      message: tokenResult.message,
    }
  }

  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"
  const endpoints = getPathaoEndpoints(environment)

  return pathaoRequest<PathaoOrderInfo>(
    `${endpoints.ORDER_INFO}?consignment_id=${consignmentId}`,
    {
      accessToken: tokenResult.data.accessToken,
      providerCode: PATHAO_PROVIDER_CODE,
      orderId: undefined,
      action: `get_order_info_${consignmentId}`,
    }
  )
}

export async function refreshOrderStatus(orderId: string): Promise<PathaoApiResponse<PathaoOrderInfo>> {
  const consignment = await getOrderConsignment(orderId)
  if (!consignment?.consignmentId) {
    return {
      success: false,
      data: null as unknown as PathaoOrderInfo,
      message: "No consignment found for this order",
    }
  }

  const result = await getOrderInfo(consignment.consignmentId)

  if (result.success && result.data) {
    await updateConsignmentStatus(orderId, {
      courierStatus: String(result.data.status.id),
      courierMessage: result.data.status.label_en || result.data.status.label,
      deliveryFee: result.data.actual_delivery_fee,
      responseJson: result as object,
    })
  }

  return result
}

export const PATHAO_STATUS_LABELS: Record<string, string> = {
  "1": "Pending",
  "2": "Accepted",
  "3": "Picked",
  "4": "In Transit",
  "5": "Out for Delivery",
  "6": "Delivered",
  "7": "Returned",
  "8": "Cancelled",
  "9": "Failed",
}

export function getPathaoStatusLabel(statusId: string | number): string {
  return PATHAO_STATUS_LABELS[String(statusId)] || `Status ${statusId}`
}
