import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableShell, AdminStatusBadge, AdminPageShell } from "@/components/admin/admin-ui"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, DollarSign, Package, ShoppingCart, Timer, Users, ArrowRight, Plus, ClipboardList } from "lucide-react"
import { LOW_STOCK_THRESHOLD } from "@/types"
import { getInventoryStats, getLowStockItems } from "@/lib/services/inventory.service"
import { getPhoneDisplayE164 } from "@/lib/utils"

export default async function AdminDashboardPage() {
  const [
    productCount,
    orderCount,
    pendingOrders,
    recentOrders,
    totalRevenueResult,
    customerCount,
    inventoryStats,
    lowStockProducts,
    categoriesCount,
    couponsCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: "pending" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: true } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { paymentStatus: "paid" },
    }),
    prisma.user.count({ where: { role: "customer" } }),
    getInventoryStats(),
    getLowStockItems(8),
    prisma.category.count(),
    prisma.coupon.count({ where: { active: true } }),
  ])

  const totalRevenue = totalRevenueResult._sum.total ?? 0

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Real-time overview of your Doshok store performance."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <AdminStatCard label="Revenue" value={`৳${totalRevenue.toLocaleString()}`} href="/admin/orders" icon={DollarSign} tone={totalRevenue > 0 ? "success" : "default"} />
        <AdminStatCard label="Total Orders" value={orderCount} href="/admin/orders" icon={ShoppingCart} />
        <AdminStatCard label="Pending" value={pendingOrders} href="/admin/orders?status=pending" icon={Timer} tone={pendingOrders > 0 ? "warning" : "default"} />
        <AdminStatCard label="Customers" value={customerCount} href="/admin/customers/list" icon={Users} />
        <AdminStatCard label="Products" value={productCount} href="/admin/products" icon={Package} />
        <AdminStatCard label="Low Stock" value={inventoryStats.lowStockCount} href="/admin/inventory/low-stock" icon={AlertTriangle} tone={inventoryStats.lowStockCount > 0 ? "warning" : "default"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3">
          <AdminSectionCard title="Recent Orders" description="Latest customer orders across all statuses.">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <ShoppingCart className="mb-2.5 h-7 w-7 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">No orders yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Orders will appear here after customers complete checkout.</p>
              </div>
            ) : (
              <>
                <AdminTableShell>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Order</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Customer</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Total</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Payment</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id} className="border-slate-50 hover:bg-slate-50/60">
                          <TableCell className="font-mono text-[11px] text-slate-600">
                            <Link href={`/admin/orders/${order.id}`} className="hover:text-slate-900">{order.orderNumber}</Link>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-medium text-slate-800">{order.customerName}</p>
                            <p className="text-[10px] text-slate-400">{getPhoneDisplayE164(order.customerPhone)}</p>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-800">৳{order.total.toLocaleString()}</TableCell>
                          <TableCell>
                            <AdminStatusBadge status={order.paymentStatus === "paid" ? "Paid" : "Pending"} type="payment" />
                          </TableCell>
                          <TableCell>
                            <AdminStatusBadge status={order.orderStatus} type="order" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AdminTableShell>
                <div className="flex justify-end p-3 border-t border-slate-100">
                  <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    View all orders <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </AdminSectionCard>
        </div>

        <div className="xl:col-span-2 space-y-5">
          <AdminSectionCard title="Low Stock Alerts" description="Products that need restocking soon.">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Package className="mb-2 h-6 w-6 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">Stock levels look good</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No products are running low on stock.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {lowStockProducts.map((variant) => (
                    <div key={variant.variantId} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{variant.productName}</p>
                          <p className="text-[10px] text-slate-400">{variant.size} / {variant.color}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-[11px] font-bold text-amber-500 tabular-nums">{variant.availableStock} left</p>
                        <Link href={`/admin/products/${variant.productId}`} className="text-[10px] text-slate-400 hover:text-slate-700 transition-colors">
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-1">
                  <Link href="/admin/products?status=Active" className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    Manage products <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </AdminSectionCard>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/products/new" className="flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-white p-3 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500 text-white">
                <Plus className="h-4 w-4" />
              </span>
              New Product
            </Link>
            <Link href="/admin/orders?status=pending" className="flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-white p-3 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500 text-white">
                <ClipboardList className="h-4 w-4" />
              </span>
              Pending Orders
            </Link>
          </div>
        </div>
      </div>
    </AdminPageShell>
  )
}