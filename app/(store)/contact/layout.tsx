import type { Metadata } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export const metadata: Metadata = {
  title: "Contact – Doshok",
  description: "Get in touch with Doshok support. Email, phone, WhatsApp, and business hours for orders, delivery, returns, and general inquiries.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: "Contact – Doshok",
    description: "Get in touch with Doshok support. Email, phone, WhatsApp, and business hours for orders, delivery, returns, and general inquiries.",
    url: `${SITE_URL}/contact`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact – Doshok",
    description: "Get in touch with Doshok support. Email, phone, WhatsApp, and business hours for orders, delivery, returns, and general inquiries.",
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
