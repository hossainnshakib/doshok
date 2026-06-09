import type { ShipmentStatus, OrderStatus } from "@/types"

export const PATHAO_SHIPMENT_STATUS_MAP: Record<string, ShipmentStatus> = {
  PENDING: "PENDING",
  PICKED: "DISPATCHED",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
}

export const STEADFAST_SHIPMENT_STATUS_MAP: Record<string, ShipmentStatus> = {
  pending: "PENDING",
  picked: "DISPATCHED",
  in_transit: "IN_TRANSIT",
  delivered: "DELIVERED",
  returned: "RETURNED",
  cancelled: "CANCELLED",
  failed: "FAILED",
}

export const SHIPMENT_TO_ORDER_STATUS_MAP: Record<ShipmentStatus, OrderStatus> = {
  NOT_CREATED: "pending",
  SETUP_READY: "confirmed",
  PENDING: "confirmed",
  DISPATCHED: "processing",
  IN_TRANSIT: "shipped",
  DELIVERED: "delivered",
  RETURNED: "returned",
  CANCELLED: "cancelled",
  FAILED: "processing",
}

export type PathaoWebhookPayload = {
  order_id?: string | number
  consignment_id?: string | number
  tracking_code?: string
  status?: string
  status_description?: string
  message?: string
}

export function mapPathaoStatus(rawStatus: string | undefined): ShipmentStatus {
  if (!rawStatus) return "PENDING"
  const normalized = rawStatus.toUpperCase().trim()
  return PATHAO_SHIPMENT_STATUS_MAP[normalized] ?? "PENDING"
}

export function getOrderStatusFromShipment(shipmentStatus: ShipmentStatus): OrderStatus {
  return SHIPMENT_TO_ORDER_STATUS_MAP[shipmentStatus] ?? "processing"
}

export function mapSteadfastStatus(rawStatus: string | undefined): ShipmentStatus {
  if (!rawStatus) return "PENDING"
  const normalized = rawStatus.toLowerCase().trim()
  return STEADFAST_SHIPMENT_STATUS_MAP[normalized] ?? "PENDING"
}