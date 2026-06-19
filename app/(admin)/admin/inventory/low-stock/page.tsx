import Link from "next/link"
import { getLowStockItems } from "@/lib/services/inventory.service"
import { AdminPageHeader, AdminTableShell, AdminEmptyState, AdminStatusBadge } from "@/components/admin/admin-ui"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ImageIcon, Pencil } from "lucide-react"

export default async function InventoryLowStockPage() {
  const lowStockItems = await getLowStockItems(50)

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Inventory"
        title="Low Stock Alerts"
        description="Products and variants that are running low on stock and need restocking attention."
      />

      {lowStockItems.length === 0 ? (
        <AdminEmptyState
          title="All stock levels look good"
          description="No products are currently below their low stock threshold."
        />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="w-[48px] text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Img</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Product</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Variant</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Available</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Threshold</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Current</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center">Reserved</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.map((item) => (
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
                  <TableCell className="text-xs text-slate-600">
                    <span className="font-medium">{item.size}</span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="font-medium">{item.color}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-bold tabular-nums ${
                      item.availableStock === 0 ? "text-red-500" : "text-amber-500"
                    }`}>
                      {item.availableStock}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs tabular-nums text-slate-500">
                    {item.lowStockThreshold}
                  </TableCell>
                  <TableCell className="text-center text-xs tabular-nums text-slate-600">
                    {item.currentStock}
                  </TableCell>
                  <TableCell className="text-center text-xs tabular-nums text-slate-400">
                    {item.reservedStock}
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge
                      status={item.availableStock === 0 ? "Out of Stock" : "Low Stock"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/products/${item.productId}`}
                      className="inline-flex items-center justify-center rounded-md text-[11px] font-semibold h-7 px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      )}
    </div>
  )
}