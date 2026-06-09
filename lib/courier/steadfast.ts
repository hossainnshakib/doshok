import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"
import type {
  SteadfastCredentials,
  SteadfastValidationResult,
  SteadfastParcelPayload,
  SteadfastParcelResponse,
  SteadfastErrorResponse,
  ParcelCreateResult,
} from "./types"

const SANDBOX_BASE = "https://api-sandbox.steadfast.co.kr/api/v1"
const LIVE_BASE = "https://api.steadfast.co.kr/api/v1"

export type OrderForSteadfast = {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  total: number
  paidAmount: number
  paymentMethod: string
  paymentStatus: string
  items: { quantity: number; name: string }[]
  address: {
    division: string
    district: string
    thana: string
    fullAddress: string
  } | null
}

async function loadCredentials(
  mode: "SANDBOX" | "LIVE"
): Promise<SteadfastCredentials | null> {
  const setting = await prisma.courierProviderSetting.findUnique({
    where: { provider: "STEADFAST" },
  })

  if (!setting || !setting.enabled) return null
  if (setting.mode !== mode) return null

  let creds: SteadfastCredentials = {
    apiKey: "",
    secretKey: "",
    baseUrl: "",
  }

  if (setting.credentialsJson) {
    try {
      const decrypted = decrypt(setting.credentialsJson, "courier")
      creds = { ...creds, ...JSON.parse(decrypted) }
    } catch {
      return null
    }
  }

  const apiKey = creds.apiKey || process.env.STEADFAST_API_KEY || ""
  const secretKey = creds.secretKey || process.env.STEADFAST_SECRET_KEY || ""
  const baseUrl = creds.baseUrl || (mode === "SANDBOX" ? SANDBOX_BASE : LIVE_BASE)

  return { apiKey, secretKey, baseUrl }
}

export async function getSteadfastMode(): Promise<"SANDBOX" | "LIVE"> {
  const setting = await prisma.courierProviderSetting.findUnique({
    where: { provider: "STEADFAST" },
  })
  return (setting?.mode as "SANDBOX" | "LIVE") || "SANDBOX"
}

export async function isSteadfastEnabled(): Promise<boolean> {
  const setting = await prisma.courierProviderSetting.findUnique({
    where: { provider: "STEADFAST" },
  })
  return setting?.enabled ?? false
}

export async function validateSteadfastCredentials(): Promise<SteadfastValidationResult> {
  const setting = await prisma.courierProviderSetting.findUnique({
    where: { provider: "STEADFAST" },
  })

  if (!setting) return { valid: false, reason: "not_configured" }
  if (!setting.enabled) return { valid: false, reason: "not_enabled" }

  let creds: SteadfastCredentials = {
    apiKey: "",
    secretKey: "",
    baseUrl: "",
  }

  if (setting.credentialsJson) {
    try {
      const decrypted = decrypt(setting.credentialsJson, "courier")
      creds = { ...creds, ...JSON.parse(decrypted) }
    } catch {
      return { valid: false, reason: "missing_credentials" }
    }
  }

  const apiKey = creds.apiKey || process.env.STEADFAST_API_KEY || ""
  const secretKey = creds.secretKey || process.env.STEADFAST_SECRET_KEY || ""

  if (!apiKey || !secretKey) {
    return { valid: false, reason: "missing_credentials" }
  }

  return { valid: true, mode: setting.mode as "SANDBOX" | "LIVE" }
}

export async function mapOrderToSteadfastPayload(
  order: OrderForSteadfast
): Promise<SteadfastParcelPayload> {
  const codAmount = order.total - order.paidAmount
  const amountToCollect = codAmount > 0 ? codAmount : 0

  const fullAddress = order.address
    ? [
        order.address.fullAddress,
        order.address.thana,
        order.address.district,
        order.address.division,
      ]
        .filter(Boolean)
        .join(", ")
    : "Address not provided"

  return {
    invoice_no: order.orderNumber,
    recipient_name: order.customerName,
    recipient_phone: order.customerPhone,
    recipient_address: fullAddress,
    cod_amount: amountToCollect,
    note: order.paymentMethod.toLowerCase() === "cod"
      ? "COD - Please collect payment upon delivery"
      : "Prepaid order",
  }
}

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "")
  return cleaned.length >= 11 && cleaned.length <= 15
}

function validateAddress(address: string): boolean {
  return address.trim().length >= 5
}

function validateAmount(amount: number): boolean {
  return amount >= 0
}

export async function createSteadfastParcel(
  order: OrderForSteadfast
): Promise<ParcelCreateResult> {
  const mode = await getSteadfastMode()
  const creds = await loadCredentials(mode)

  if (!creds) {
    return {
      success: false,
      reason: "Steadfast credentials not available",
      detail: "Please check Steadfast courier settings.",
    }
  }

  const payload = await mapOrderToSteadfastPayload(order)

  if (!validatePhone(payload.recipient_phone)) {
    return {
      success: false,
      reason: "Invalid phone number",
      detail: "Phone must be 11-15 digits. Received: " + payload.recipient_phone,
    }
  }

  if (!validateAddress(payload.recipient_address)) {
    return {
      success: false,
      reason: "Invalid address",
      detail: "Address must be at least 5 characters.",
    }
  }

  if (!validateAmount(payload.cod_amount)) {
    return {
      success: false,
      reason: "Invalid COD amount",
      detail: "COD amount must be non-negative.",
    }
  }

  const res = await fetch(`${creds.baseUrl}/courier/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": creds.apiKey,
      "Secret-Key": creds.secretKey,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok || (data as SteadfastErrorResponse).status !== 200 && (data as SteadfastErrorResponse).status !== 201) {
    const err = data as SteadfastErrorResponse
    console.error("[steadfast/create-parcel]", err)
    return {
      success: false,
      reason: err.message || "Steadfast API error",
      detail: err.error || err.message,
    }
  }

  const parcel = data as SteadfastParcelResponse

  return {
    success: true,
    consignmentId: String(parcel.consignment_id),
    trackingCode: parcel.tracking_code,
    status: "PENDING",
    response: parcel,
  }
}