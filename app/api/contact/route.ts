import { NextResponse } from "next/server"
import { contactSchema } from "@/lib/validations"
import { sendContactEmail } from "@/lib/mailer"
import { rateLimitByIp } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null
  return request.headers.get("x-real-ip") || null
}

export async function POST(request: Request) {
  try {
    const { limited } = rateLimitByIp(request, 3, 60 * 1000)
    if (limited) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = contactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { name, email, phone, subject, message } = parsed.data

    await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
      },
    })

    try {
      await sendContactEmail({ name, email: email ?? "", phone, subject, message })
    } catch {
      console.warn("[contact] contact email failed after message save")
    }

    return NextResponse.json({
      success: true,
      data: { message: "Your message has been sent. We will get back to you shortly." },
    })
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 })
  }
}
