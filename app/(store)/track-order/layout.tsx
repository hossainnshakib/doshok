import type { Metadata } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export const metadata: Metadata = {
  title: "Track Order – Doshok",
  description: "Track your Doshok order by order number and phone. View live order status, delivery details, and payment information.",
  alternates: { canonical: `${SITE_URL}/track-order` },
  openGraph: {
    title: "Track Order – Doshok",
    description: "Track your Doshok order by order number and phone. View live order status, delivery details, and payment information.",
    url: `${SITE_URL}/track-order`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Track Order – Doshok",
    description: "Track your Doshok order by order number and phone. View live order status, delivery details, and payment information.",
  },
}

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
