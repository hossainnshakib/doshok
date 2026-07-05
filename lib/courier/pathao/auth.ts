import {
  getPathaoEndpoints,
  getPathaoCredentials,
  pathaoRequest,
  type PathaoTokenResponse,
  type PathaoApiResponse,
  PATHAO_PROVIDER_CODE,
} from "./client"
import {
  getCourierToken,
  saveCourierToken,
  deleteCourierToken,
} from "@/lib/courier"

const TOKEN_EXPIRY_BUFFER_SECONDS = 300

export async function issueAccessToken(): Promise<PathaoApiResponse<PathaoTokenResponse> & { expiresAt?: Date }> {
  const credentials = await getPathaoCredentials()
  if (!credentials) {
    return {
      success: false,
      data: null as unknown as PathaoTokenResponse,
      message: "Pathao credentials not configured in database",
    }
  }

  const provider = await import("@/lib/courier").then(m => m.getCourierProviderByCode(PATHAO_PROVIDER_CODE))
  const environment = provider?.environment ?? "sandbox"
  const endpoints = getPathaoEndpoints(environment)

  const response = await pathaoRequest<PathaoTokenResponse>(
    endpoints.AUTH,
    {
      method: "POST",
      body: {
        grant_type: "password",
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password,
      },
      credentials,
      action: "issue_access_token",
      logRequest: true,
    }
  )

  if (response.success && response.data) {
    const expiresAt = new Date(Date.now() + (response.data.expires_in - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000)
    await saveCourierToken(PATHAO_PROVIDER_CODE, {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt,
    })
    return { ...response, expiresAt }
  }

  return response
}

export async function refreshAccessToken(): Promise<PathaoApiResponse<PathaoTokenResponse> & { expiresAt?: Date }> {
  const credentials = await getPathaoCredentials()
  if (!credentials) {
    return {
      success: false,
      data: null as unknown as PathaoTokenResponse,
      message: "Pathao credentials not configured",
    }
  }

  const existingToken = await getCourierToken(PATHAO_PROVIDER_CODE)
  if (!existingToken?.refreshToken) {
    return {
      success: false,
      data: null as unknown as PathaoTokenResponse,
      message: "No refresh token available",
    }
  }

  const provider = await import("@/lib/courier").then(m => m.getCourierProviderByCode(PATHAO_PROVIDER_CODE))
  const environment = provider?.environment ?? "sandbox"
  const endpoints = getPathaoEndpoints(environment)

  const response = await pathaoRequest<PathaoTokenResponse>(
    endpoints.REFRESH,
    {
      method: "POST",
      body: {
        grant_type: "refresh_token",
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: existingToken.refreshToken,
      },
      credentials,
      action: "refresh_access_token",
    }
  )

  if (response.success && response.data) {
    const expiresAt = new Date(Date.now() + (response.data.expires_in - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000)
    await saveCourierToken(PATHAO_PROVIDER_CODE, {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt,
    })
    return { ...response, expiresAt }
  }

  return response
}

export async function getValidToken(): Promise<PathaoApiResponse<{ accessToken: string }>> {
  const existingToken = await getCourierToken(PATHAO_PROVIDER_CODE)

  if (existingToken) {
    const tokenExpiresAt = new Date(existingToken.expiresAt)
    const bufferMs = TOKEN_EXPIRY_BUFFER_SECONDS * 1000

    if (tokenExpiresAt.getTime() - Date.now() > bufferMs) {
      return {
        success: true,
        data: { accessToken: existingToken.accessToken },
      }
    }

    const refreshResult = await refreshAccessToken()
    if (refreshResult.success) {
      return {
        success: true,
        data: { accessToken: refreshResult.data.access_token },
      }
    }
  }

  const issueResult = await issueAccessToken()
  if (issueResult.success) {
    return {
      success: true,
      data: { accessToken: issueResult.data.access_token },
    }
  }

  return {
    success: false,
    data: null as unknown as { accessToken: string },
    message: issueResult.message || "Failed to obtain access token",
  }
}

export async function revokeToken(): Promise<void> {
  await deleteCourierToken(PATHAO_PROVIDER_CODE)
}
