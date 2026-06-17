"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { setCart } from "@/lib/cart"
import {
  ABANDONED_CHECKOUT_TOKEN_KEY,
  saveCheckoutPersistence,
} from "@/lib/checkout/checkout-persistence"
import type { CartItem, DeliveryZone } from "@/types"

type RecoveryResponse = {
  token: string
  cartItems: CartItem[]
  checkoutData: {
    customer?: {
      name?: string
      email?: string
      phone?: string
    } | null
    address?: {
      divisionId?: string
      divisionName?: string
      districtId?: string
      districtName?: string
      upazilaId?: string
      upazilaName?: string
      address?: string
      notes?: string
      deliveryZone?: string
    } | null
    checkout?: {
      selectedAddressId?: string | null
      currentStep?: number
      couponCode?: string
    } | null
  } | null
}

function isCartItem(item: CartItem): boolean {
  return Boolean(item?.productId && item?.name && Number.isFinite(item.price) && Number.isFinite(item.quantity))
}

export function RecoverCheckoutClient({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function recover() {
      try {
        const res = await fetch(`/api/checkout/abandoned/${encodeURIComponent(token)}`, {
          cache: "no-store",
        })
        const json = await res.json()
        if (!json.success) {
          throw new Error(json.error ?? "Recovery link is no longer available.")
        }

        const data = json.data as RecoveryResponse
        const cartItems = Array.isArray(data.cartItems) ? data.cartItems.filter(isCartItem) : []
        if (cartItems.length === 0) {
          throw new Error("This recovery link does not contain cart items.")
        }

        setCart(cartItems)
        window.dispatchEvent(new Event("cart-update"))
        localStorage.setItem(ABANDONED_CHECKOUT_TOKEN_KEY, data.token)

        const checkoutData = data.checkoutData
        saveCheckoutPersistence({
          customer: checkoutData?.customer
            ? {
                name: checkoutData.customer.name ?? "",
                email: checkoutData.customer.email ?? "",
                phone: checkoutData.customer.phone ?? "",
              }
            : null,
          address: checkoutData?.address
            ? {
                divisionId: checkoutData.address.divisionId ?? "",
                divisionName: checkoutData.address.divisionName ?? "",
                districtId: checkoutData.address.districtId ?? "",
                districtName: checkoutData.address.districtName ?? "",
                upazilaId: checkoutData.address.upazilaId ?? "",
                upazilaName: checkoutData.address.upazilaName ?? "",
                address: checkoutData.address.address ?? "",
                notes: checkoutData.address.notes ?? "",
                deliveryZone: checkoutData.address.deliveryZone ?? ("dhaka" satisfies DeliveryZone),
              }
            : null,
          checkout: {
            selectedAddressId: checkoutData?.checkout?.selectedAddressId ?? null,
            paymentMethod: "cod",
            currentStep: checkoutData?.checkout?.currentStep ?? 0,
            couponCode: checkoutData?.checkout?.couponCode ?? "",
          },
          cart: {
            itemIds: cartItems.map((item) => item.variantId ? `${item.productId}:${item.variantId}` : item.productId),
            quantitySnapshot: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            timestamp: new Date().toISOString(),
          },
        })

        await fetch(`/api/checkout/abandoned/${encodeURIComponent(token)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "recovered", lastStep: "recovered" }),
        }).catch(() => {})

        if (!cancelled) router.replace("/checkout")
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to recover checkout.")
      }
    }

    recover()

    return () => {
      cancelled = true
    }
  }, [router, token])

  return (
    <main className="container mx-auto max-w-lg px-4 py-20 text-center">
      {error ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-950">Checkout link unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <Button className="mt-5 rounded-lg" onClick={() => router.replace("/cart")}>
            Go to cart
          </Button>
        </div>
      ) : (
        <div className="text-sm font-medium text-muted-foreground">Restoring your checkout...</div>
      )}
    </main>
  )
}
