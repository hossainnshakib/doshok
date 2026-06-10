import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { ArrowLeft } from "lucide-react"

export default async function AdminCustomerOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customer Orders"
        description={`${orders.length} order${orders.length === 1 ? "" : "s"} linked to customer accounts.`}
      />

      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Customers Hub
      </Link>

      {orders.length === 0 ? (
        <AdminEmptyState title="No customer orders yet" description="Orders from registered customers will appear here." />
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
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">{order.orderNumber}</Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">৳{order.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={order.paymentStatus === "paid" ? "Paid" : "Pending"} type="payment" />
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge status={order.orderStatus} type="order" />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {order.createdAt.toLocaleDateString()}
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