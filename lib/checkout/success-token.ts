import crypto from "crypto"

const TTL_MS = 24 * 60 * 60 * 1000

function getSecret(): string {
  const s = process.env.SUCCESS_TOKEN_SECRET
  if (s) return s
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SUCCESS_TOKEN_SECRET is required in production. Generate one with: openssl rand -base64 48"
    )
  }
  return "doshok-success-token-dev-secret"
}

export function generateSuccessToken(orderNumber: string): string {
  const secret = getSecret()
  const payload = `${orderNumber}:${Date.now()}`
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  return Buffer.from(payload).toString("base64url") + "." + hmac
}

export function validateSuccessToken(token: string, orderNumber: string): boolean {
  try {
    const secret = getSecret()
    const dot = token.indexOf(".")
    if (dot === -1) return false

    const rawPayload = token.slice(0, dot)
    const hmac = token.slice(dot + 1)
    const payload = Buffer.from(rawPayload, "base64url").toString()

    const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex")
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) return false

    const [tokenOrderNumber, timestamp] = payload.split(":")
    if (tokenOrderNumber !== orderNumber) return false

    const age = Date.now() - Number(timestamp)
    if (Number.isNaN(age) || age > TTL_MS || age < 0) return false

    return true
  } catch {
    return false
  }
}
