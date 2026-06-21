type TrakonEventData = Record<string, unknown>

type TrakonPayload = TrakonEventData & {
  pixel_id?: string
  access_token?: string
  event_name: string
}

const DEFAULT_CLIENT_ENDPOINT = "/api/trakon"

function getTrakonServer() {
  return process.env.NEXT_PUBLIC_TRAKON_SERVER
}

function getTrakonCredentials() {
  return {
    pixel_id: process.env.TRAKON_PIXEL_ID,
    access_token: process.env.TRAKON_ACCESS_TOKEN,
  }
}

function getGa4Credentials() {
  const ga4_measurement_id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  const ga4_api_secret = process.env.NEXT_PUBLIC_GA4_API_SECRET
  if (!ga4_measurement_id || !ga4_api_secret) return {}
  return { ga4_measurement_id, ga4_api_secret }
}

function getGa4ClientId(): string | undefined {
  if (typeof window === "undefined") return
  let id = localStorage.getItem("ga4_client_id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("ga4_client_id", id)
  }
  return id
}

export async function trackEvent(event_name: string, eventData: TrakonEventData = {}) {
  try {
    if (typeof window !== "undefined") {
      await fetch(DEFAULT_CLIENT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name, ...eventData, ...getGa4Credentials(), ga4_client_id: getGa4ClientId() }),
        keepalive: true,
      })
      return
    }

    const server = getTrakonServer()
    const credentials = getTrakonCredentials()

    if (!server || !credentials.pixel_id || !credentials.access_token) return

    const payload: TrakonPayload = {
      ...eventData,
      ...getGa4Credentials(),
      pixel_id: credentials.pixel_id,
      access_token: credentials.access_token,
      event_name,
    }

    await fetch(`${server}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // Tracking must never block core commerce flows.
  }
}
