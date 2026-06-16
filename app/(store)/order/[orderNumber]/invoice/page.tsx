import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Printer } from "lucide-react"
import { getPhoneDisplayE164 } from "@/lib/utils"

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderNumber: string }>
}) {
  const { orderNumber } = await params

  // Fetch the order
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      address: true,
    },
  })

  if (!order) notFound()

  // Security check: must be authenticated
  const session = await auth()
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=/order/${orderNumber}/invoice`)
  }

  // Security check: admin can view any invoice, customer can only view their own
  if (session.user.role !== "admin" && order.userId && order.userId !== session.user.id) {
    notFound()
  }

  const invoiceDate = order.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <>
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .print-button {
            display: none;
          }
          .invoice-container {
            max-width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: none;
          }
        }
        
        @page {
          size: A4;
          margin: 10mm;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex justify-between items-center print:mb-4">
            <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">Invoice</h1>
            <Button
              onClick={() => window.print()}
              className="print-button rounded-full"
              variant="outline"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
          </div>

          <div className="invoice-container rounded-lg bg-white p-8 shadow-sm">
            {/* Header */}
            <div className="mb-8 flex justify-between border-b pb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Doshok</h2>
                <p className="text-sm text-gray-600">Premium Bangladeshi Fashion</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>
                  <span className="font-semibold text-gray-900">Invoice #</span>
                  <br />
                  <span className="font-mono text-lg font-bold text-gray-900">{order.orderNumber}</span>
                </p>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="mb-8 grid grid-cols-2 gap-8">
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
                  Invoice To
                </h3>
                <div className="text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">{order.customerName}</p>
                  <p>{getPhoneDisplayE164(order.customerPhone)}</p>
                  <p>{order.customerEmail}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
                  Invoice Details
                </h3>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-semibold text-gray-900">{invoiceDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {order.address && (
              <div className="mb-8">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
                  Delivery Address
                </h3>
                <div className="text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">{order.customerName}</p>
                  <p>{order.address.fullAddress}</p>
                  <p>
                    {order.address.thana}, {order.address.district}, {order.address.division}
                  </p>
                </div>
              </div>
            )}

            <Separator className="my-8" />

            {/* Items Table */}
            <div className="mb-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600">
                Order Items
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-900">Item</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-900">Qty</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900">Unit Price</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-3 px-2 text-gray-900">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {(item.size || item.color) && (
                            <p className="text-xs text-gray-500">
                              {[item.size, item.color].filter(Boolean).join(" / ")}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-700">{item.quantity}</td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        ৳{item.price.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-900">
                        ৳{(item.price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator className="my-8" />

            {/* Totals */}
            <div className="mb-8 flex justify-end">
              <div className="w-full max-w-sm">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">
                      ৳{order.subtotal.toLocaleString()}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-semibold">-৳{order.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-semibold text-gray-900">
                      ৳{order.deliveryFee.toLocaleString()}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">৳{order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Payment & Status */}
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <h3 className="mb-3 font-semibold uppercase tracking-wider text-gray-600">
                  Payment Information
                </h3>
                <div className="space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {order.paymentMethod === "cod"
                        ? "Cash on Delivery"
                        : order.paymentMethod.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {order.paymentStatus}
                    </span>
                  </div>
                  {order.paidAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid Amount:</span>
                      <span className="font-semibold text-green-600">
                        ৳{order.paidAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {order.dueAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Amount:</span>
                      <span className="font-semibold text-amber-600">
                        ৳{order.dueAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold uppercase tracking-wider text-gray-600">
                  Order Status
                </h3>
                <div className="space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {order.orderStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-semibold text-gray-900">
                      {invoiceDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Footer */}
            <div className="text-center text-xs text-gray-500">
              <p>Thank you for your business!</p>
              <p className="mt-2">
                For order support, contact us at hello@doshok.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
