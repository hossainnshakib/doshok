import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UpdateOrderStatus } from "@/components/admin/update-order-status"
import { OrderShipment } from "@/components/admin/order-shipment"
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

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
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSectionCard title="Customer Details" description="Contact information and delivery address.">
          <div className="space-y-3 text-sm">
            {[
              ["Name", order.customerName],
              ["Email", order.customerEmail],
              ["Phone", order.customerPhone],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-20 text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            {order.address && (
              <>
                <Separator />
                {[
                  ["Division", order.address.division],
                  ["District", order.address.district],
                  ["Thana", order.address.thana],
                  ["Address", order.address.fullAddress],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Order Status" description="Fulfillment and payment status with safe inline updates.">
          <div className="flex flex-wrap gap-2 mb-4">
            <AdminStatusBadge status={order.paymentStatus} type="payment" />
            <AdminStatusBadge status={order.orderStatus} type="order" />
            <AdminStatusBadge status={order.paymentMethod.toUpperCase()} type="default" />
          </div>
          <div className="space-y-2 text-sm">
            {order.bkashTrxId && (
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">bKash TrxID</span>
                <span className="font-mono text-xs">{order.bkashTrxId}</span>
              </div>
            )}
            {order.transactions.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">Provider</span>
                <span className="font-mono text-xs">{order.transactions[0].provider}</span>
              </div>
            )}
            {order.paymentVerifiedAt && (
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">Verified At</span>
                <span className="text-xs">{order.paymentVerifiedAt.toLocaleString()}</span>
              </div>
            )}
            {order.paymentExpiresAt && order.paymentStatus === "pending" && (
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">Expires At</span>
                <span className="text-xs">{order.paymentExpiresAt.toLocaleString()}</span>
              </div>
            )}
            {order.transactions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-black/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1">Transactions</p>
                {order.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 text-xs">
                    <span className="font-mono">{tx.trxId}</span>
                    <AdminStatusBadge status={tx.status} />
                    {tx.verifiedAt && <span className="text-neutral-400">{tx.verifiedAt.toLocaleString()}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <UpdateOrderStatus orderId={order.id} currentOrderStatus={order.orderStatus} currentPaymentStatus={order.paymentStatus} />
        </AdminSectionCard>
      </div>

      <OrderShipment orderId={order.id} initialShipment={order.shipment} />

      <AdminSectionCard title="Items" description="Products ordered, variants, quantities, and order totals.">
        <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[item.size, item.color].filter(Boolean).join(" / ") || "-"}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">৳{item.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">৳{(item.price * item.quantity).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-black/5 px-4 py-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-medium">৳{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Delivery</span>
              <span className="font-medium">৳{order.deliveryFee.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Discount</span>
                <span className="font-medium text-green-600">-৳{order.discount.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-black">
              <span>Total</span>
              <span>৳{order.total.toLocaleString()}</span>
            </div>
            {order.paidAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Paid</span>
                <span className="font-medium">৳{order.paidAmount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </AdminTableShell>
      </AdminSectionCard>
    </div>
  )
}
