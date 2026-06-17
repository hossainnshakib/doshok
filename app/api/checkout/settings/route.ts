import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"

export const dynamic = "force-dynamic"

const COD_ONLY_PAYMENT_RULE = "cod_only" as const

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
        defaultPaymentRule: COD_ONLY_PAYMENT_RULE,
        defaultPaymentRuleValue: null,
      })
    }

    return success({
      checkoutV2Enabled: settings.checkoutV2Enabled,
      otpRequired: settings.otpRequired,
      otpCooldownSeconds: settings.otpCooldownSeconds,
      otpTtlSeconds: settings.otpTtlSeconds,
      checkoutTokenTtlSeconds: settings.checkoutTokenTtlSeconds,
      otpProvider: (process.env.OTP_PROVIDER ?? "mock") as "firebase" | "mock",
      defaultPaymentRule: COD_ONLY_PAYMENT_RULE,
      defaultPaymentRuleValue: null,
    })
  } catch {
    return error("Failed to fetch checkout settings")
  }
}
