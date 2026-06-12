import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UpdateOrderStatus } from "@/components/admin/update-order-status"
import { OrderShipment } from "@/components/admin/order-shipment"
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPhoneDisplayE164 } from "@/lib/utils"

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
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Sales"
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${order.createdAt.toLocaleString()}. Review customer details, fulfillment status, and order totals.`}
        backHref="/admin/orders"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AdminSectionCard title="Customer Information" description="Contact details for this order.">
          <div className="space-y-2 text-xs">
            <div className="rounded-lg bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Name</p>
              <p className="font-semibold text-slate-800">{order.customerName}</p>
            </div>
            <div className="rounded-lg bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Email</p>
              <p className="font-medium text-slate-700">{order.customerEmail}</p>
            </div>
            <div className="rounded-lg bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Phone</p>
              <p className="font-mono font-semibold text-slate-800">{getPhoneDisplayE164(order.customerPhone)}</p>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Delivery Address" description="Where the order will be delivered.">
          {order.address ? (
            <div className="space-y-2 text-xs">
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Division</p>
                <p className="font-semibold text-slate-800">{order.address.division}</p>
              </div>
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">District</p>
                <p className="font-semibold text-slate-800">{order.address.district}</p>
              </div>
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Thana / Area</p>
                <p className="font-semibold text-slate-800">{order.address.thana}</p>
              </div>
              <div className="rounded-lg bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Full Address</p>
                <p className="font-medium text-slate-700">{order.address.fullAddress}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
              No delivery address recorded
            </div>
          )}
        </AdminSectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AdminSectionCard title="Payment & Order Status" description="Current fulfillment and payment status.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <AdminStatusBadge status={order.paymentStatus === "paid" ? "Paid" : "Pending"} type="payment" />
              <AdminStatusBadge status={order.orderStatus} type="order" />
              <AdminStatusBadge status={order.paymentMethod.toUpperCase()} type="default" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {order.bkashTrxId && (
                <div className="rounded-lg bg-slate-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">bKash TrxID</p>
                  <p className="font-mono text-[11px] font-bold text-slate-700">{order.bkashTrxId}</p>
                </div>
              )}
              {order.paymentVerifiedAt && (
                <div className="rounded-lg bg-emerald-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mb-1">Verified At</p>
                  <p className="text-[11px] text-slate-700">{order.paymentVerifiedAt.toLocaleString()}</p>
                </div>
              )}
              {order.paymentExpiresAt && order.paymentStatus === "pending" && (
                <div className="rounded-lg bg-amber-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1">Payment Expires</p>
                  <p className="text-[11px] text-slate-700">{order.paymentExpiresAt.toLocaleString()}</p>
                </div>
              )}
              {order.stockRestoredAt && (
                <div className="rounded-lg bg-slate-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Stock Restored</p>
                  <p className="text-[11px] text-slate-700">{order.stockRestoredAt.toLocaleString()}</p>
                </div>
              )}
            </div>
            <UpdateOrderStatus orderId={order.id} currentOrderStatus={order.orderStatus} currentPaymentStatus={order.paymentStatus} />
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Order Totals" description="Financial breakdown of the order.">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium tabular-nums text-slate-700">৳{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Delivery Fee</span>
              <span className="font-medium tabular-nums text-slate-700">৳{order.deliveryFee.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span className="font-semibold tabular-nums">-৳{order.discount.toLocaleString()}</span>
              </div>
            )}
            {order.couponCode && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Coupon Applied</span>
                <span className="font-mono font-bold text-slate-800">{order.couponCode}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="tabular-nums text-slate-900">৳{order.total.toLocaleString()}</span>
            </div>
            {order.paidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Paid Amount</span>
                <span className="font-medium tabular-nums text-slate-700">৳{order.paidAmount.toLocaleString()}</span>
              </div>
            )}
            {order.refundedAt && (
              <div className="flex justify-between text-red-500">
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
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Product</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Variant</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Qty</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Unit Price</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/60">
                  <TableCell className="text-xs font-semibold text-slate-800">{item.name}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {[item.size, item.color].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-600">{item.quantity}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-600">৳{item.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-800">৳{(item.price * item.quantity).toLocaleString()}</TableCell>
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
                <TableRow className="border-slate-100">
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Provider</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Transaction ID</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Verified At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-slate-50 hover:bg-slate-50/60">
                    <TableCell className="font-mono text-[11px] font-semibold text-slate-700">{tx.provider}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">{tx.trxId}</TableCell>
                    <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-800">৳{tx.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <AdminStatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
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