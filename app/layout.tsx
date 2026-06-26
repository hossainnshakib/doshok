import type { Metadata } from "next"
import { Hind_Siliguri, Manrope, Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers/session-provider"
import { OrganizationSchema } from "@/components/json-ld/organization-schema"
import { TrakonPageView } from "@/components/trakon-page-view"
import { getSiteSettings } from "@/lib/site-settings"
import "./globals.css"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
    metadataBase: new URL(SITE_URL),
    title: "Doshok – Premium Women's Fashion in Bangladesh",
    description:
      "Style That Speaks. Premium women's fashion in Bangladesh — curated dresses, tops, and occasion wear for the modern wardrobe.",
    icons: {
      icon: settings?.favicon || "/favicon.ico",
      shortcut: settings?.favicon || "/favicon.ico",
      apple: settings?.appleTouchIcon || "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    other: {
      "theme-color": "#15191c",
    },
    openGraph: {
      siteName: "Doshok",
      title: "Doshok – Premium Women's Fashion in Bangladesh",
      description:
        "Style That Speaks. Premium women's fashion in Bangladesh — curated dresses, tops, and occasion wear for the modern wardrobe.",
      type: "website",
      locale: "en_US",
      url: SITE_URL,
    },
    twitter: {
      card: "summary_large_image",
      title: "Doshok – Premium Women's Fashion in Bangladesh",
      description:
        "Style That Speaks. Premium women's fashion in Bangladesh — curated dresses, tops, and occasion wear for the modern wardrobe.",
    },
  }
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
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WFC5L2JX"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <OrganizationSchema />
        <Providers>
          <Suspense fallback={null}>
            <TrakonPageView />
          </Suspense>
          {children}
        </Providers>
        <Toaster richColors closeButton />
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-WFC5L2JX');
          `}
        </Script>
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
