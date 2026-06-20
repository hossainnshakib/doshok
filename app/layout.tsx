import type { Metadata } from "next"
import { Hind_Siliguri, Manrope, Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers/session-provider"
import { OrganizationSchema } from "@/components/json-ld/organization-schema"
import "./globals.css"

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
})

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
})

const hindSiliguri = Hind_Siliguri({
  variable: "--font-bn",
  subsets: ["bengali", "latin"],
  weight: ["400", "600", "700"],
})

export const metadata: Metadata = {
  title: "Doshok — Premium Bangladeshi Fashion",
  description: "Style That Speaks. Premium Bangladeshi fashion for the modern wardrobe.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    siteName: "Doshok",
    title: "Doshok — Premium Bangladeshi Fashion",
    description: "Style That Speaks. Premium Bangladeshi fashion for the modern wardrobe.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Doshok — Premium Bangladeshi Fashion",
    description: "Style That Speaks. Premium Bangladeshi fashion for the modern wardrobe.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jakarta.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <OrganizationSchema />
        <Providers>{children}</Providers>
        <Toaster richColors closeButton />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-D11HZ86XK5"
          strategy="beforeInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-D11HZ86XK5');
          `}
        </Script>
      </body>
    </html>
  )
}
