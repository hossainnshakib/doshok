import { Resend } from "resend"
import { getPhoneDisplayE164 } from "@/lib/utils"

const resendApiKey = process.env.RESEND_API_KEY
const adminEmail = process.env.ADMIN_EMAIL || "admin@doshok.com"
const fromEmail = process.env.FROM_EMAIL || "noreply@doshok.com"
const otpFromEmail = process.env.OTP_FROM_EMAIL || "Doshok <otp@doshok.com>"
const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

function getResend(): Resend | null {
  if (!resendApiKey) return null
  return new Resend(resendApiKey)
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  try {
    const resend = getResend()
    if (!resend) return

    const verifyUrl = `${appUrl}/verify-email?token=${token}`

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Verify your email — Doshok",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
          <div style="background:#fff;border-radius:12px;padding:32px;text-align:center;">
            <h1 style="font-size:24px;color:#111;margin:0 0 8px;">Doshok</h1>
            <p style="color:#555;margin:0 0 24px;">Style That Speaks</p>
            <p style="font-size:14px;color:#555;margin:0 0 24px;">Click the button below to verify your email address.</p>
            <a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;margin:0 0 24px;">Verify Email</a>
            <p style="font-size:13px;color:#888;margin:0 0 4px;">Or copy this link into your browser:</p>
            <p style="font-size:12px;color:#888;margin:0;word-break:break-all;">${verifyUrl}</p>
            <p style="font-size:13px;color:#888;margin:24px 0 0;">This link expires in 24 hours.</p>
            <p style="font-size:13px;color:#888;margin:4px 0 0;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    })
  } catch {
    console.warn("[mailer] sendVerificationEmail failed")
  }
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  try {
    const resend = getResend()
    if (!resend) return

    await resend.emails.send({
      from: otpFromEmail,
      to: email,
      subject: "Your Doshok Verification Code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
          <div style="background:#fff;border-radius:12px;padding:32px;text-align:center;">
            <h1 style="font-size:24px;color:#111;margin:0 0 8px;">Doshok</h1>
            <p style="color:#555;margin:0 0 24px;">Style That Speaks</p>
            <div style="background:#f3f0ff;border-radius:8px;padding:24px;margin:0 0 24px;">
              <p style="font-size:14px;color:#555;margin:0 0 8px;">Your verification code</p>
              <p style="font-size:36px;font-weight:bold;color:#111;letter-spacing:8px;margin:0;font-family:monospace;">${code}</p>
            </div>
            <p style="font-size:13px;color:#888;margin:0 0 4px;">This code expires in 5 minutes.</p>
            <p style="font-size:13px;color:#888;margin:0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    })
  } catch {
    console.warn("[mailer] sendOtpEmail failed")
  }
}

type OrderData = {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  total: number
  subtotal: number
  deliveryFee: number
  paymentMethod: string
  orderStatus: string
  items: { name: string; quantity: number; price: number; size?: string | null; color?: string | null }[]
}

export async function sendOrderConfirmationEmail(order: OrderData): Promise<void> {
  try {
    const resend = getResend()
    if (!resend || !order.customerEmail) return

    const itemsHtml = order.items
      .map(
        (item) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.name}${item.size ? ` (${item.size}${item.color ? ` / ${item.color}` : ""})` : ""}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">৳${(item.price * item.quantity).toLocaleString()}</td></tr>`
      )
      .join("")

    await resend.emails.send({
      from: fromEmail,
      to: order.customerEmail,
      subject: `Order Confirmed — ${order.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h1 style="color:#111;margin-bottom:8px;">Thank you, ${order.customerName}!</h1>
          <p style="color:#555;margin-bottom:24px;">Your order <strong>${order.orderNumber}</strong> has been placed successfully.</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr><th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">Item</th><th style="padding:8px;border-bottom:2px solid #ddd;text-align:center;">Qty</th><th style="padding:8px;border-bottom:2px solid #ddd;text-align:right;">Price</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="margin-top:16px;border-top:2px solid #ddd;padding-top:12px;">
            <p style="display:flex;justify-content:space-between;margin:4px 0;"><span>Subtotal</span><span>৳${order.subtotal.toLocaleString()}</span></p>
            <p style="display:flex;justify-content:space-between;margin:4px 0;"><span>Delivery Fee</span><span>৳${order.deliveryFee.toLocaleString()}</span></p>
            <p style="display:flex;justify-content:space-between;margin:4px 0;font-size:18px;font-weight:bold;"><span>Total</span><span>৳${order.total.toLocaleString()}</span></p>
          </div>
          <p style="color:#888;margin-top:24px;font-size:14px;">We will contact you at ${getPhoneDisplayE164(order.customerPhone)} for delivery confirmation.</p>
        </div>
      `,
    })
  } catch {
    console.warn("[mailer] sendOrderConfirmationEmail skipped or failed")
  }
}

export async function sendContactEmail(params: {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}): Promise<void> {
  try {
    const resend = getResend()
    if (!resend) return

    const subjectLine = params.subject
      ? `Contact Form: ${params.subject}`
      : `Contact Form: ${params.name}`

    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: subjectLine,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#111;">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;width:100px;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.name}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.email}</td></tr>
            ${params.phone ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Phone</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.phone}</td></tr>` : ""}
            ${params.subject ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Subject</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.subject}</td></tr>` : ""}
          </table>
          <div style="margin-top:16px;padding:16px;background:#f5f5f5;border-radius:4px;">
            <p style="margin:0;white-space:pre-wrap;">${params.message}</p>
          </div>
        </div>
      `,
    })
  } catch {
    console.warn("[mailer] sendContactEmail skipped or failed")
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  try {
    const resend = getResend()
    if (!resend) return

    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset your password — Doshok",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
          <div style="background:#fff;border-radius:12px;padding:32px;text-align:center;">
            <h1 style="font-size:24px;color:#111;margin:0 0 8px;">Doshok</h1>
            <p style="color:#555;margin:0 0 24px;">Style That Speaks</p>
            <p style="font-size:14px;color:#555;margin:0 0 24px;">We received a request to reset your password. Click the button below to set a new one.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;margin:0 0 24px;">Reset Password</a>
            <p style="font-size:13px;color:#888;margin:0 0 4px;">Or copy this link into your browser:</p>
            <p style="font-size:12px;color:#888;margin:0;word-break:break-all;">${resetUrl}</p>
            <p style="font-size:13px;color:#888;margin:24px 0 0;">This link expires in 30 minutes.</p>
            <p style="font-size:13px;color:#888;margin:4px 0 0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    })
  } catch {
    console.warn("[mailer] sendPasswordResetEmail failed")
  }
}

export async function sendOrderStatusEmail(order: OrderData, newStatus: string): Promise<void> {
  const supportedStatuses = ["confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]
  if (!supportedStatuses.includes(newStatus)) return

  const statusSubjects: Record<string, string> = {
    confirmed: `Order Confirmed — ${order.orderNumber}`,
    processing: `Order Being Prepared — ${order.orderNumber}`,
    shipped: `Order Shipped — ${order.orderNumber}`,
    delivered: `Order Delivered — ${order.orderNumber}`,
    cancelled: `Order Cancelled — ${order.orderNumber}`,
    returned: `Order Returned — ${order.orderNumber}`,
  }

  const statusHeadlines: Record<string, string> = {
    confirmed: "Your order has been confirmed!",
    processing: "We're preparing your order.",
    shipped: "Your order is on its way!",
    delivered: "Your order has been delivered.",
    cancelled: "Your order has been cancelled.",
    returned: "Your order has been returned.",
  }

  try {
    const resend = getResend()
    if (!resend || !order.customerEmail) return

    const itemsHtml = order.items
      .map(
        (item) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.name}${item.size ? ` (${item.size}${item.color ? ` / ${item.color}` : ""})` : ""}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">৳${(item.price * item.quantity).toLocaleString()}</td></tr>`
      )
      .join("")

    await resend.emails.send({
      from: fromEmail,
      to: order.customerEmail,
      subject: statusSubjects[newStatus] || `Order Update — ${order.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h1 style="color:#111;margin-bottom:8px;">${statusHeadlines[newStatus] || `Order Update — ${order.orderNumber}`}</h1>
          <p style="color:#555;margin-bottom:24px;">Dear ${order.customerName}, your order <strong>${order.orderNumber}</strong> has been updated.</p>
          <p style="color:#111;margin-bottom:16px;"><strong>New Status:</strong> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr><th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">Item</th><th style="padding:8px;border-bottom:2px solid #ddd;text-align:center;">Qty</th><th style="padding:8px;border-bottom:2px solid #ddd;text-align:right;">Price</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="margin-top:16px;border-top:2px solid #ddd;padding-top:12px;">
            <p style="display:flex;justify-content:space-between;margin:4px 0;"><span>Subtotal</span><span>৳${order.subtotal.toLocaleString()}</span></p>
            <p style="display:flex;justify-content:space-between;margin:4px 0;"><span>Delivery Fee</span><span>৳${order.deliveryFee.toLocaleString()}</span></p>
            <p style="display:flex;justify-content:space-between;margin:4px 0;font-size:18px;font-weight:bold;"><span>Total</span><span>৳${order.total.toLocaleString()}</span></p>
          </div>
          <p style="color:#888;margin-top:24px;font-size:14px;">Track your order at ${appUrl}/track-order</p>
        </div>
      `,
    })
  } catch {
    console.warn("[mailer] sendOrderStatusEmail skipped or failed")
  }
}

export async function sendAdminNewOrderEmail(order: OrderData): Promise<void> {
  try {
    const resend = getResend()
    if (!resend) return

    const itemsText = order.items
      .map((item) => `  ${item.name} x${item.quantity} — ৳${(item.price * item.quantity).toLocaleString()}`)
      .join("\n")

    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `New Order — ${order.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#111;">New Order: ${order.orderNumber}</h2>
          <p><strong>Customer:</strong> ${order.customerName} (${getPhoneDisplayE164(order.customerPhone)})</p>
          <p><strong>Payment:</strong> ${order.paymentMethod}</p>
          <pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:13px;">${itemsText}</pre>
          <p style="font-size:18px;font-weight:bold;">Total: ৳${order.total.toLocaleString()}</p>
        </div>
      `,
    })
  } catch {
    console.warn("[mailer] sendAdminNewOrderEmail skipped or failed")
  }
}
