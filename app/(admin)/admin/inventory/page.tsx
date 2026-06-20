import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getAllStockOverview, getInventoryStats } from "@/lib/services/inventory.service"
import { AdminPageHeader, AdminStatCard, AdminTableShell, AdminStatusBadge, AdminEmptyState, AdminPageShell } from "@/components/admin/admin-ui"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, AlertTriangle, TrendingDown, PackageSearch, ImageIcon, Pencil } from "lucide-react"

export default async function InventoryStockOverviewPage() {
  const [stockData, stats] = await Promise.all([
    getAllStockOverview(100),
    getInventoryStats(),
  ])

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Stock Overview"
        description="View all product stock levels across variants. Manage inventory counts and stock status."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard label="Total Variants" value={stats.totalVariants} href="/admin/inventory" icon={Package} />
        <AdminStatCard label="In Stock" value={stats.totalVariants - stats.lowStockCount - stats.outOfStockCount} href="/admin/inventory" icon={PackageSearch} tone="success" />
        <AdminStatCard label="Low Stock" value={stats.lowStockCount} href="/admin/inventory/low-stock" icon={AlertTriangle} tone={stats.lowStockCount > 0 ? "warning" : "default"} />
        <AdminStatCard label="Out of Stock" value={stats.outOfStockCount} href="/admin/inventory/low-stock" icon={TrendingDown} tone={stats.outOfStockCount > 0 ? "danger" : "default"} />
      </div>

      {stockData.length === 0 ? (
        <AdminEmptyState
          title="No products yet"
          description="Create products with variants to see stock overview here."
        />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="w-[48px] text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Img</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Product</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Variant</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Current</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Reserved</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Available</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData.map((item) => (
                <TableRow key={item.variantId} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell>
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-slate-100">
                      {item.productImage ? (
                        <img src={item.productImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[180px]">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400">{item.categoryName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-600">
                      <span className="font-medium">{item.size}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="font-medium">{item.color}</span>
                      {item.colorHex && (
                        <span
                          className="ml-1.5 inline-block h-3 w-3 rounded-full border"
                          style={{ backgroundColor: item.colorHex }}
                        />
                      )}
                    </div>
                    {item.sku && <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs font-semibold tabular-nums text-slate-700">{item.currentStock}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs tabular-nums text-slate-500">{item.reservedStock}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-bold tabular-nums ${
                      item.availableStock === 0 ? "text-red-500" :
                      item.availableStock <= item.lowStockThreshold ? "text-amber-500" :
                      "text-slate-700"
                    }`}>
                      {item.availableStock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge
                      status={item.status === "out_of_stock" ? "Out of Stock" : item.status === "low_stock" ? "Low Stock" : "In Stock"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="inline-flex items-center justify-center rounded-md text-[11px] font-semibold h-7 px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      )}
    </AdminPageShell>
  )
}