import {
  getPathaoEndpoints,
  pathaoRequest,
  type PathaoApiResponse,
  PATHAO_PROVIDER_CODE,
} from "./client"
import {
  getValidToken,
} from "./auth"
import {
  getCourierProviderByCode,
  type CourierDeliveryType,
  type CourierItemType,
} from "@/lib/courier"

export interface PathaoPriceRequest {
  storeId: string
  itemType: CourierItemType
  deliveryType: CourierDeliveryType
  itemWeight: number
  recipientCity: string
  recipientZone: string
}

export interface PathaoPriceData {
  price: number
  cod_amount: number
  delivery_fee: number
  weight_charge: number
  cod_charge: number
  processing_fee: number
  messenger_fee: number
  weight_below_base: boolean
}

export const PATHAO_DELIVERY_TYPE_MAP: Record<CourierDeliveryType, number> = {
  normal: 1,
  express: 5,
  partial: 3,
}

export const PATHAO_ITEM_TYPE_MAP: Record<CourierItemType, number> = {
  parcel: 1,
  document: 2,
  electronics: 3,
  food: 4,
  liquid: 5,
  fragile: 6,
}

export async function calculatePrice(request: PathaoPriceRequest): Promise<PathaoApiResponse<PathaoPriceData>> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  const environment = provider?.environment ?? "sandbox"

  const tokenResult = await getValidToken(environment)
  if (!tokenResult.success) {
    return {
      success: false,
      data: null as unknown as PathaoPriceData,
      message: tokenResult.message,
    }
  }

  const endpoints = getPathaoEndpoints(environment)

  const deliveryTypeId = PATHAO_DELIVERY_TYPE_MAP[request.deliveryType] ?? 1
  const itemTypeId = PATHAO_ITEM_TYPE_MAP[request.itemType] ?? 1

  const priceResult = await pathaoRequest<PathaoPriceData>(
    endpoints.PRICE,
    {
      method: "POST",
      body: {
        store_id: request.storeId,
        item_type: itemTypeId,
        delivery_type: deliveryTypeId,
        item_weight: request.itemWeight,
        recipient_city: request.recipientCity,
        recipient_zone: request.recipientZone,
      },
      accessToken: tokenResult.data.accessToken,
      providerCode: PATHAO_PROVIDER_CODE,
      action: "calculate_price",
      environment,
    }
  )

  return priceResult
}
