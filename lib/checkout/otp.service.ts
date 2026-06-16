import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { assertValidBdPhone } from "./phone"
import { getOtpProvider } from "./otp-provider"

const HASH_ROUNDS = 10

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000))
}

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return phone.slice(0, 5) + "****" + phone.slice(-3)
}

function getSettings() {
  return prisma.checkoutSetting.findUnique({ where: { id: "checkout" } })
}

export async function sendCheckoutOtp(phoneInput: string) {
  const phone = assertValidBdPhone(phoneInput)

  const settings = await getSettings()
  const cooldownSeconds = settings?.otpCooldownSeconds ?? 30
  const maxResend = settings?.otpMaxResend ?? 5
  const ttlSeconds = settings?.otpTtlSeconds ?? 300

  const existing = await prisma.phoneOtpVerification.findFirst({
    where: { phone, status: "pending" },
    orderBy: { createdAt: "desc" },
  })

  if (existing) {
    if (existing.lastSentAt) {
      const elapsed = (Date.now() - existing.lastSentAt.getTime()) / 1000
      if (elapsed < cooldownSeconds) {
        const remaining = Math.ceil(cooldownSeconds - elapsed)
        throw new Error(`Please wait ${remaining} seconds before requesting a new OTP`)
      }
    }

    if (existing.resendCount >= maxResend) {
      throw new Error("Maximum OTP resend limit reached. Please try again later.")
    }
  }

  const code = generateOtp()
  const hashedOtp = await bcrypt.hash(code, HASH_ROUNDS)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)

  const provider = getOtpProvider()
  const result = await provider.sendOtp(phone, code)

  if (!result.success) {
    throw new Error(result.error ?? "Failed to send OTP")
  }

  if (existing) {
    await prisma.phoneOtpVerification.update({
      where: { id: existing.id },
      data: {
        hashedOtp,
        resendCount: { increment: 1 },
        lastSentAt: now,
        expiresAt,
      },
    })
  } else {
    await prisma.phoneOtpVerification.create({
      data: {
        phone,
        hashedOtp,
        expiresAt,
        lastSentAt: now,
      },
    })
  }

  return {
    phone,
    maskedPhone: maskPhone(phone),
    cooldownSeconds,
    expiresInSeconds: ttlSeconds,
  }
}

export async function verifyCheckoutOtp(phoneInput: string, code: string) {
  const phone = assertValidBdPhone(phoneInput)

  const settings = await getSettings()
  const checkoutTokenTtl = settings?.checkoutTokenTtlSeconds ?? 900
  const maxAttempts = 5

  const record = await prisma.phoneOtpVerification.findFirst({
    where: { phone, status: "pending" },
    orderBy: { createdAt: "desc" },
  })

  if (!record) {
    throw new Error("No OTP request found. Please request an OTP first.")
  }

  if (new Date() > record.expiresAt) {
    throw new Error("OTP has expired. Please request a new one.")
  }

  if (record.attempts >= maxAttempts) {
    throw new Error("Too many failed attempts. Please request a new OTP.")
  }

  const isValid = await bcrypt.compare(code, record.hashedOtp)

  if (!isValid) {
    await prisma.phoneOtpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    throw new Error("Invalid OTP code.")
  }

  const checkoutToken = crypto.randomBytes(32).toString("hex")
  const now = new Date()
  const checkoutTokenExpiresAt = new Date(now.getTime() + checkoutTokenTtl * 1000)

  await prisma.phoneOtpVerification.update({
    where: { id: record.id },
    data: {
      status: "verified",
      verifiedAt: now,
      checkoutToken,
      checkoutTokenExpiresAt,
    },
  })

  return {
    checkoutVerificationToken: checkoutToken,
    expiresInSeconds: checkoutTokenTtl,
  }
}

export async function consumeCheckoutVerificationToken(token: string, phoneInput: string) {
  const phone = assertValidBdPhone(phoneInput)

  const result = await prisma.phoneOtpVerification.updateMany({
    where: {
      checkoutToken: token,
      checkoutTokenUsedAt: null,
      checkoutTokenExpiresAt: { gt: new Date() },
      phone,
    },
    data: {
      checkoutTokenUsedAt: new Date(),
    },
  })

  if (result.count !== 1) {
    const record = await prisma.phoneOtpVerification.findUnique({
      where: { checkoutToken: token },
    })
    if (!record) throw new Error("Invalid verification token.")
    if (record.phone !== phone) throw new Error("Token does not match the provided phone number.")
    if (!record.checkoutTokenExpiresAt || new Date() > record.checkoutTokenExpiresAt) {
      throw new Error("Verification token has expired.")
    }
    throw new Error("Verification token has already been used.")
  }

  return { phone }
}

export async function isCheckoutVerificationTokenValid(token: string, phoneInput: string) {
  try {
    const phone = assertValidBdPhone(phoneInput)

    const record = await prisma.phoneOtpVerification.findUnique({
      where: { checkoutToken: token },
    })

    if (!record) return false
    if (record.phone !== phone) return false
    if (!record.checkoutTokenExpiresAt || new Date() > record.checkoutTokenExpiresAt) return false
    if (record.checkoutTokenUsedAt) return false

    return true
  } catch {
    return false
  }
}
