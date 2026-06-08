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

export const DELIVERY_ZONE_NAMES: Record<DeliveryZone, string> = {
  chatto: "Inside Chattogram",
  dhaka: "Dhaka",
  outside: "Outside Dhaka",
}
