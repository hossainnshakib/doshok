import {
  getCourierProviderByCode,
  createCourierLog,
  type CourierLogData,
} from "@/lib/courier"

export const PATHAO_PROVIDER_CODE = "pathao"

export const PATHAO_ENDPOINTS = {
  SANDBOX: {
    AUTH: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/issue-token",
    REFRESH: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/refresh-token",
    CITIES: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/city-list",
    ZONES: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/zone-list",
    AREAS: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/area-list",
    STORES: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/stores",
    PRICE: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/price-plan",
    ORDERS: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/create/order",
    ORDER_INFO: "https://courier-api-sandbox.pathao.com/aladdin/api/v1/order/info",
  },
  LIVE: {
    AUTH: "https://api-hermes.pathao.com/aladdin/api/v1/issue-token",
    REFRESH: "https://api-hermes.pathao.com/aladdin/api/v1/refresh-token",
    CITIES: "https://api-hermes.pathao.com/aladdin/api/v1/city-list",
    ZONES: "https://api-hermes.pathao.com/aladdin/api/v1/zone-list",
    AREAS: "https://api-hermes.pathao.com/aladdin/api/v1/area-list",
    STORES: "https://api-hermes.pathao.com/aladdin/api/v1/stores",
    PRICE: "https://api-hermes.pathao.com/aladdin/api/v1/price-plan",
    ORDERS: "https://api-hermes.pathao.com/aladdin/api/v1/create/order",
    ORDER_INFO: "https://api-hermes.pathao.com/aladdin/api/v1/order/info",
  },
} as const

export type PathaoEnvironment = "sandbox" | "live"

export interface PathaoCredentials {
  clientId: string
  clientSecret: string
  username: string
  password: string
  sandboxDefaultStoreId?: string
  liveDefaultStoreId?: string
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

export async function getDefaultStoreId(environment: PathaoEnvironment): Promise<string | null> {
  const creds = await getPathaoCredentials()
  if (!creds) return null
  return environment === "live" ? creds.liveDefaultStoreId ?? null : creds.sandboxDefaultStoreId ?? null
}

export interface PathaoTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface PathaoApiErrorDetail {
  source?: string
  description?: string
  [key: string]: unknown
}

export interface PathaoApiError {
  error: string | PathaoApiErrorDetail
  error_description?: string
  message?: string
  code?: number
  type?: string
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
    environment?: string
    logRequest?: boolean
    correlationId?: string
    parsedConsignmentId?: string
    parsedTrackingCode?: string
    finalResponseToFrontend?: object
  } = {}
): Promise<PathaoApiResponse<T>> {
  const startTime = Date.now()
  const {
    method = "GET",
    body,
    accessToken,
    credentials,
    providerCode = PATHAO_PROVIDER_CODE,
    orderId,
    action,
    environment = "sandbox",
    logRequest = true,
    correlationId,
    parsedConsignmentId,
    parsedTrackingCode,
    finalResponseToFrontend,
  } = options

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
            environment,
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
        environment,
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
      environment,
      orderId: orderId ?? null,
      action: action ?? method,
      requestUrl: endpoint,
      requestMethod: method,
      requestBody: sanitizeBodyForLog(body),
      responseBody: responseData as object,
      responseStatus,
      durationMs,
      errorMessage: !response.ok ? buildErrorMessage(responseData as PathaoApiError, responseStatus) : null,
      correlationId: correlationId ?? null,
      parsedConsignmentId: parsedConsignmentId ?? null,
      parsedTrackingCode: parsedTrackingCode ?? null,
      finalResponseToFrontend: finalResponseToFrontend ?? null,
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

  const responseBody = responseData as unknown as Record<string, unknown>
  if (responseBody && typeof responseBody === "object" && "data" in responseBody) {
    const dataField = responseBody.data
    if (dataField && typeof dataField === "object") {
      const innerData = dataField as Record<string, unknown>
      if ("data" in innerData && Array.isArray(innerData.data)) {
        return {
          success: true,
          data: innerData.data as T,
        }
      }
      if (!("data" in innerData) || innerData.data === undefined) {
        const resp = responseBody as unknown as PathaoApiResponse<unknown>
        return {
          success: resp.success !== false,
          data: dataField as T,
          code: resp.code,
          message: resp.message,
        }
      }
    }
  }
  return responseData as PathaoApiResponse<T>
}

function buildErrorMessage(err: PathaoApiError, statusCode?: number): string {
  const parts: string[] = []
  if (statusCode) parts.push(`HTTP ${statusCode}`)
  if (typeof err.error === "string") parts.push(err.error)
  else if (err.error) parts.push(stringifyError(err.error))
  if (err.error_description) parts.push(err.error_description)
  if (err.message) parts.push(err.message)
  if (err.type) parts.push(`type: ${err.type}`)
  if (parts.length === 0) parts.push("Unknown error")
  return parts.join(" - ")
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
  providerCode: string = PATHAO_PROVIDER_CODE,
  environment: string = "sandbox"
): Promise<PathaoApiResponse<PathaoTokenResponse>> {
  const startTime = Date.now()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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

  let response: Response
  let rawData: unknown

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    const text = await response.text()
    if (text) {
      try {
        rawData = JSON.parse(text)
      } catch {
        const durationMs = Date.now() - startTime
        const errorMessage = `Pathao token endpoint returned non-JSON (status ${response.status}): ${text.substring(0, 500)}`

        await createCourierLog({
          providerCode,
          environment,
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
      rawData = { error: "Empty response body" }
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : "Network error"

    await createCourierLog({
      providerCode,
      environment,
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
    const errorMessage = buildErrorMessage(rawData as PathaoApiError, responseStatus)

    await createCourierLog({
      providerCode,
      environment,
      action: "token_request",
      requestUrl: endpoint,
      requestMethod: "POST",
      requestBody: sanitizedBody as object,
      responseBody: rawData as object,
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
    environment,
    action: "token_request",
    requestUrl: endpoint,
    requestMethod: "POST",
    requestBody: sanitizedBody as object,
    responseBody: rawData as object,
    responseStatus,
    durationMs,
    errorMessage: null,
  })

  return {
    success: true,
    data: rawData as PathaoTokenResponse,
  }
}
