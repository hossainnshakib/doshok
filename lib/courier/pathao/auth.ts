import {
  getPathaoEndpoints,
  getPathaoCredentials,
  pathaoTokenRequest,
  type PathaoTokenResponse,
  type PathaoApiResponse,
  type PathaoEnvironment,
  PATHAO_PROVIDER_CODE,
} from "./client"
import {
  getCourierToken,
  saveCourierToken,
  deleteCourierToken,
  getCourierProviderByCode,
} from "@/lib/courier"

const TOKEN_EXPIRY_BUFFER_SECONDS = 300

export async function issueAccessToken(environment: string): Promise<PathaoApiResponse<PathaoTokenResponse> & { expiresAt?: Date }> {
  const credentials = await getPathaoCredentials()
  if (!credentials) {
    return {
      success: false,
      data: null as unknown as PathaoTokenResponse,
      message: "Pathao credentials not configured in database",
    }
  }

  const endpoints = getPathaoEndpoints(environment as PathaoEnvironment)

  const response = await pathaoTokenRequest(
    endpoints.AUTH,
    {
      grant_type: "password",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      username: credentials.username,
      password: credentials.password,
    },
    PATHAO_PROVIDER_CODE,
    environment
  )

  if (response.success && response.data) {
    const expiresAt = new Date(Date.now() + (response.data.expires_in - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000)
    await saveCourierToken(PATHAO_PROVIDER_CODE, environment, {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt,
    })
    return { ...response, expiresAt }
  }

  return response
}

export async function refreshAccessToken(environment: string): Promise<PathaoApiResponse<PathaoTokenResponse> & { expiresAt?: Date }> {
  const credentials = await getPathaoCredentials()
  if (!credentials) {
    return {
      success: false,
      data: null as unknown as PathaoTokenResponse,
      message: "Pathao credentials not configured",
    }
  }

  const existingToken = await getCourierToken(PATHAO_PROVIDER_CODE, environment)
  if (!existingToken?.refreshToken) {
    return {
      success: false,
      data: null as unknown as PathaoTokenResponse,
      message: "No refresh token available",
    }
  }

  const endpoints = getPathaoEndpoints(environment as PathaoEnvironment)

  const response = await pathaoTokenRequest(
    endpoints.REFRESH,
    {
      grant_type: "refresh_token",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: existingToken.refreshToken,
    },
    PATHAO_PROVIDER_CODE,
    environment
  )

  if (response.success && response.data) {
    const expiresAt = new Date(Date.now() + (response.data.expires_in - TOKEN_EXPIRY_BUFFER_SECONDS) * 1000)
    await saveCourierToken(PATHAO_PROVIDER_CODE, environment, {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt,
    })
    return { ...response, expiresAt }
  }

  return response
}

export async function getValidToken(environment?: string): Promise<PathaoApiResponse<{ accessToken: string }>> {
  const env = environment ?? (await getCourierProviderByCode(PATHAO_PROVIDER_CODE))?.environment ?? "sandbox"

  const existingToken = await getCourierToken(PATHAO_PROVIDER_CODE, env)

  if (existingToken) {
    const tokenExpiresAt = new Date(existingToken.expiresAt)
    const bufferMs = TOKEN_EXPIRY_BUFFER_SECONDS * 1000

    if (tokenExpiresAt.getTime() - Date.now() > bufferMs) {
      return {
        success: true,
        data: { accessToken: existingToken.accessToken },
      }
    }

    const refreshResult = await refreshAccessToken(env)
    if (refreshResult.success) {
      return {
        success: true,
        data: { accessToken: refreshResult.data.access_token },
      }
    }
  }

  const issueResult = await issueAccessToken(env)
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

export async function revokeToken(environment?: string): Promise<void> {
  const env = environment ?? (await getCourierProviderByCode(PATHAO_PROVIDER_CODE))?.environment ?? "sandbox"
  await deleteCourierToken(PATHAO_PROVIDER_CODE, env)
}
