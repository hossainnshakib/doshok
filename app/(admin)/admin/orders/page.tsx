import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  shipped: "default",
  delivered: "outline",
  cancelled: "destructive",
}

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Sales" title="Orders" description={`${orders.length} total order${orders.length === 1 ? "" : "s"} across checkout and landing pages.`} />

      {orders.length === 0 ? (
        <AdminEmptyState title="No orders yet" description="Orders will appear here after customers complete checkout." />
      ) : (
      <AdminTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
              <TableCell>
                <div className="text-sm font-medium">{order.customerName}</div>
                <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
              </TableCell>
              <TableCell>{order.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
              <TableCell>৳{order.total.toLocaleString()}</TableCell>
              <TableCell>
                <AdminStatusBadge status={order.paymentStatus === "paid" ? "Paid" : "Pending"} type="payment" />
              </TableCell>
              <TableCell>
                <AdminStatusBadge status={order.orderStatus} type="order" />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {order.createdAt.toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium h-7 px-2.5 hover:bg-muted hover:text-foreground">View</Link>
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
