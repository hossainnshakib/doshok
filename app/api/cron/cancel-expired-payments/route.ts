import { NextRequest, NextResponse } from "next/server"
import { success } from "@/lib/api-response"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  const cronHeader = request.headers.get("x-cron-secret")
  const secret = process.env.CRON_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ success: false, error: "CRON_SECRET not configured" }, { status: 500 })
    }
    console.warn("[cron] CRON_SECRET not set. Skipping auth check in development.")
  } else {
    const provided = (authHeader?.replace("Bearer ", "") || cronHeader || "").trim()
    if (!provided || provided !== secret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
  }

  return success({ processed: 0, skipped: 0, failed: 0 })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
