import { NextResponse } from "next/server"
import type { ApiResponse } from "@/types"

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message } satisfies ApiResponse, { status })
}
