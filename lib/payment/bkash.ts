import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/encryption"

export type BkashCredentials = {
  appKey: string
  appSecret: string
  username: string
  password: string
  baseUrl: string
  callbackUrl: string
}

export type BkashPaymentCreateResult = {
  paymentId: string
  paymentExecuteStatus: string
  trxId?: string
  status?: string
  statusCode?: string
  statusMessage?: string
}

export type BkashPaymentVerifyResult = {
  trxId: string
  amount: string
  merchantInvoiceNumber: string
  paymentExecuteStatus: string
  reference: string
  transactionStatus: string
  verificationStatus: string
}

export type BkashTokenCache = {
  token: string
  expiresAt: number
}

const tokenCache: Record<string, BkashTokenCache> = {}

const TOKEN_TTL_MS = 55 * 60 * 1000

async function loadCredentials(
  mode: "SANDBOX" | "LIVE"
): Promise<BkashCredentials | null> {
  const setting = await prisma.paymentMethodSetting.findUnique({
    where: { provider: "BKASH" },
  })

  if (!setting || !setting.enabled) return null
  if (setting.mode !== mode) return null

  let creds: BkashCredentials = {
    appKey: "",
    appSecret: "",
    username: "",
    password: "",
    baseUrl: "",
    callbackUrl: "",
  }

  if (setting.credentialsJson) {
    try {
      const decrypted = decrypt(setting.credentialsJson, "payment")
      creds = { ...creds, ...JSON.parse(decrypted) }
    } catch {
      return null
    }
  }

  const appKey = creds.appKey || process.env.BKASH_APP_KEY || ""
  const appSecret = creds.appSecret || process.env.BKASH_APP_SECRET || ""
  const username = creds.username || process.env.BKASH_USERNAME || ""
  const password = creds.password || process.env.BKASH_PASSWORD || ""
  const baseUrl =
    creds.baseUrl || process.env.BKASH_BASE_URL || "https://tokenized.sandbox.bka.sh/v1.2.0-beta"

  if (!appKey || !appSecret || !username || !password) return null

  return { appKey, appSecret, username, password, baseUrl, callbackUrl: "" }
}

function getCacheKey(mode: string, appKey: string): string {
  return `${mode}:${appKey.slice(0, 8)}`
}

async function getToken(mode: "SANDBOX" | "LIVE"): Promise<{ token: string; baseUrl: string } | null> {
  const creds = await loadCredentials(mode)
  if (!creds) return null

  const cacheKey = getCacheKey(mode, creds.appKey)
  const cached = tokenCache[cacheKey]

  if (cached && Date.now() < cached.expiresAt) {
    return { token: cached.token, baseUrl: creds.baseUrl }
  }

  const res = await fetch(`${creds.baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-APP-Key": creds.appKey,
    },
    body: JSON.stringify({
      app_key: creds.appKey,
      app_secret: creds.appSecret,
    }),
  })

  const data = await res.json()
  if (!data?.id_token) return null

  tokenCache[cacheKey] = {
    token: data.id_token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  }

  return { token: data.id_token, baseUrl: creds.baseUrl }
}

export async function getBkashMode(): Promise<"SANDBOX" | "LIVE"> {
  const setting = await prisma.paymentMethodSetting.findUnique({
    where: { provider: "BKASH" },
  })
  return (setting?.mode as "SANDBOX" | "LIVE") || "SANDBOX"
}

export async function isBkashEnabled(): Promise<boolean> {
  const setting = await prisma.paymentMethodSetting.findUnique({
    where: { provider: "BKASH" },
  })
  return setting?.enabled ?? false
}

export async function createBkashPayment(
  orderId: string,
  orderNumber: string,
  expectedTotal: number,
  callbackBase: string
): Promise<BkashPaymentCreateResult | { error: string }> {
  const mode = await getBkashMode()
  const tokenData = await getToken(mode)
  if (!tokenData) return { error: "bKash is not configured or enabled" }

  const { token, baseUrl } = tokenData

  const res = await fetch(`${baseUrl}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-APP-Key": (await loadCredentials(mode))!.appKey,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: orderId,
      callbackURL: `${callbackBase}/api/payment/bkash/callback?orderId=${orderId}`,
      amount: expectedTotal.toString(),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: orderNumber,
    }),
  })

  const data = await res.json()
  return data
}

export async function verifyBkashPayment(
  trxId: string
): Promise<BkashPaymentVerifyResult | { error: string }> {
  const mode = await getBkashMode()
  const tokenData = await getToken(mode)
  if (!tokenData) return { error: "bKash token unavailable" }

  const { token, baseUrl } = tokenData
  const creds = await loadCredentials(mode)
  if (!creds) return { error: "bKash credentials not found" }

  const res = await fetch(`${baseUrl}/tokenized/checkout/payment/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-APP-Key": creds.appKey,
    },
    body: JSON.stringify({
      payment_id: trxId,
    }),
  })

  const data = await res.json()
  return data
}

export type OrderValidationResult =
  | { valid: true; order: Awaited<ReturnType<typeof prisma.order.findUnique>> }
  | { valid: false; reason: "not_found" | "already_paid" | "cancelled" | "returned" | "expired" | "wrong_status" | "amount_mismatch" }

export async function validateOrderForPayment(
  orderId: string,
  orderNumber: string,
  expectedTotal: number
): Promise<OrderValidationResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })

  if (!order) return { valid: false, reason: "not_found" }

  if (order.orderNumber !== orderNumber) return { valid: false, reason: "not_found" }

  if (order.total !== expectedTotal) return { valid: false, reason: "amount_mismatch" }

  if (order.paymentStatus === "paid") return { valid: false, reason: "already_paid" }

  if (order.orderStatus === "cancelled") return { valid: false, reason: "cancelled" }

  if (order.orderStatus === "returned") return { valid: false, reason: "returned" }

  if (order.paymentExpiresAt && new Date() > order.paymentExpiresAt) {
    return { valid: false, reason: "expired" }
  }

  if (order.paymentStatus !== "pending") return { valid: false, reason: "wrong_status" }

  return { valid: true, order }
}

export type IdempotencyResult =
  | { isNew: true; transaction: Awaited<ReturnType<typeof prisma.paymentTransaction.create>> }
  | { isNew: false; transaction: Awaited<ReturnType<typeof prisma.paymentTransaction.findUnique>> }

export async function checkIdempotency(
  trxId: string
): Promise<IdempotencyResult> {
  const existing = await prisma.paymentTransaction.findUnique({
    where: { trxId },
  })

  if (existing) {
    return { isNew: false, transaction: existing }
  }

  return { isNew: false, transaction: null as never }
}

export async function initiatePaymentTransaction(
  orderId: string,
  trxId: string,
  amount: number,
  status: string = "initiated"
) {
  return prisma.paymentTransaction.create({
    data: {
      orderId,
      trxId,
      amount,
      status,
    },
  })
}

export type PaymentProcessResult =
  | { success: true; order: NonNullable<Awaited<ReturnType<typeof prisma.order.findUnique>>>; alreadyProcessed?: boolean }
  | { success: false; reason: string }

export async function processSuccessfulPayment(
  orderId: string,
  trxId: string,
  amount: number,
  providerResponse?: string
): Promise<PaymentProcessResult> {
  const existing = await prisma.paymentTransaction.findUnique({ where: { trxId } })

  if (existing) {
    if (existing.status === "success") {
      const order = await prisma.order.findUnique({ where: { id: orderId } })
      return { success: true, order: order!, alreadyProcessed: true }
    }
    if (existing.status === "failed" || existing.status === "cancelled") {
      return { success: false, reason: `Transaction ${trxId} was already ${existing.status}` }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error("Order not found")
    if (order.paymentStatus === "paid") throw new Error("Order already paid")
    if (order.paymentStatus !== "pending") throw new Error(`Cannot process payment in status: ${order.paymentStatus}`)

    const transaction = await tx.paymentTransaction.upsert({
      where: { trxId },
      create: {
        orderId,
        trxId,
        amount,
        status: "success",
        providerResponse: providerResponse ?? null,
        verifiedAt: new Date(),
        completedAt: new Date(),
      },
      update: {
        status: "success",
        providerResponse: providerResponse ?? null,
        verifiedAt: new Date(),
        completedAt: new Date(),
      },
    })

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "paid",
        bkashTrxId: trxId,
        paidAmount: amount,
        paymentVerifiedAt: new Date(),
      },
    })

    return { transaction, order: updatedOrder }
  })

  return { success: true, order: result.order }
}

export async function processFailedPayment(
  orderId: string,
  trxId: string,
  reason: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.upsert({
      where: { trxId },
      create: {
        orderId,
        trxId,
        amount: 0,
        status: "failed",
        providerResponse: reason,
      },
      update: {
        status: "failed",
        providerResponse: reason,
      },
    })

    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "failed" },
    })
  })
}

export async function cancelExpiredPayments(): Promise<number> {
  const result = await prisma.order.updateMany({
    where: {
      paymentStatus: "pending",
      paymentMethod: { not: "cod" },
      paymentExpiresAt: { not: null, lt: new Date() },
      orderStatus: "pending",
    },
    data: {
      orderStatus: "cancelled",
      paymentStatus: "cancelled",
    },
  })
  return result.count
}