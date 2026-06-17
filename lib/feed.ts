import { prisma } from "@/lib/prisma"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export interface FeedProduct {
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  additionalImageLinks: string[]
  availability: "in stock"
  price: number
  salePrice: number | null
  brand: string
  productType: string | null
  quantity: number
  customLabel0: string | null
  customLabel1: string | null
}

export function toAbsoluteUrl(url: string): string {
  if (!url) return ""
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/")) return `${SITE_URL}${url}`
  return `${SITE_URL}/${url}`
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function formatPrice(price: number): string {
  return `${price.toFixed(2)} BDT`
}

export function calculateAvailableStock(
  variants: { stock: number; reservedStock: number }[]
): number {
  return variants.reduce((sum, v) => sum + Math.max(0, v.stock - v.reservedStock), 0)
}

export async function getFeedProducts(): Promise<FeedProduct[]> {
  let brand = "Doshok"
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: { brandName: true },
    })
    if (settings?.brandName) brand = settings.brandName
  } catch {}

  let products
  try {
    products = await prisma.product.findMany({
      where: { status: "Active", price: { gt: 0 } },
      include: {
        category: { select: { name: true } },
        variants: { select: { stock: true, reservedStock: true } },
      },
    })
  } catch {
    return []
  }

  return products
    .filter((p) => {
      if (!p.images || p.images.length === 0) return false
      if (!p.images[0] || p.images[0].trim() === "") return false
      const availableStock = calculateAvailableStock(p.variants)
      return availableStock > 0
    })
    .map((p) => {
      const availableStock = calculateAvailableStock(p.variants)
      const hasSale = p.oldPrice != null && p.oldPrice > p.price
      const description =
        p.seoDescription || p.shortDescription || p.description || ""

      const labels: string[] = []
      if (p.featured) labels.push("Featured")
      if (p.pageType === "LANDING") labels.push("Landing")
      if (hasSale) labels.push("Sale")

      return {
        id: p.id,
        title: p.name,
        description: description.replace(/<[^>]*>/g, ""),
        link: `${SITE_URL}/products/${p.slug}`,
        imageLink: toAbsoluteUrl(p.images[0]),
        additionalImageLinks: p.images.slice(1).map(toAbsoluteUrl),
        availability: "in stock",
        price: p.price,
        salePrice: hasSale ? p.price : null,
        brand,
        productType: p.category?.name ?? null,
        quantity: availableStock,
        customLabel0: p.category?.name ?? null,
        customLabel1: labels.length > 0 ? labels.join(",") : null,
      }
    })
}
