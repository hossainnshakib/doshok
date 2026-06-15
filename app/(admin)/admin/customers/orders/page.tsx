import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { getPhoneDisplayE164 } from "@/lib/utils"

export default async function AdminCustomerOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  })

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customer Orders"
        description={`${orders.length} order${orders.length === 1 ? "" : "s"} linked to customer accounts.`}
        backHref="/admin/customers/list"
      />

      {orders.length === 0 ? (
        <AdminEmptyState title="No customer orders yet" description="Orders from registered customers will appear here." />
      ) : (
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Order</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Customer</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Total</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Payment</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell className="font-mono text-[11px] font-semibold text-slate-700">
                    <Link href={`/admin/orders/${order.id}`} className="hover:text-slate-900">{order.orderNumber}</Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-slate-800">{order.customerName}</div>
                    <div className="text-[10px] text-slate-400">{getPhoneDisplayE164(order.customerPhone)}</div>
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-800">৳{order.total.toLocaleString()}</TableCell>
                  <TableCell>
                    <AdminStatusBadge status={order.paymentStatus === "paid" ? "Paid" : "Pending"} type="payment" />
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge status={order.orderStatus} type="order" />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
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