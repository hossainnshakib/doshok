import { prisma } from "@/lib/prisma"

const OTP_EXPIRY_MINUTES = 5
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MINUTES = 10

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
}

export function getRateLimitWindowStart(): Date {
  return new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)
}

export async function isRateLimited(email: string): Promise<boolean> {
  const windowStart = getRateLimitWindowStart()
  const count = await prisma.otpVerification.count({
    where: {
      email: email.toLowerCase(),
      createdAt: { gte: windowStart },
    },
  })
  return count >= RATE_LIMIT_MAX
}

export async function invalidatePreviousOtps(email: string): Promise<void> {
  await prisma.otpVerification.updateMany({
    where: { email: email.toLowerCase(), verified: false, expiresAt: { gte: new Date() } },
    data: { expiresAt: new Date(0) },
  })
}

export async function createOtp(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase()
  const code = generateOtpCode()
  await invalidatePreviousOtps(normalizedEmail)
  await prisma.otpVerification.create({
    data: {
      email: normalizedEmail,
      code,
      expiresAt: getOtpExpiry(),
    },
  })
  return code
}

export async function verifyOtp(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase()
  const record = await prisma.otpVerification.findFirst({
    where: {
      email: normalizedEmail,
      code,
      verified: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!record) {
    const anyRecord = await prisma.otpVerification.findFirst({
      where: { email: normalizedEmail },
      orderBy: { createdAt: "desc" },
    })

    if (!anyRecord) return { success: false, error: "No OTP found. Please request a new one." }
    if (anyRecord.code !== code) return { success: false, error: "Invalid OTP code." }
    if (anyRecord.verified) return { success: false, error: "OTP already used." }
    if (anyRecord.expiresAt < new Date()) return { success: false, error: "OTP has expired. Please request a new one." }
    return { success: false, error: "OTP verification failed." }
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true },
  })

  return { success: true }
}
