import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const adminEmail = process.env.ADMIN_EMAIL || "admin@doshok.com"
const fromEmail = process.env.FROM_EMAIL || "noreply@doshok.com"
const otpFromEmail = process.env.OTP_FROM_EMAIL || "Doshok <otp@doshok.com>"

function getResend(): Resend | null {
  if (!resendApiKey) return null
  return new Resend(resendApiKey)
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
          <p style="color:#888;margin-top:24px;font-size:14px;">We will contact you at ${order.customerPhone} for delivery confirmation.</p>
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
          <p><strong>Customer:</strong> ${order.customerName} (${order.customerPhone})</p>
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
