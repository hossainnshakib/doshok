import {
  getCourierProviderByCode,
  createCourierLog,
  type CourierLogData,
} from "@/lib/courier"

export const PATHAO_PROVIDER_CODE = "pathao"

export const PATHAO_ENDPOINTS = {
  SANDBOX: {
    AUTH: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/issue-token",
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
    AUTH: "https://courier-api.pathao.com/aladdin/api/v1/issue-token",
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
            errorMessage,
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
      errorMessage: !response.ok ? buildErrorMessage(responseData as PathaoApiError, responseStatus) : null,
    }
    await createCourierLog(logData)
  }

  if (!response.ok) {
    const errorMessage = buildErrorMessage(responseData as PathaoApiError, responseStatus)
    return {
      success: false,
      data: null as unknown as T,
      code: responseStatus,
      message: errorMessage,
      errors: [{ message: errorMessage }],
    }
  }

  return responseData as PathaoApiResponse<T>
}

function buildErrorMessage(err: PathaoApiError, statusCode?: number): string {
  const errorObj: Record<string, unknown> = {}
  if (err.error !== undefined) errorObj.error = err.error
  if (err.error_description !== undefined) errorObj.error_description = err.error_description
  if (err.message !== undefined) errorObj.message = err.message
  if (err.code !== undefined) errorObj.code = err.code
  if (Object.keys(errorObj).length === 0) errorObj.error = "Unknown error"

  const prefix = statusCode ? `Pathao API error ${statusCode}:` : "Pathao API error:"
  return `${prefix}\n${JSON.stringify(errorObj, null, 2)}`
}

export function stringifyError(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (value instanceof Error) return value.message
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export async function pathaoTokenRequest(
  endpoint: string,
  body: Record<string, string>,
  providerCode: string = PATHAO_PROVIDER_CODE
): Promise<PathaoApiResponse<PathaoTokenResponse>> {
  const startTime = Date.now()
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  const sanitizedBody: Record<string, string> = {}
  for (const [key, value] of Object.entries(body)) {
    if (["client_secret", "password", "refresh_token"].includes(key)) {
      sanitizedBody[key] = "[REDACTED]"
    } else {
      sanitizedBody[key] = value
    }
  }

  const formBody = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    formBody.append(key, value)
  }

  let response: Response
  let responseData: PathaoApiResponse<PathaoTokenResponse> | PathaoApiError

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formBody.toString(),
    })

    const text = await response.text()
    if (text) {
      try {
        responseData = JSON.parse(text)
      } catch {
        const durationMs = Date.now() - startTime
        const errorMessage = `Pathao token endpoint returned non-JSON (status ${response.status}): ${text.substring(0, 500)}`

        await createCourierLog({
          providerCode,
          action: "token_request",
          requestUrl: endpoint,
          requestMethod: "POST",
          requestBody: sanitizedBody as object,
          responseStatus: response.status,
          responseBody: { raw: text.substring(0, 1000) },
          errorMessage,
          durationMs,
        })

        return {
          success: false,
          data: null as unknown as PathaoTokenResponse,
          message: errorMessage,
          code: response.status,
        }
      }
    } else {
      responseData = { error: "Empty response body" } as PathaoApiError
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : "Network error"

    await createCourierLog({
      providerCode,
      action: "token_request",
      requestUrl: endpoint,
      requestMethod: "POST",
      requestBody: sanitizedBody as object,
      responseStatus: null,
      errorMessage,
      durationMs,
    })

    return {
      success: false,
      data: null as unknown as PathaoTokenResponse,
      message: errorMessage,
    }
  }

  const durationMs = Date.now() - startTime
  const responseStatus = response.status

  if (!response.ok) {
    const errorMessage = buildErrorMessage(responseData as PathaoApiError, responseStatus)

    await createCourierLog({
      providerCode,
      action: "token_request",
      requestUrl: endpoint,
      requestMethod: "POST",
      requestBody: sanitizedBody as object,
      responseBody: responseData as object,
      responseStatus,
      errorMessage,
      durationMs,
    })

    return {
      success: false,
      data: null as unknown as PathaoTokenResponse,
      message: errorMessage,
      code: responseStatus,
    }
  }

  await createCourierLog({
    providerCode,
    action: "token_request",
    requestUrl: endpoint,
    requestMethod: "POST",
    requestBody: sanitizedBody as object,
    responseBody: responseData as object,
    responseStatus,
    durationMs,
    errorMessage: null,
  })

  return responseData as PathaoApiResponse<PathaoTokenResponse>
}
