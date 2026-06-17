import { getSiteSettings } from "@/lib/site-settings"
import { safeJsonLd } from "@/lib/json-ld"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function OrganizationSchema() {
  const settings = await getSiteSettings()

  const sameAs = [
    settings?.facebookUrl,
    settings?.instagramUrl,
    settings?.tiktokUrl,
    settings?.youtubeUrl,
  ].filter(Boolean)

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": settings?.brandName || "Doshok",
    "url": SITE_URL,
    ...(settings?.headerLogo && { "logo": settings.headerLogo }),
    ...(sameAs.length > 0 && { "sameAs": sameAs }),
  }

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": settings?.brandName || "Doshok",
    "url": SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(organizationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(websiteJsonLd),
        }}
      />
    </>
  )
}
