import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { UpdateOrderStatus } from "@/components/admin/update-order-status"
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge, AdminTableShell } from "@/components/admin/admin-ui"

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, address: true },
  })

  if (!order) notFound()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Sales"
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${order.createdAt.toLocaleString()}. Review customer, fulfillment, and totals.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSectionCard title="Customer Details" description="Customer contact and delivery address.">
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {order.customerName}</div>
            <div><span className="font-medium">Email:</span> {order.customerEmail}</div>
            <div><span className="font-medium">Phone:</span> {order.customerPhone}</div>
            {order.address && (
              <>
                <Separator />
                <div><span className="font-medium">Division:</span> {order.address.division}</div>
                <div><span className="font-medium">District:</span> {order.address.district}</div>
                <div><span className="font-medium">Thana:</span> {order.address.thana}</div>
                <div><span className="font-medium">Address:</span> {order.address.fullAddress}</div>
              </>
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard title="Order Status" description="Update fulfillment and payment status safely.">
            <div className="flex gap-2">
              <AdminStatusBadge status={`Payment: ${order.paymentStatus}`} />
              <AdminStatusBadge status={`Status: ${order.orderStatus}`} />
            </div>
            {order.bkashTrxId && (
              <div className="text-sm">
                <span className="font-medium">bKash TrxID:</span> {order.bkashTrxId}
              </div>
            )}
            <UpdateOrderStatus orderId={order.id} currentOrderStatus={order.orderStatus} currentPaymentStatus={order.paymentStatus} />
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Items" description="Products, variants, quantities, and order totals.">
          <AdminTableShell>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Product</th>
                <th className="text-left py-2 font-medium">Variant</th>
                <th className="text-right py-2 font-medium">Qty</th>
                <th className="text-right py-2 font-medium">Price</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-muted-foreground">
                    {[item.size, item.color].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">৳{item.price.toLocaleString()}</td>
                  <td className="py-2 text-right">৳{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td colSpan={4} className="py-2 text-right">Subtotal</td>
                <td className="py-2 text-right">৳{order.subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan={4} className="py-1 text-right text-muted-foreground">Delivery</td>
                <td className="py-1 text-right">৳{order.deliveryFee.toLocaleString()}</td>
              </tr>
              {order.discount > 0 && (
                <tr>
                  <td colSpan={4} className="py-1 text-right text-muted-foreground">Discount</td>
                  <td className="py-1 text-right">-৳{order.discount.toLocaleString()}</td>
                </tr>
              )}
              <tr className="border-t font-bold">
                <td colSpan={4} className="py-2 text-right">Total</td>
                <td className="py-2 text-right">৳{order.total.toLocaleString()}</td>
              </tr>
              {order.paidAmount > 0 && (
                <tr>
                  <td colSpan={4} className="py-1 text-right text-muted-foreground">Paid</td>
                  <td className="py-1 text-right">৳{order.paidAmount.toLocaleString()}</td>
                </tr>
              )}
            </tfoot>
          </table>
          </AdminTableShell>
      </AdminSectionCard>
    </div>
  )
}
