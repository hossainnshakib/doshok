import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { Eye, ImageIcon } from "lucide-react"

const STATUS_TABS = ["All", "Draft", "Active", "Hidden", "Archived"] as const

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

  const where: Record<string, unknown> = {}
  if (status && status !== "All") where.status = status

  const products = await prisma.product.findMany({
    where,
    include: { category: true, variants: true },
    orderBy: { createdAt: "desc" },
  })

  const counts = await Promise.all(
    STATUS_TABS.map((s) =>
      s === "All"
        ? prisma.product.count()
        : prisma.product.count({ where: { status: s } })
    )
  )
  const countMap = Object.fromEntries(STATUS_TABS.map((s, i) => [s, counts[i]]))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Commerce"
        title="Products"
        description={`${products.length} product${products.length === 1 ? "" : "s"} in the Doshok catalog.`}
        action={{ label: "Add Product", href: "/admin/products/new" }}
      />

      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={tab === "All" ? "/admin/products" : `/admin/products?status=${tab}`}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-bold tracking-wide transition-all ${
              (tab === "All" && !status) || status === tab
                ? "bg-neutral-950 text-white shadow-sm"
                : "bg-white text-neutral-500 hover:bg-neutral-100 border border-black/5"
            }`}
          >
            {tab}
            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              (tab === "All" && !status) || status === tab
                ? "bg-white/20 text-white"
                : "bg-neutral-100 text-neutral-500"
            }`}>
              {countMap[tab]}
            </span>
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <AdminEmptyState title="No products found" description={status ? `No products with status "${status}". Try a different filter.` : "Create the first product to start building the storefront catalog."} action={{ label: "Add Product", href: "/admin/products/new" }} />
      ) : (
      <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const totalStock = product.variants.reduce((s, v) => s + v.stock, 0)
              const hasLowStock = product.variants.some((v) => v.stock > 0 && v.stock <= 5)
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {product.images[0] ? (
                        <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{product.category.name}</TableCell>
                  <TableCell className="font-medium tabular-nums">৳{product.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={product.pageType} />
                  </TableCell>
                  <TableCell className="tabular-nums">{product.variants.length}</TableCell>
                  <TableCell>
                    <span className={`tabular-nums ${hasLowStock ? "text-amber-600 font-semibold" : totalStock === 0 ? "text-muted-foreground" : ""}`}>
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
                        className="inline-flex items-center justify-center rounded-xl text-sm font-medium h-8 px-3 hover:bg-muted hover:text-foreground transition-colors"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/products/${product.slug}?preview=1`}
                        target="_blank"
                        className="inline-flex items-center justify-center rounded-xl text-sm font-medium h-8 w-8 hover:bg-muted hover:text-foreground transition-colors"
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
    </div>
  )
}