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

export async function trackEvent(event_name: string, eventData: TrakonEventData = {}) {
  try {
    if (typeof window !== "undefined") {
      await fetch(DEFAULT_CLIENT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name, ...eventData }),
        keepalive: true,
      })
      return
    }

    const server = getTrakonServer()
    const credentials = getTrakonCredentials()

    if (!server || !credentials.pixel_id || !credentials.access_token) return

    const payload: TrakonPayload = {
      ...eventData,
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
