import { getFeedProducts, formatPrice } from "@/lib/feed"

export const dynamic = "force-dynamic"

export async function GET() {
  const products = await getFeedProducts()

  const data = {
    generatedAt: new Date().toISOString(),
    currency: "BDT",
    total: products.length,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      link: p.link,
      image_link: p.imageLink,
      additional_image_link: p.additionalImageLinks,
      availability: p.availability === "in stock" ? "in stock" : "out of stock",
      price: formatPrice(p.price),
      ...(p.salePrice !== null
        ? {
            sale_price: formatPrice(p.salePrice),
            sale_price_effective_date:
              new Date().toISOString().split("T")[0] +
              "T00:00:00Z/" +
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] +
              "T23:59:59Z",
          }
        : {}),
      condition: "new",
      brand: p.brand,
      product_type: p.productType,
      quantity: p.quantity,
      custom_label_0: p.customLabel0,
      custom_label_1: p.customLabel1,
    })),
  }

  return Response.json(data, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  })
}
