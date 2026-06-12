import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await prisma.careerPost.findFirst({
      where: { slug, status: "Open" },
    })
    if (!post) {
      return NextResponse.json({ success: false, error: "Career post not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: post })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch career post" }, { status: 500 })
  }
}