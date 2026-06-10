import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableShell, AdminStatusBadge } from "@/components/admin/admin-ui"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, DollarSign, Package, ShoppingBag, ShoppingCart, Timer, TrendingUp, Users, ArrowRight } from "lucide-react"
import { LOW_STOCK_THRESHOLD } from "@/types"

export default async function AdminDashboardPage() {
  const [
    productCount,
    orderCount,
    pendingOrders,
    abandonedCount,
    recentOrders,
    totalRevenueResult,
    customerCount,
    lowStockProducts,
    categoriesCount,
    couponsCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: "pending" } }),
    prisma.abandonedCheckout.count(),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: true } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { paymentStatus: "paid" },
    }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.productVariant.findMany({
      where: { stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
      include: { product: true },
      take: 8,
    }),
    prisma.category.count(),
    prisma.coupon.count({ where: { active: true } }),
  ])

  const totalRevenue = totalRevenueResult._sum.total ?? 0

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Real-time overview of your Doshok store performance."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        <AdminStatCard label="Total Revenue" value={`৳${totalRevenue.toLocaleString()}`} href="/admin/orders" icon={DollarSign} tone={totalRevenue > 0 ? "success" : "default"} />
        <AdminStatCard label="Total Orders" value={orderCount} href="/admin/orders" icon={ShoppingCart} />
        <AdminStatCard label="Pending Orders" value={pendingOrders} href="/admin/orders?status=pending" icon={Timer} tone={pendingOrders > 0 ? "warning" : "default"} />
        <AdminStatCard label="Customers" value={customerCount} href="/admin/customers" icon={Users} />
        <AdminStatCard label="Products" value={productCount} href="/admin/products" icon={Package} />
        <AdminStatCard label="Categories" value={categoriesCount} href="/admin/categories" icon={Package} />
        <AdminStatCard label="Active Coupons" value={couponsCount} href="/admin/coupons" icon={TrendingUp} />
        <AdminStatCard label="Abandoned" value={abandonedCount} href="/admin/abandoned" icon={ShoppingBag} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSectionCard title="Recent Orders" description="Latest customer orders across all statuses.">
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <ShoppingCart className="mb-3 h-8 w-8 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-500">No orders yet</p>
              <p className="text-xs text-neutral-400 mt-1">Orders will appear here after customers complete checkout.</p>
            </div>
          ) : (
            <AdminTableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-neutral-50/50">
                      <TableCell className="font-mono text-xs">
                        <Link href={`/admin/orders/${order.id}`} className="hover:underline">{order.orderNumber}</Link>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">৳{order.total.toLocaleString()}</TableCell>
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
              <div className="flex justify-end p-3 border-t border-black/5">
                <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors">
                  View all orders <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </AdminTableShell>
          )}
        </AdminSectionCard>

        <AdminSectionCard title="Low Stock Alerts" description="Products that need restocking soon.">
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Package className="mb-3 h-8 w-8 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-500">Stock levels look good</p>
              <p className="text-xs text-neutral-400 mt-1">No products are running low on stock.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((variant) => (
                <div key={variant.id} className="flex items-center justify-between rounded-xl border border-black/5 bg-neutral-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{variant.product.name}</p>
                      <p className="text-xs text-neutral-500">{variant.size} / {variant.color}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600">{variant.stock} left</p>
                    <Link href={`/admin/products/${variant.product.id}`} className="text-[10px] text-neutral-400 hover:text-neutral-950 transition-colors">
                      Edit →
                    </Link>
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Link href="/admin/products?status=Active" className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-950 transition-colors">
                  Manage products <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </AdminSectionCard>
      </div>
    </div>
  )
}
