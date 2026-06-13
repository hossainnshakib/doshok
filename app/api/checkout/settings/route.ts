import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const settings = await prisma.checkoutSetting.findUnique({
      where: { id: "checkout" },
    })

    if (!settings) {
      return success({
        checkoutV2Enabled: false,
        otpRequired: true,
        otpCooldownSeconds: 30,
        otpTtlSeconds: 300,
        checkoutTokenTtlSeconds: 900,
        otpProvider: (process.env.OTP_PROVIDER ?? "mock") as "firebase" | "mock",
      })
    }

    return success({
      checkoutV2Enabled: settings.checkoutV2Enabled,
      otpRequired: settings.otpRequired,
      otpCooldownSeconds: settings.otpCooldownSeconds,
      otpTtlSeconds: settings.otpTtlSeconds,
      checkoutTokenTtlSeconds: settings.checkoutTokenTtlSeconds,
      otpProvider: (process.env.OTP_PROVIDER ?? "mock") as "firebase" | "mock",
    })
  } catch {
    return error("Failed to fetch checkout settings")
  }
}
