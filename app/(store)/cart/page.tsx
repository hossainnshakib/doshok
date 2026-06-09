"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Trash2, ShoppingBag, ArrowLeft, Minus, Plus, Package, ShieldCheck } from "lucide-react"
import { getCart, updateCartQuantity, removeFromCart } from "@/lib/cart"
import type { CartItem } from "@/types"

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])

  function refresh() {
    const cart = getCart()
    setItems([...cart])
  }

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener("cart-update", handler)
    return () => window.removeEventListener("cart-update", handler)
  }, [])

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="container mx-auto container-px py-24 text-center max-w-md">
        <div className="w-24 h-24 bg-muted rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/60" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Add some products to get started.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Browse Products
          </Link>
          <Link
            href="/new-arrivals"
            className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-8 text-sm font-medium text-foreground hover:bg-accent transition-all"
          >
            New Arrivals
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto container-px py-8 md:py-12">
      <div className="flex items-center justify-between mb-6">
        <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Continue Shopping
        </Link>
        <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Your Cart</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">Shopping Cart</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <Card key={`${item.productId}-${item.variantId}`} className="overflow-hidden border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex gap-4 md:gap-5 p-4 md:p-5">
                {item.image && (
                  <Link href={`/products/${item.slug ?? item.productId}`} className="shrink-0">
                    <div className="w-24 h-24 md:w-28 md:h-28 bg-muted rounded-xl overflow-hidden transition-shadow hover:shadow-md">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/products/${item.slug ?? item.productId}`}
                      className="font-semibold text-sm md:text-base hover:text-primary transition-colors line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      {[item.size, item.color].filter(Boolean).join(" / ") || "One size"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-input rounded-xl overflow-hidden">
                      <button
                        className="h-9 w-10 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 active:bg-muted/80"
                        onClick={() => {
                          updateCartQuantity(item.productId, item.variantId, item.quantity - 1)
                          refresh()
                        }}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="flex h-9 w-10 items-center justify-center border-x border-input text-sm font-bold tabular-nums">{item.quantity}</span>
                      <button
                        className="h-9 w-10 flex items-center justify-center hover:bg-muted transition-colors active:bg-muted/80"
                        onClick={() => {
                          updateCartQuantity(item.productId, item.variantId, item.quantity + 1)
                          refresh()
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-sm md:text-base">৳{(item.price * item.quantity).toLocaleString()}</p>
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                        onClick={() => {
                          removeFromCart(item.productId, item.variantId)
                          refresh()
                        }}
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-border/50 rounded-2xl shadow-sm">
            <CardContent className="p-5 md:p-8 space-y-5">
              <h2 className="text-lg font-bold">Order Summary</h2>
              <Separator />
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>৳{subtotal.toLocaleString()}</span>
              </div>
              <Link
                href="/checkout"
                className="flex h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold w-full hover:bg-primary/90 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                Proceed to Checkout
              </Link>
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Secure checkout with OTP verification</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
