import { getFeedProducts } from "@/lib/feed"

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
      availability: p.availability,
      price: p.price,
      sale_price: p.salePrice,
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
