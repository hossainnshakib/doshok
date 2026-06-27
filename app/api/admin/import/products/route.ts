import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { parseCsvLine } from "@/lib/csv"
import { requireAdminPermission } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"

const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024

const REQUIRED_COLUMNS = ["name", "slug", "price", "categoryslug"]
const VALID_STATUSES = new Set(["Draft", "Active"])
const VALID_PAGE_TYPES = new Set(["NORMAL"])

type ImportMode = "preview" | "execute"

type ImportRowData = {
  name: string
  slug: string
  price: string
  categorySlug: string
  status: string
  pageType: string
  oldPrice: string
  featured: string
  images: string
  description: string
  shortDescription: string
  material: string
  careInstructions: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  seoImage: string
  variantSize: string
  variantColor: string
  variantColorHex: string
  variantSku: string
  variantStock: string
  variantLowStockThreshold: string
}

type RowResult = {
  rowNumber: number
  action: "create" | "update"
  data: ImportRowData
  providedColumns: Set<string>
  errors: string[]
}

type ProductImportData = {
  name: string
  slug: string
  price: number
  categoryId: string
  status?: string
  oldPrice?: number | null
  featured?: boolean
  images?: string[]
  description?: string | null
  shortDescription?: string | null
  material?: string | null
  careInstructions?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  seoImage?: string | null
}

type VariantImportUpdateData = {
  size: string
  color: string
  colorHex?: string | null
  sku?: string | null
  stock?: number
  lowStockThreshold?: number
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)
}

function getField(row: string[], map: Map<string, number>, name: string): string {
  const idx = map.get(name.toLowerCase())
  return idx !== undefined ? (row[idx] ?? "").trim() : ""
}

function parseInteger(value: string): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function parseOptionalBoolean(value: string): boolean | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (["yes", "true", "1", "active"].includes(normalized)) return true
  if (["no", "false", "0", "inactive"].includes(normalized)) return false
  return undefined
}

function parseImages(value: string): string[] {
  return value.split("|").map((url) => url.trim()).filter(Boolean)
}

function hasVariantData(row: ImportRowData): boolean {
  return Boolean(
    row.variantSize ||
    row.variantColor ||
    row.variantColorHex ||
    row.variantSku ||
    row.variantStock ||
    row.variantLowStockThreshold
  )
}

async function parseImportRequest(request: NextRequest): Promise<{ csvText: string; mode: ImportMode } | NextResponse> {
  const { searchParams } = new URL(request.url)
  const queryMode = searchParams.get("mode")
  const contentType = request.headers.get("content-type") ?? ""

  let csvText = ""
  let mode: ImportMode = queryMode === "execute" ? "execute" : "preview"

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.csvText !== "string") {
      return error("JSON body must include csvText.")
    }
    csvText = body.csvText
    if (body.mode !== undefined) {
      if (body.mode !== "preview" && body.mode !== "execute") {
        return error("mode must be preview or execute.")
      }
      mode = body.mode
    }
  } else {
    csvText = await request.text()
    if (queryMode && queryMode !== "preview" && queryMode !== "execute") {
      return error("mode must be preview or execute.")
    }
  }

  if (csvText.length > MAX_PAYLOAD_SIZE) {
    return error("Payload too large. Maximum size is 5MB.", 413)
  }

  return { csvText, mode }
}

async function validateCsv(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    return {
      response: error("CSV must have a header row and at least one data row."),
      rows: [] as RowResult[],
      validRows: [] as Record<string, string | number>[],
      invalidRows: [] as { row: number; errors: string[] }[],
      summary: { totalRows: 0, validRows: 0, invalidRows: 0 },
    }
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase())
  const headerMap = new Map(headers.map((header, index) => [header, index]))

  const missing = REQUIRED_COLUMNS.filter((column) => !headerMap.has(column))
  if (missing.length > 0) {
    return {
      response: error(`Missing required columns: ${missing.map((c) => c === "categoryslug" ? "categorySlug" : c).join(", ")}`),
      rows: [] as RowResult[],
      validRows: [] as Record<string, string | number>[],
      invalidRows: [] as { row: number; errors: string[] }[],
      summary: { totalRows: 0, validRows: 0, invalidRows: 0 },
    }
  }

  const [categories, existingProducts] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.product.findMany({ select: { id: true, slug: true } }),
  ])
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]))
  const existingSlugs = new Set(existingProducts.map((product) => product.slug))

  const dataRows = lines.slice(1).map((line) => parseCsvLine(line))
  const results: RowResult[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowNumber = i + 2
    const rowErrors: string[] = []

    const data: ImportRowData = {
      name: getField(row, headerMap, "name"),
      slug: getField(row, headerMap, "slug"),
      price: getField(row, headerMap, "price"),
      categorySlug: getField(row, headerMap, "categoryslug"),
      status: getField(row, headerMap, "status"),
      pageType: getField(row, headerMap, "pagetype"),
      oldPrice: getField(row, headerMap, "oldprice"),
      featured: getField(row, headerMap, "featured"),
      images: getField(row, headerMap, "images"),
      description: getField(row, headerMap, "description"),
      shortDescription: getField(row, headerMap, "shortdescription"),
      material: getField(row, headerMap, "material"),
      careInstructions: getField(row, headerMap, "careinstructions"),
      seoTitle: getField(row, headerMap, "seotitle"),
      seoDescription: getField(row, headerMap, "seodescription"),
      seoKeywords: getField(row, headerMap, "seokeywords"),
      seoImage: getField(row, headerMap, "seoimage"),
      variantSize: getField(row, headerMap, "variantsize"),
      variantColor: getField(row, headerMap, "variantcolor"),
      variantColorHex: getField(row, headerMap, "variantcolorhex"),
      variantSku: getField(row, headerMap, "variantsku"),
      variantStock: getField(row, headerMap, "variantstock"),
      variantLowStockThreshold: getField(row, headerMap, "variantlowstockthreshold"),
    }

    if (!data.name) rowErrors.push("name is required")
    if (!data.slug) rowErrors.push("slug is required")
    else if (!isValidSlug(data.slug)) rowErrors.push("slug must be lowercase alphanumeric with hyphens")

    const price = parseInteger(data.price)
    if (!data.price) rowErrors.push("price is required")
    else if (price === null || price <= 0) rowErrors.push("price must be a positive whole number")

    if (!data.categorySlug) rowErrors.push("categorySlug is required")
    else if (!categoryBySlug.has(data.categorySlug)) rowErrors.push(`categorySlug "${data.categorySlug}" not found`)

    if (data.status && !VALID_STATUSES.has(data.status)) {
      rowErrors.push("status must be Draft or Active")
    }

    if (data.pageType && !VALID_PAGE_TYPES.has(data.pageType)) {
      rowErrors.push("pageType must be NORMAL")
    }

    const oldPrice = parseInteger(data.oldPrice)
    if (data.oldPrice && (oldPrice === null || oldPrice <= 0)) {
      rowErrors.push("oldPrice must be a positive whole number")
    }
    if (price !== null && oldPrice !== null && oldPrice <= price) {
      rowErrors.push("oldPrice must be greater than price")
    }

    const featured = parseOptionalBoolean(data.featured)
    if (data.featured && featured === undefined) {
      rowErrors.push("featured must be Yes/No or true/false")
    }

    if (data.images) {
      for (const url of parseImages(data.images)) {
        try {
          new URL(url)
        } catch {
          rowErrors.push(`invalid image URL: "${url}"`)
        }
      }
    }

    if (hasVariantData(data)) {
      if (!data.variantSize) rowErrors.push("variantSize is required when variant fields are provided")
      if (!data.variantColor) rowErrors.push("variantColor is required when variant fields are provided")

      const stock = parseInteger(data.variantStock)
      if (data.variantStock && (stock === null || stock < 0)) {
        rowErrors.push("variantStock must be a non-negative whole number")
      }

      const lowStockThreshold = parseInteger(data.variantLowStockThreshold)
      if (data.variantLowStockThreshold && (lowStockThreshold === null || lowStockThreshold < 0)) {
        rowErrors.push("variantLowStockThreshold must be a non-negative whole number")
      }
    }

    results.push({
      rowNumber,
      action: existingSlugs.has(data.slug) ? "update" : "create",
      data,
      providedColumns: new Set(headers),
      errors: rowErrors,
    })
  }

  const slugPositions = new Map<string, number[]>()
  for (const result of results) {
    if (!result.data.slug) continue
    const positions = slugPositions.get(result.data.slug) ?? []
    positions.push(result.rowNumber)
    slugPositions.set(result.data.slug, positions)
  }

  for (const [slug, positions] of slugPositions) {
    if (positions.length > 1) {
      const positionSet = new Set(positions)
      for (const result of results) {
        if (result.data.slug === slug && positionSet.has(result.rowNumber)) {
          result.errors.push(`duplicate slug "${slug}" in CSV`)
        }
      }
    }
  }

  const validRows = results
    .filter((result) => result.errors.length === 0)
    .map((result) => ({ row: result.rowNumber, action: result.action, ...result.data }))

  const invalidRows = results
    .filter((result) => result.errors.length > 0)
    .map((result) => ({ row: result.rowNumber, errors: result.errors }))

  return {
    response: null,
    rows: results,
    validRows,
    invalidRows,
    summary: {
      totalRows: dataRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
    },
    categoryBySlug,
  }
}

async function executeRows(rows: RowResult[], categoryBySlug: Map<string, string>) {
  return prisma.$transaction(async (tx) => {
    const result = {
      created: 0,
      updated: 0,
      variantsCreated: 0,
      variantsUpdated: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const row of rows) {
      const price = parseInteger(row.data.price)!
      const oldPrice = parseInteger(row.data.oldPrice)
      const featured = parseOptionalBoolean(row.data.featured)
      const categoryId = categoryBySlug.get(row.data.categorySlug)!

      const productData: ProductImportData = {
        name: row.data.name,
        slug: row.data.slug,
        price,
        categoryId,
      }

      if (row.data.status) productData.status = row.data.status
      if (row.providedColumns.has("oldprice")) productData.oldPrice = oldPrice
      if (row.providedColumns.has("featured")) productData.featured = featured ?? false
      if (row.providedColumns.has("description")) productData.description = row.data.description || null
      if (row.providedColumns.has("shortdescription")) productData.shortDescription = row.data.shortDescription || null
      if (row.providedColumns.has("material")) productData.material = row.data.material || null
      if (row.providedColumns.has("careinstructions")) productData.careInstructions = row.data.careInstructions || null
      if (row.providedColumns.has("seotitle")) productData.seoTitle = row.data.seoTitle || null
      if (row.providedColumns.has("seodescription")) productData.seoDescription = row.data.seoDescription || null
      if (row.providedColumns.has("seokeywords")) productData.seoKeywords = row.data.seoKeywords || null
      if (row.providedColumns.has("seoimage")) productData.seoImage = row.data.seoImage || null
      if (row.providedColumns.has("images") && row.data.images) productData.images = parseImages(row.data.images)

      const existingProduct = await tx.product.findUnique({
        where: { slug: row.data.slug },
        select: { id: true },
      })

      const product = existingProduct
        ? await tx.product.update({
            where: { id: existingProduct.id },
            data: productData,
            select: { id: true },
          })
        : await tx.product.create({
            data: {
              ...productData,
              status: row.data.status || "Draft",
              images: Array.isArray(productData.images) ? productData.images : [],
            },
            select: { id: true },
          })

      if (existingProduct) result.updated += 1
      else result.created += 1

      if (!hasVariantData(row.data)) continue

      const variantStock = parseInteger(row.data.variantStock)
      const variantLowStockThreshold = parseInteger(row.data.variantLowStockThreshold)
      const variantSku = row.data.variantSku || null

      const existingVariantByOption = await tx.productVariant.findFirst({
        where: {
          productId: product.id,
          size: row.data.variantSize,
          color: row.data.variantColor,
        },
        select: { id: true },
      })
      const existingVariantBySku = existingVariantByOption || !variantSku
        ? null
        : await tx.productVariant.findFirst({
            where: { productId: product.id, sku: variantSku },
            select: { id: true },
          })
      const existingVariant = existingVariantByOption ?? existingVariantBySku

      if (existingVariant) {
        const variantUpdate: VariantImportUpdateData = {
          size: row.data.variantSize,
          color: row.data.variantColor,
        }

        if (row.providedColumns.has("variantcolorhex")) variantUpdate.colorHex = row.data.variantColorHex || null
        if (row.providedColumns.has("variantsku")) variantUpdate.sku = variantSku
        if (row.providedColumns.has("variantstock") && variantStock !== null) variantUpdate.stock = variantStock
        if (row.providedColumns.has("variantlowstockthreshold") && variantLowStockThreshold !== null) {
          variantUpdate.lowStockThreshold = variantLowStockThreshold
        }

        await tx.productVariant.update({
          where: { id: existingVariant.id },
          data: variantUpdate,
        })
        result.variantsUpdated += 1
      } else {
        await tx.productVariant.create({
          data: {
            productId: product.id,
            size: row.data.variantSize,
            color: row.data.variantColor,
            colorHex: row.data.variantColorHex || null,
            sku: variantSku,
            stock: variantStock ?? 0,
            lowStockThreshold: variantLowStockThreshold ?? 5,
          },
        })
        result.variantsCreated += 1
      }
    }

    return result
  })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminPermission("import_export")
  if (session instanceof NextResponse) return session

  const parsedRequest = await parseImportRequest(request)
  if (parsedRequest instanceof NextResponse) return parsedRequest

  const validated = await validateCsv(parsedRequest.csvText)
  if (validated.response) return validated.response

  const preview = {
    mode: parsedRequest.mode,
    validRows: validated.validRows,
    invalidRows: validated.invalidRows,
    summary: validated.summary,
  }

  if (parsedRequest.mode === "preview") {
    return success(preview)
  }

  if (validated.invalidRows.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "CSV has invalid rows. Nothing was imported.",
        data: preview,
      },
      { status: 400 }
    )
  }

  try {
    const execution = await executeRows(validated.rows, validated.categoryBySlug)
    revalidatePath("/", "page")
    return success({ ...preview, execution })
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Import execution failed. No products were changed.",
        data: {
          ...preview,
          execution: {
            created: 0,
            updated: 0,
            variantsCreated: 0,
            variantsUpdated: 0,
            skipped: 0,
            errors: ["Transaction rolled back."],
          },
        },
      },
      { status: 500 }
    )
  }
}
