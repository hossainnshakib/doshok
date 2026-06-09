export type PathaoCredentials = {
  clientId: string
  clientSecret: string
  username: string
  password: string
  storeId: string
  baseUrl: string
}

export type PathaoTokenCache = {
  token: string
  expiresAt: number
}

export type PathaoTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export type PathaoParcelPayload = {
  store_id: string
  merchant_order_id: string
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  delivery_type?: number
  item_type?: number
  item_quantity: number
  item_weight: string
  amount_to_collect: number
  delivery_fee?: number
  special_instruction?: string
  recipient_landmark?: string
  recipient_city?: string
  recipient_zone?: string
}

export type PathaoParcelResponse = {
  id: number
  order_id: string
  consignment_id: string
  tracking_code: string
  status: string
  status_description: string
  message: string
}

export type PathaoErrorResponse = {
  error: boolean
  code: number
  message: string
  detail?: string
}

export type ParcelCreateResult =
  | { success: true; consignmentId: string; trackingCode: string; status: string; response: PathaoParcelResponse | SteadfastParcelResponse }
  | { success: false; reason: string; detail?: string }

export type PathaoValidationResult =
  | { valid: true; mode: "SANDBOX" | "LIVE"; storeId: string }
  | { valid: false; reason: "not_configured" | "not_enabled" | "missing_credentials" | "missing_store_id" }

export type SteadfastCredentials = {
  apiKey: string
  secretKey: string
  baseUrl: string
}

export type SteadfastValidationResult =
  | { valid: true; mode: "SANDBOX" | "LIVE" }
  | { valid: false; reason: "not_configured" | "not_enabled" | "missing_credentials" }

export type SteadfastParcelPayload = {
  invoice_no: string
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  cod_amount: number
  note: string
}

export type SteadfastParcelResponse = {
  status: number
  message: string
  consignment_id: number
  tracking_code: string
}

export type SteadfastErrorResponse = {
  status: number
  message: string
  error?: string
}