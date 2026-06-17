import { getFeedProducts, escapeXml, formatPrice } from "@/lib/feed"

export const dynamic = "force-dynamic"

export async function GET() {
  const products = await getFeedProducts()

  const items = products
    .map(
      (p) => `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${escapeXml(p.description)}</g:description>
      <g:link>${escapeXml(p.link)}</g:link>
      <g:image_link>${escapeXml(p.imageLink)}</g:image_link>
      ${p.additionalImageLinks
        .map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
        .join("\n")}
      <g:availability>${p.availability}</g:availability>
      <g:price>${formatPrice(p.price)}</g:price>
      ${p.salePrice !== null ? `      <g:sale_price>${formatPrice(p.salePrice)}</g:sale_price>` : ""}
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(p.brand)}</g:brand>
      ${p.productType !== null ? `      <g:product_type>${escapeXml(p.productType)}</g:product_type>` : ""}
      <g:quantity>${p.quantity}</g:quantity>
      ${p.customLabel0 !== null ? `      <g:custom_label_0>${escapeXml(p.customLabel0)}</g:custom_label_0>` : ""}
      ${p.customLabel1 !== null ? `      <g:custom_label_1>${escapeXml(p.customLabel1)}</g:custom_label_1>` : ""}
    </item>`
    )
    .join("\n")

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Doshok Product Feed</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Doshok Product Feed for Google Merchant Center</description>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  })
}
