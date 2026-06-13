import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { assertValidBdPhone } from "./phone"
import { verifyFirebaseIdToken } from "@/lib/firebase/admin"

export async function verifyFirebaseOtpAndIssueCheckoutToken({
  firebaseIdToken,
  phone,
}: {
  firebaseIdToken: string
  phone: string
}) {
  const normalizedPhone = assertValidBdPhone(phone)

  const decodedToken = await verifyFirebaseIdToken(firebaseIdToken)

  if (!decodedToken.phone_number) {
    throw new Error("Firebase token does not contain a verified phone number")
  }

  if (decodedToken.phone_number !== normalizedPhone) {
    throw new Error(
      "Firebase verified phone number does not match the provided phone"
    )
  }

  const settings = await prisma.checkoutSetting.findUnique({
    where: { id: "checkout" },
  })

  const checkoutTokenTtl = settings?.checkoutTokenTtlSeconds ?? 900
  const otpTtlSeconds = settings?.otpTtlSeconds ?? 300

  const checkoutToken = crypto.randomBytes(32).toString("hex")
  const now = new Date()
  const checkoutTokenExpiresAt = new Date(
    now.getTime() + checkoutTokenTtl * 1000
  )
  const expiresAt = new Date(now.getTime() + otpTtlSeconds * 1000)

  const existing = await prisma.phoneOtpVerification.findFirst({
    where: { phone: normalizedPhone, status: "pending" },
    orderBy: { createdAt: "desc" },
  })

  if (existing) {
    await prisma.phoneOtpVerification.update({
      where: { id: existing.id },
      data: {
        provider: "firebase",
        status: "verified",
        verifiedAt: now,
        checkoutToken,
        checkoutTokenExpiresAt,
        expiresAt,
      },
    })
  } else {
    await prisma.phoneOtpVerification.create({
      data: {
        phone: normalizedPhone,
        hashedOtp: "",
        provider: "firebase",
        status: "verified",
        verifiedAt: now,
        expiresAt,
        checkoutToken,
        checkoutTokenExpiresAt,
      },
    })
  }

  return {
    checkoutVerificationToken: checkoutToken,
    expiresInSeconds: checkoutTokenTtl,
  }
}
