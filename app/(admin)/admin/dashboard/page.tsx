import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { AdminPageHeader, AdminSectionCard, AdminStatCard, AdminTableShell } from "@/components/admin/admin-ui"
import { Package, ShoppingBag, ShoppingCart, Timer } from "lucide-react"

export default async function AdminDashboardPage() {
  const [productCount, orderCount, pendingOrders, abandonedCount, recentOrders] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: "pending" } }),
    prisma.abandonedCheckout.count(),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { items: true } }),
  ])

  const stats = [
    { label: "Products", value: productCount, href: "/admin/products", icon: Package },
    { label: "Total Orders", value: orderCount, href: "/admin/orders", icon: ShoppingCart },
    { label: "Pending Orders", value: pendingOrders, href: "/admin/orders", icon: Timer, tone: pendingOrders > 0 ? "warning" as const : "default" as const },
    { label: "Abandoned Checkouts", value: abandonedCount, href: "/admin/abandoned", icon: ShoppingBag },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Main"
        title="Dashboard"
        description="A focused control room for Doshok catalog, orders, recovery, and settings."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} {...stat} />
        ))}
      </div>

      <AdminSectionCard title="Recent Orders" description="Latest customer activity that may need attention.">
        {recentOrders.length === 0 ? (
          <p className="text-sm text-neutral-500">No orders yet.</p>
        ) : (
          <AdminTableShell>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#fbfaf7] text-left text-xs uppercase tracking-[0.16em] text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{order.customerName}</p>
                      <p className="text-xs text-neutral-500">{order.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td className="px-4 py-3 font-bold">৳{order.total.toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{order.orderStatus}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="font-bold text-neutral-950 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableShell>
        )}
      </AdminSectionCard>
    </div>
  )
}
