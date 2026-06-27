import { prisma } from "@/lib/prisma"
import { toAbsoluteUrl } from "@/lib/feed"

export const dynamic = "force-dynamic"

function escapeTsv(value: string | number): string {
  const str = String(value)
  if (str.includes("\t") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "Active" },
    include: {
      category: { select: { name: true } },
      variants: { select: { id: true, stock: true, reservedStock: true, size: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const headers = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "price",
    "availability",
    "condition",
    "brand",
    "identifier_exists",
  ]

  const rows = [headers.map(escapeTsv).join("\t")]

  for (const product of products) {
    if (!product.images || product.images.length === 0 || !product.images[0]?.trim()) continue

    const description = (product.seoDescription ?? product.shortDescription ?? product.description ?? "")
      .replace(/<[^>]*>/g, "")
    const imageLink = toAbsoluteUrl(product.images[0])
    const link = `https://doshok.com/products/${product.slug}`
    const price = `${product.price} BDT`
    const brand = "Doshok"

    if (product.variants.length === 0) {
      rows.push(
        [
          product.slug,
          product.name,
          description,
          link,
          imageLink,
          price,
          "out of stock",
          "new",
          brand,
          "no",
        ]
          .map(escapeTsv)
          .join("\t"),
      )
    } else {
      for (const variant of product.variants) {
        const availableStock = variant.stock - variant.reservedStock
        const availability = availableStock > 0 ? "in stock" : "out of stock"

        rows.push(
          [
            `${product.slug}-${variant.id.slice(-8)}`,
            product.name,
            description,
            link,
            imageLink,
            price,
            availability,
            "new",
            brand,
            "no",
          ]
            .map(escapeTsv)
            .join("\t"),
        )
      }
    }
  }

  return new Response(rows.join("\n"), {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Cache-Control": "public, max-age=21600, s-maxage=21600",
    },
  })
}
