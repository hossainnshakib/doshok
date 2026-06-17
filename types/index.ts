export type LegacyFooterLink = { label: string; href: string; group: string }
export type LegacyHeaderQuickLink = string

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
}

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "unpaid"

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "unpaid",
]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  unpaid: "Unpaid",
}

export const LOW_STOCK_THRESHOLD = 5

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export type CartItem = {
  productId: string
  variantId?: string
  name: string
  price: number
  size?: string
  color?: string
  image?: string
  quantity: number
  slug?: string
}

export type DeliveryZone = "chatto" | "dhaka" | "outside"

export type DeliveryZoneMeta = {
  zone: DeliveryZone
  label: string
  fee: number
}

export const ADDRESS_LABELS = ["Home", "Office", "Family", "Other"] as const
export type AddressLabel = typeof ADDRESS_LABELS[number]

export type UserAddress = {
  id: string
  userId: string
  label: AddressLabel
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string
  zone: string
  postalCode: string | null
  divisionId: string | null
  districtId: string | null
  upazilaId: string | null
  divisionName: string | null
  districtName: string | null
  upazilaName: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export const DELIVERY_ZONE_NAMES: Record<DeliveryZone, string> = {
  chatto: "Inside Chattogram",
  dhaka: "Dhaka",
  outside: "Outside Dhaka",
}
