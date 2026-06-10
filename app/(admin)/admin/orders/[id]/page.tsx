import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UpdateOrderStatus } from "@/components/admin/update-order-status"
import { OrderShipment } from "@/components/admin/order-shipment"
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Code } from "lucide-react"

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      address: true,
      shipment: true,
      transactions: {
        orderBy: { verifiedAt: "desc" },
      },
    },
  })

  if (!order) notFound()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Sales"
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${order.createdAt.toLocaleString()}. Review customer details, fulfillment status, and order totals.`}
        backHref="/admin/orders"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSectionCard title="Customer Information" description="Contact details and delivery address for this order.">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Customer Name</p>
                <p className="mt-1 font-bold">{order.customerName}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Email</p>
                <p className="mt-1 font-medium">{order.customerEmail}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Phone</p>
                <p className="mt-1 font-mono font-medium">{order.customerPhone}</p>
              </div>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Delivery Address" description="Where the order will be delivered.">
          {order.address ? (
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Division</p>
                <p className="mt-1 font-medium">{order.address.division}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">District</p>
                <p className="mt-1 font-medium">{order.address.district}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Thana / Area</p>
                <p className="mt-1 font-medium">{order.address.thana}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Full Address</p>
                <p className="mt-1 font-medium">{order.address.fullAddress}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-muted-foreground">
              No delivery address recorded
            </div>
          )}
        </AdminSectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSectionCard title="Payment & Order Status" description="Current fulfillment and payment status.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <AdminStatusBadge status={order.paymentStatus === "paid" ? "Paid" : "Pending"} type="payment" />
              <AdminStatusBadge status={order.orderStatus} type="order" />
              <AdminStatusBadge status={order.paymentMethod.toUpperCase()} type="default" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {order.bkashTrxId && (
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">bKash TrxID</p>
                  <p className="mt-1 font-mono text-xs font-bold">{order.bkashTrxId}</p>
                </div>
              )}
              {order.paymentVerifiedAt && (
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">Verified At</p>
                  <p className="mt-1 text-xs">{order.paymentVerifiedAt.toLocaleString()}</p>
                </div>
              )}
              {order.paymentExpiresAt && order.paymentStatus === "pending" && (
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600">Payment Expires</p>
                  <p className="mt-1 text-xs">{order.paymentExpiresAt.toLocaleString()}</p>
                </div>
              )}
              {order.stockRestoredAt && (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">Stock Restored</p>
                  <p className="mt-1 text-xs">{order.stockRestoredAt.toLocaleString()}</p>
                </div>
              )}
            </div>
            <UpdateOrderStatus orderId={order.id} currentOrderStatus={order.orderStatus} currentPaymentStatus={order.paymentStatus} />
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Order Totals" description="Financial breakdown of the order.">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-medium tabular-nums">৳{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Delivery Fee</span>
              <span className="font-medium tabular-nums">৳{order.deliveryFee.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="font-medium tabular-nums">-৳{order.discount.toLocaleString()}</span>
              </div>
            )}
            {order.couponCode && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Coupon Applied</span>
                <span className="font-mono font-bold">{order.couponCode}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-black">
              <span>Total</span>
              <span className="tabular-nums">৳{order.total.toLocaleString()}</span>
            </div>
            {order.paidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Paid Amount</span>
                <span className="font-medium tabular-nums">৳{order.paidAmount.toLocaleString()}</span>
              </div>
            )}
            {order.refundedAt && (
              <div className="flex justify-between text-destructive">
                <span>Refunded</span>
                <span className="font-medium tabular-nums">৳{order.refundAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </AdminSectionCard>
      </div>

      <OrderShipment orderId={order.id} initialShipment={order.shipment} />

      <AdminSectionCard title="Order Items" description="Products ordered, variants, quantities, and line totals.">
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[item.size, item.color].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">৳{item.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">৳{(item.price * item.quantity).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTableShell>
      </AdminSectionCard>

      {order.transactions.length > 0 && (
        <AdminSectionCard title="Payment Transactions" description="Payment gateway transaction history for this order.">
          <AdminTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-sm">{tx.provider}</TableCell>
                    <TableCell className="font-mono text-xs">{tx.trxId}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">৳{tx.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <AdminStatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.verifiedAt ? tx.verifiedAt.toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTableShell>
        </AdminSectionCard>
      )}
    </div>
  )
}
