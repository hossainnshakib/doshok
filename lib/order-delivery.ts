import districtsData from "@/data/raw/bangladesh/districts.json"
import type { DeliveryZone } from "@/types"
import { DELIVERY_ZONE_NAMES } from "@/types"

function autoDetectDeliveryZoneFromDistrictId(districtId: string): DeliveryZone {
  if (districtId === "dist-dhaka") return "dhaka"
  if (districtId === "dist-chattogram") return "chatto"
  return "outside"
}

type OrderDeliveryFields = {
  subtotal: number
  deliveryFee: number
  discount?: number
  total: number
  productSubtotal?: number
  productDiscount?: number
  deliveryDiscount?: number
  discountedProductTotal?: number
  finalDeliveryFee?: number
}

export function getOrderProductSubtotal(order: OrderDeliveryFields): number {
  const productSubtotal = order.productSubtotal ?? 0
  return productSubtotal > 0 ? productSubtotal : order.subtotal
}

export function getEffectiveDeliveryFee(order: OrderDeliveryFields): number {
  const finalFee = order.finalDeliveryFee ?? 0
  const deliveryDiscount = order.deliveryDiscount ?? 0

  if (deliveryDiscount > 0) return finalFee
  if (finalFee > 0 && finalFee !== order.deliveryFee) return finalFee
  return order.deliveryFee
}

export function hasOrderDiscountBreakdown(order: OrderDeliveryFields): boolean {
  return (order.productDiscount ?? 0) > 0 || (order.deliveryDiscount ?? 0) > 0 || (order.discount ?? 0) > 0
}

export function inferDeliveryZoneLabelFromDistrictName(districtName: string): string | null {
  const normalized = districtName.trim().toLowerCase()
  const district = districtsData.find((d) => d.name.toLowerCase() === normalized)
  if (!district) return null
  return DELIVERY_ZONE_NAMES[autoDetectDeliveryZoneFromDistrictId(district.id)]
}
