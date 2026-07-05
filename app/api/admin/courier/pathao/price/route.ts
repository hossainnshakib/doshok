import { NextRequest, NextResponse } from "next/server"
import { success, error } from "@/lib/api-response"
import { requireAdminPermission } from "@/lib/auth/admin"
import { calculatePrice } from "@/lib/courier/pathao/pricing"
import type { CourierDeliveryType, CourierItemType } from "@/lib/courier"
import { z } from "zod"

export const dynamic = "force-dynamic"

const priceRequestSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  cityId: z.string().min(1, "City ID is required"),
  zoneId: z.string().min(1, "Zone ID is required"),
  weight: z.number().positive("Weight must be positive").max(50, "Weight cannot exceed 50kg"),
  deliveryType: z.enum(["normal", "express", "partial"]).default("normal"),
  itemType: z.enum(["parcel", "document", "electronics", "food", "liquid", "fragile"]).default("parcel"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("operations")
    if (session instanceof NextResponse) return session

    const body = await request.json()
    const parsed = priceRequestSchema.safeParse(body)
    if (!parsed.success) {
      return error(parsed.error.issues[0]?.message ?? "Invalid input", 400)
    }

    const { storeId, cityId, zoneId, weight, deliveryType, itemType } = parsed.data

    const result = await calculatePrice({
      storeId,
      itemType: itemType as CourierItemType,
      deliveryType: deliveryType as CourierDeliveryType,
      itemWeight: weight,
      recipientCity: cityId,
      recipientZone: zoneId,
    })

    if (result.success && result.data) {
      return success({
        deliveryFee: result.data.delivery_fee,
        codCharge: result.data.cod_charge,
        weightCharge: result.data.weight_charge,
        total: result.data.price,
      })
    }

    return error(result.message || "Failed to calculate price")
  } catch {
    return error("Failed to calculate price")
  }
}
