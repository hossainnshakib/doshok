import { NextResponse } from "next/server"
import { trackEvent } from "@/lib/trakon"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event_name, ...eventData } = body ?? {}
    delete eventData.pixel_id
    delete eventData.access_token

    if (!event_name || typeof event_name !== "string") {
      return NextResponse.json({ success: false, error: "event_name is required" }, { status: 400 })
    }

    console.log("Trakon: sending event", event_name, eventData)
    await trackEvent(event_name, eventData)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to track event" }, { status: 500 })
  }
}
