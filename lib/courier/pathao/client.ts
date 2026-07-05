import {
  getCourierProviderByCode,
  createCourierLog,
  type CourierLogData,
} from "@/lib/courier"

export const PATHAO_PROVIDER_CODE = "pathao"

export const PATHAO_ENDPOINTS = {
  SANDBOX: {
    AUTH: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/issue-access-token",
    REFRESH: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/refresh-access-token",
    CITIES: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/city-list",
    ZONES: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/zone-list",
    AREAS: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/area-list",
    STORES: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/stores",
    PRICE: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/price-plan",
    ORDERS: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/create/order",
    ORDER_INFO: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/order/info",
  },
  LIVE: {
    AUTH: "https://courier-api.pathao.com/aladdin/api/v1/issue-access-token",
    REFRESH: "https://courier-api.pathao.com/aladdin/api/v1/refresh-access-token",
    CITIES: "https://courier-api.pathao.com/aladdin/api/v1/city-list",
    ZONES: "https://courier-api.pathao.com/aladdin/api/v1/zone-list",
    AREAS: "https://courier-api.pathao.com/aladdin/api/v1/area-list",
    STORES: "https://courier-api.pathao.com/aladdin/api/v1/stores",
    PRICE: "https://courier-api.pathao.com/aladdin/api/v1/price-plan",
    ORDERS: "https://courier-api.pathao.com/aladdin/api/v1/create/order",
    ORDER_INFO: "https://courier-api.pathao.com/aladdin/api/v1/order/info",
  },
} as const

export type PathaoEnvironment = "sandbox" | "live"

export interface PathaoCredentials {
  clientId: string
  clientSecret: string
  username: string
  password: string
  defaultStoreId?: string
}

export interface PathaoEndpoints {
  AUTH: string
  REFRESH: string
  CITIES: string
  ZONES: string
  AREAS: string
  STORES: string
  PRICE: string
  ORDERS: string
  ORDER_INFO: string
}

export function getPathaoEndpoints(environment: PathaoEnvironment): PathaoEndpoints {
  return environment === "live" ? PATHAO_ENDPOINTS.LIVE : PATHAO_ENDPOINTS.SANDBOX
}

export async function getPathaoCredentials(): Promise<PathaoCredentials | null> {
  const provider = await getCourierProviderByCode(PATHAO_PROVIDER_CODE)
  if (!provider || !provider.credentials) return null

  const creds = provider.credentials as PathaoCredentials
  if (!creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
    return null
  }

  return creds
}

export interface PathaoTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface PathaoApiError {
  error: string
  error_description?: string
  message?: string
  code?: number
}

export interface PathaoApiResponse<T> {
  data: T
  success: boolean
  code?: number
  message?: string
  errors?: Array<{ message: string; field?: string }>
}

export async function pathaoRequest<T>(
  endpoint: string,
  options: {
    method?: string
    body?: object
    accessToken?: string
    credentials?: PathaoCredentials
    providerCode?: string
    orderId?: string
    action?: string
    logRequest?: boolean
  } = {}
): Promise<PathaoApiResponse<T>> {
  const startTime = Date.now()
  const { method = "GET", body, accessToken, credentials, providerCode = PATHAO_PROVIDER_CODE, orderId, action, logRequest = true } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`
  }

  let requestBody: string | undefined
  if (body) {
    requestBody = JSON.stringify(body)
  }

  function sanitizeBodyForLog(b: object | undefined): object | null {
    if (!b) return null
    const safe = { ...b }
    const sensitiveKeys = ["client_secret", "password", "clientSecret", "client_id", "refresh_token", "access_token"]
    for (const key of sensitiveKeys) {
      if (key in safe) {
        safe[key as keyof typeof safe] = "[REDACTED]" as unknown as typeof safe[keyof typeof safe]
      }
    }
    return safe
  }

  let response: Response
  let responseData: PathaoApiResponse<T> | PathaoApiError

  try {
    response = await fetch(endpoint, {
      method,
      headers,
      body: requestBody,
    })

    const text = await response.text()
    if (text) {
      try {
        responseData = JSON.parse(text)
      } catch {
        const durationMs = Date.now() - startTime
        const errorMessage = `Pathao API returned non-JSON response (status ${response.status}): ${text.substring(0, 500)}`

        if (logRequest && providerCode) {
          const logData: CourierLogData = {
            providerCode,
            orderId: orderId ?? null,
            action: action ?? method,
            requestUrl: endpoint,
            requestMethod: method,
            requestBody: sanitizeBodyForLog(body),
            responseStatus: response.status,
            responseBody: { raw: text.substring(0, 1000) },
            errorMessage: errorMessage,
            durationMs,
          }
          await createCourierLog(logData)
        }

        return {
          success: false,
          data: null as unknown as T,
          message: errorMessage,
          code: response.status,
        } as PathaoApiResponse<T>
      }
    } else {
      responseData = { error: "Empty response body" } as PathaoApiError
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : "Network error"

    if (logRequest && providerCode) {
      const logData: CourierLogData = {
        providerCode,
        orderId: orderId ?? null,
        action: action ?? method,
        requestUrl: endpoint,
        requestMethod: method,
        requestBody: sanitizeBodyForLog(body),
        responseStatus: null,
        errorMessage,
        durationMs,
      }
      await createCourierLog(logData)
    }

    return {
      success: false,
      data: null as unknown as T,
      message: errorMessage,
    } as PathaoApiResponse<T>
  }

  const durationMs = Date.now() - startTime
  const responseStatus = response.status

  if (logRequest && providerCode) {
    const logData: CourierLogData = {
      providerCode,
      orderId: orderId ?? null,
      action: action ?? method,
      requestUrl: endpoint,
      requestMethod: method,
      requestBody: sanitizeBodyForLog(body),
      responseBody: responseData as object,
      responseStatus,
      durationMs,
      errorMessage: !response.ok ? (responseData as PathaoApiError).error || (responseData as PathaoApiError).message : null,
    }
    await createCourierLog(logData)
  }

  if (!response.ok) {
    return {
      success: false,
      data: null as unknown as T,
      code: responseStatus,
      message: (responseData as PathaoApiError).error_description || (responseData as PathaoApiError).message || "Request failed",
      errors: (responseData as PathaoApiError).error ? [{ message: (responseData as PathaoApiError).error }] : undefined,
    }
  }

  return responseData as PathaoApiResponse<T>
}
