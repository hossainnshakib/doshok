import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { success, error } from "@/lib/api-response"
import { generateOrderNumber } from "@/lib/order-number"
import { getDeliveryFee } from "@/lib/delivery"
import { checkoutSchema } from "@/lib/validations"
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "@/lib/mailer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input")

    const { items, deliveryZone, paymentMethod, couponCode, ...customer } = parsed.data

    if (paymentMethod !== "cod") {
      return error("Online payment is setup-ready but not yet active. Please select Cash on Delivery.")
    }

    const deliveryFee = await getDeliveryFee(deliveryZone)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const orderNumber = await generateOrderNumber()

    let discount = 0
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
      if (!coupon) return error("Coupon not found")
      if (!coupon.active) return error("Coupon is inactive")
      if (coupon.usedCount >= (coupon.maxUses ?? Infinity)) return error("Coupon usage limit reached")
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return error("Coupon has expired")
      if (subtotal < coupon.minOrder) return error(`Minimum order amount is ৳${coupon.minOrder.toLocaleString()}`)

      if (coupon.type === "percent") {
        discount = Math.round(subtotal * coupon.discount / 100)
      } else {
        discount = Math.min(coupon.discount, subtotal)
      }
    }

    const total = subtotal + deliveryFee - discount

    const productIds = [...new Set(items.map((i) => i.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p.name]))

    const variantIds = items.map((i) => i.variantId).filter(Boolean) as string[]
    const variants = variantIds.length > 0
      ? await prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
        })
      : []
    const variantMap = new Map(variants.map((v) => [v.id, v]))

    for (const item of items) {
      if (item.variantId) {
        const variant = variantMap.get(item.variantId)
        if (!variant) return error(`Variant not found for item in product ${productMap.get(item.productId) || item.productId}`)
        if (variant.stock < item.quantity) {
          return error(
            `Insufficient stock for "${productMap.get(item.productId) || "Product"}". Available: ${variant.stock}, requested: ${item.quantity}`
          )
        }
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
          if (!variant) throw new Error(`Variant not found: ${item.variantId}`)
          if (variant.stock < item.quantity) {
            throw new Error(
              `Insufficient stock for "${productMap.get(item.productId) || "Product"}". Available: ${variant.stock}, requested: ${item.quantity}`
            )
          }
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          })
        }
      }

      if (couponCode && discount > 0) {
        await tx.coupon.update({
          where: { code: couponCode.toUpperCase() },
          data: { usedCount: { increment: 1 } },
        })
      }

      return tx.order.create({
        data: {
          orderNumber,
          customerName: customer.name,
          customerEmail: customer.email || "",
          customerPhone: customer.phone,
          subtotal,
          deliveryFee,
          total,
          paidAmount: 0,
          paymentMethod,
          paymentStatus: "pending",
          orderStatus: "pending",
          couponCode: couponCode || null,
          address: {
            create: {
              division: customer.division,
              district: customer.district,
              thana: customer.thana,
              fullAddress: customer.fullAddress,
              phone: customer.phone,
            },
          },
          items: {
            create: items.map((item) => {
              const variant = item.variantId ? variantMap.get(item.variantId) : undefined
              return {
                productId: item.productId,
                variantId: item.variantId,
                name: productMap.get(item.productId) ?? "",
                size: variant?.size ?? null,
                color: variant?.color ?? null,
                quantity: item.quantity,
                price: item.price,
              }
            }),
          },
        },
        include: { items: true, address: true },
      })
    })

    sendOrderConfirmationEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      total: order.total,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
      })),
    }).catch(() => {})

    sendAdminNewOrderEmail({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      total: order.total,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
      })),
    }).catch(() => {})

    return success({ order }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order"
    return error(message)
  }
}
