import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { AdminProductSearch } from "@/components/admin/admin-product-search"
import { AdminProductSort } from "@/components/admin/admin-product-sort"
import { AdminProductPagination } from "@/components/admin/admin-product-pagination"
import { Eye, ImageIcon } from "lucide-react"

const STATUS_TABS = ["All", "Draft", "Active", "Hidden", "Archived"] as const
const LIMIT = 25

type SortOption = "newest" | "oldest" | "price-low" | "price-high"
const SORT_MAP: Record<SortOption, Record<string, "asc" | "desc">> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  "price-low": { price: "asc" },
  "price-high": { price: "desc" },
}

function buildTabHref(tab: string, currentSearch: string | undefined, currentSort: string | undefined) {
  const params = new URLSearchParams()
  if (tab !== "All") params.set("status", tab)
  if (currentSearch) params.set("search", currentSearch)
  if (currentSort && currentSort !== "newest") params.set("sort", currentSort)
  const qs = params.toString()
  return qs ? `/admin/products?${qs}` : "/admin/products"
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; sort?: string; page?: string }>
}) {
  const resolvedParams = await searchParams
  const { status, search } = resolvedParams
  const currentPage = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1)
  const sortParam = (resolvedParams.sort as SortOption) || "newest"
  const orderBy = SORT_MAP[sortParam] || SORT_MAP.newest

  const where: Record<string, unknown> = {}
  if (status && status !== "All") where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, variants: true },
      orderBy,
      skip: (currentPage - 1) * LIMIT,
      take: LIMIT,
    }),
    prisma.product.count({ where }),
  ])

  const counts = await Promise.all(
    STATUS_TABS.map((s) =>
      s === "All"
        ? prisma.product.count()
        : prisma.product.count({ where: { status: s } })
    )
  )
  const countMap = Object.fromEntries(STATUS_TABS.map((s, i) => [s, counts[i]]))

  const totalPages = Math.ceil(total / LIMIT)
  const activeTab = (status && STATUS_TABS.includes(status as typeof STATUS_TABS[number])) ? status : "All"

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"} in the catalog.`}
        action={{ label: "Add Product", href: "/admin/products/new" }}
        backHref="/admin/commerce"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <AdminProductSearch />
        <AdminProductSort currentSort={sortParam} />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={buildTabHref(tab, search, sortParam)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold transition-all ${
              activeTab === tab
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            {tab}
            <span className={`rounded px-1 py-0.5 text-[10px] tabular-nums ${
              activeTab === tab
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-500"
            }`}>
              {countMap[tab]}
            </span>
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <AdminEmptyState title="No products found" description={search ? `No products matching "${search}". Try a different search term.` : status ? `No products with status "${status}". Try a different filter.` : "Create the first product to start building the catalog."} action={{ label: "Add Product", href: "/admin/products/new" }} />
      ) : (
      <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100">
              <TableHead className="w-[48px] text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Img</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Name</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Category</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Price</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Variants</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Stock</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
              const hasLowStock = product.variants.some((v) => v.stock > 0 && v.stock <= 5)
              return (
                <TableRow key={product.id} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                      {product.images[0] ? (
                        <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-800 max-w-[180px] truncate">{product.name}</TableCell>
                  <TableCell className="text-xs text-slate-500">{product.category.name}</TableCell>
                  <TableCell className="text-xs font-semibold tabular-nums text-slate-800">৳{product.price.toLocaleString()}</TableCell>
                  <TableCell className="text-center text-xs tabular-nums text-slate-600">{product.variants.length}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs tabular-nums font-semibold ${hasLowStock ? "text-amber-500" : totalStock === 0 ? "text-slate-400" : "text-slate-700"}`}>
                      {totalStock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="inline-flex items-center justify-center rounded-md text-[11px] font-semibold h-7 px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/products/${product.slug}?preview=1`}
                        target="_blank"
                        className="inline-flex items-center justify-center rounded-md h-7 w-7 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </AdminTableShell>
      )}

      <AdminProductPagination
        currentPage={currentPage}
        totalPages={totalPages}
        status={status}
        search={search}
        sort={sortParam}
      />
    </div>
  )
}
