import { NextResponse } from "next/server"
import { trackEvent } from "@/lib/trakon"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event_name, ga4_client_id, ...eventData } = body ?? {}

    if (!event_name || typeof event_name !== "string") {
      return NextResponse.json({ success: false, error: "event_name is required" }, { status: 400 })
    }

    // Server-side: attach GA4 credentials from server-only env vars.
    // These are NEVER exposed to the client.
    const ga4_measurement_id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
    const ga4_api_secret = process.env.GA4_API_SECRET

    const serverEventPayload: Record<string, unknown> = {
      event_name,
      ...eventData,
      ...(ga4_measurement_id && ga4_api_secret ? { ga4_measurement_id, ga4_api_secret } : {}),
      ...(ga4_client_id ? { ga4_client_id } : {}),
    }

    await trackEvent(event_name, serverEventPayload)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to track event" }, { status: 500 })
  }
}
