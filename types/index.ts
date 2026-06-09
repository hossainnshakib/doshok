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

export type CourierProvider = "PATHAO" | "STEADFAST" | "REDX"

export type CourierMode = "SANDBOX" | "LIVE"

export type ShipmentStatus =
  | "NOT_CREATED"
  | "SETUP_READY"
  | "PENDING"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED"
  | "CANCELLED"

export const ALLOWED_COURIERS: CourierProvider[] = ["PATHAO", "STEADFAST", "REDX"]

export const COURIER_LABELS: Record<CourierProvider, string> = {
  PATHAO: "Pathao",
  STEADFAST: "Steadfast",
  REDX: "RedX",
}

export const COURIER_LOGOS: Record<CourierProvider, string> = {
  PATHAO: "P",
  STEADFAST: "S",
  REDX: "R",
}

export const COURIER_CREDENTIAL_FIELDS: Record<CourierProvider, { key: string; label: string; type?: string }[]> = {
  PATHAO: [
    { key: "clientId", label: "Client ID" },
    { key: "clientSecret", label: "Client Secret", type: "password" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password", type: "password" },
    { key: "storeId", label: "Store ID" },
    { key: "baseUrl", label: "Base URL" },
  ],
  STEADFAST: [
    { key: "apiKey", label: "API Key", type: "password" },
    { key: "secretKey", label: "Secret Key", type: "password" },
    { key: "baseUrl", label: "Base URL" },
  ],
  REDX: [
    { key: "apiToken", label: "API Token", type: "password" },
    { key: "baseUrl", label: "Base URL" },
    { key: "storeId", label: "Store ID" },
  ],
}

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  NOT_CREATED: "Not Created",
  SETUP_READY: "Setup Ready",
  PENDING: "Pending",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
}

export const SHIPMENT_STATUS_FLOW: ShipmentStatus[] = [
  "NOT_CREATED",
  "SETUP_READY",
  "PENDING",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "RETURNED",
  "CANCELLED",
]

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
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export const DELIVERY_ZONE_NAMES: Record<DeliveryZone, string> = {
  chatto: "Inside Chattogram",
  dhaka: "Dhaka",
  outside: "Outside Dhaka",
}
