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

  const organizationJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": settings?.brandName || "Doshok",
    "url": SITE_URL,
    "description": settings?.tagline || "Style That Speaks. Premium women's fashion in Bangladesh — curated dresses, tops, and occasion wear for the modern wardrobe.",
    ...(settings?.phone && { "telephone": settings.phone }),
    ...(settings?.supportEmail && { "email": settings.supportEmail }),
    ...(settings?.address && { "address": { "@type": "PostalAddress", "addressCountry": "BD", "streetAddress": settings.address } }),
    ...(settings?.headerLogo && { "logo": settings.headerLogo }),
    ...(sameAs.length > 0 && { "sameAs": sameAs }),
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "@id": "https://doshok.com/returns#policy",
      "name": "7-Day Return Policy",
      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": 7,
      "returnMethod": "https://schema.org/ReturnByMail",
      "returnFees": "https://schema.org/FreeReturn",
      "applicableCountry": "BD",
    },
  }

  const websiteJsonLd: Record<string, unknown> = {
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
