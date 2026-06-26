import type { Metadata } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export const metadata: Metadata = {
  title: "Cart – Doshok",
  description: "Review your shopping cart at Doshok. Check items, update quantities, and proceed to secure checkout.",
  alternates: { canonical: `${SITE_URL}/cart` },
  openGraph: {
    title: "Cart – Doshok",
    description: "Review your shopping cart at Doshok. Check items, update quantities, and proceed to secure checkout.",
    url: `${SITE_URL}/cart`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Cart – Doshok",
    description: "Review your shopping cart at Doshok. Check items, update quantities, and proceed to secure checkout.",
  },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
