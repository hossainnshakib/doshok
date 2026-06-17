import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { parseCsvLine } from "@/lib/csv"
import { requireAdminPermission } from "@/lib/auth/admin"

const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024

const REQUIRED_COLUMNS = ["name", "slug", "price", "categorySlug"]
const VALID_STATUSES = new Set(["Draft", "Active"])

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)
}

function getField(row: string[], map: Map<string, number>, name: string): string {
  const idx = map.get(name)
  return idx !== undefined ? (row[idx] ?? "").trim() : ""
}

export async function POST(request: NextRequest) {
  const session = await requireAdminPermission("import_export")
  if (session instanceof NextResponse) return session

  const text = await request.text()

  if (text.length > MAX_PAYLOAD_SIZE) {
    return error("Payload too large. Maximum size is 5MB.", 413)
  }

  const lines = text.split("\n").filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    return error("CSV must have a header row and at least one data row.")
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const headerMap = new Map(headers.map((h, i) => [h, i]))

  const missing = REQUIRED_COLUMNS.filter((c) => !headerMap.has(c))
  if (missing.length > 0) {
    return error(`Missing required columns: ${missing.join(", ")}`)
  }

  const categories = await prisma.category.findMany({ select: { slug: true } })
  const categorySlugs = new Set(categories.map((c) => c.slug))

  const dataRows = lines.slice(1).map((l) => parseCsvLine(l))

  interface RowResult {
    rowNumber: number
    data: Record<string, string>
    errors: string[]
  }

  const results: RowResult[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNumber = i + 2
    const rowErrors: string[] = []

    const name = getField(row, headerMap, "name")
    const slug = getField(row, headerMap, "slug")
    const price = getField(row, headerMap, "price")
    const categorySlug = getField(row, headerMap, "categorySlug")
    const status = getField(row, headerMap, "status")
    const images = getField(row, headerMap, "images")
    const variantStock = getField(row, headerMap, "variantStock")

    if (!name) rowErrors.push("name is required")
    if (!slug) rowErrors.push("slug is required")
    else if (!isValidSlug(slug)) rowErrors.push("slug must be lowercase alphanumeric with hyphens")

    if (!price) rowErrors.push("price is required")
    else {
      const n = Number(price)
      if (isNaN(n) || n <= 0) rowErrors.push("price must be a positive number")
    }

    if (!categorySlug) rowErrors.push("categorySlug is required")
    else if (!categorySlugs.has(categorySlug)) rowErrors.push(`categorySlug "${categorySlug}" not found`)

    if (status && !VALID_STATUSES.has(status)) {
      rowErrors.push("status must be Draft or Active")
    }

    if (images) {
      for (const url of images.split("|").filter(Boolean)) {
        try { new URL(url) } catch { rowErrors.push(`invalid image URL: "${url}"`) }
      }
    }

    if (variantStock) {
      const n = Number(variantStock)
      if (isNaN(n) || n < 0) rowErrors.push("variantStock must be a non-negative number")
    }

    const rowData: Record<string, string> = {}
    for (const h of headers) {
      rowData[h] = getField(row, headerMap, h)
    }

    results.push({ rowNumber, data: rowData, errors: rowErrors })
  }

  // Check duplicate slugs within CSV
  const slugPositions = new Map<string, number[]>()
  for (const r of results) {
    const slug = r.data.slug
    if (!slug) continue
    const positions = slugPositions.get(slug) ?? []
    positions.push(r.rowNumber)
    slugPositions.set(slug, positions)
  }

  for (const [slug, positions] of slugPositions) {
    if (positions.length > 1) {
      const posSet = new Set(positions)
      for (const r of results) {
        if (r.data.slug === slug && posSet.has(r.rowNumber)) {
          r.errors.push(`duplicate slug "${slug}" in CSV`)
        }
      }
    }
  }

  // Check for existing product slugs
  const allSlugs = [...new Set(results.map((r) => r.data.slug).filter(Boolean))]
  const existingProducts = await prisma.product.findMany({
    where: { slug: { in: allSlugs } },
    select: { slug: true },
  })
  const existingSlugs = new Set(existingProducts.map((p) => p.slug))

  for (const r of results) {
    if (r.data.slug && existingSlugs.has(r.data.slug)) {
      r.errors.push(`slug "${r.data.slug}" already exists as a product`)
    }
  }

  const validRows = results
    .filter((r) => r.errors.length === 0)
    .map((r) => ({ row: r.rowNumber, ...r.data }))

  const invalidRows = results
    .filter((r) => r.errors.length > 0)
    .map((r) => ({ row: r.rowNumber, errors: r.errors }))

  return success({
    validRows,
    invalidRows,
    summary: {
      totalRows: dataRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
    },
  })
}
