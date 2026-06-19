import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { toCsvRow } from "@/lib/csv"
import { requireAdminPermission } from "@/lib/auth/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await requireAdminPermission("import_export")
  if (session instanceof NextResponse) return session

  const products = await prisma.product.findMany({
    include: {
      category: { select: { name: true } },
      variants: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const headers = [
    "id",
    "name",
    "slug",
    "status",
    "category",
    "price",
    "oldPrice",
    "featured",
    "images",
    "description",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "seoImage",
    "variantsSummary",
    "totalStock",
    "availableStock",
    "createdAt",
    "updatedAt",
  ]

  const rows = products.map((p) => {
    const totalStock = p.variants.reduce((s, v) => s + v.stock, 0)
    const availableStock = p.variants.reduce((s, v) => s + (v.stock - v.reservedStock), 0)
    const variantsSummary = p.variants
      .map((v) => `${v.size}(${v.color}:${v.stock})`)
      .join("; ")

    return toCsvRow([
      p.id,
      p.name,
      p.slug,
      p.status,
      p.category.name,
      p.price,
      p.oldPrice ?? "",
      p.featured ? "Yes" : "No",
      p.images.join("|"),
      p.description ?? "",
      p.seoTitle ?? "",
      p.seoDescription ?? "",
      p.seoKeywords ?? "",
      p.seoImage ?? "",
      variantsSummary,
      totalStock,
      availableStock,
      p.createdAt.toISOString(),
      p.updatedAt.toISOString(),
    ])
  })

  const csv = [toCsvRow(headers), ...rows].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-export-${Date.now()}.csv"`,
    },
  })
}
