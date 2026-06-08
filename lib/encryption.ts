import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16

type SecretPurpose = "payment" | "courier" | "default"

function getKey(purpose: SecretPurpose = "default"): Buffer {
  let secret: string | undefined

  if (purpose === "payment") {
    secret = process.env.PAYMENT_CREDENTIALS_SECRET || process.env.NEXTAUTH_SECRET
  } else if (purpose === "courier") {
    secret = process.env.COURIER_CREDENTIALS_SECRET || process.env.NEXTAUTH_SECRET
  } else {
    secret = process.env.NEXTAUTH_SECRET
  }

  if (!secret) throw new Error("NEXTAUTH_SECRET is required for credential encryption")
  return crypto.createHash("sha256").update(secret).digest()
}

export function encrypt(plaintext: string, purpose: SecretPurpose = "default"): string {
  const key = getKey(purpose)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`
}

export function decrypt(encryptedString: string, purpose: SecretPurpose = "default"): string {
  const key = getKey(purpose)
  const parts = encryptedString.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted string format")
  const [ivHex, tagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}
