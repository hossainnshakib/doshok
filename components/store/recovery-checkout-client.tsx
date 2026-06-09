"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DELIVERY_ZONE_NAMES } from "@/types"
import {
  ShoppingBag, Clock, AlertCircle, ArrowRight, XCircle, Package, User, MapPin, Tag,
} from "lucide-react"
import Link from "next/link"

type RecoveryData = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
  productId: string | null
  variantId: string | null
  quantity: number | null
  size: string | null
  color: string | null
  deliveryZone: string | null
  step: string
  couponCode: string | null
  subtotal: number
  discount: number
  total: number
  landingSlug: string | null
  source: string | null
  createdAt: string
  expiresAt: string
}

type RecoveryState = "loading" | "valid" | "invalid" | "expired" | "used"

export function RecoveryCheckoutClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [state, setState] = useState<RecoveryState>("loading")
  const [data, setData] = useState<RecoveryData | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setState("invalid")
      setErrorMessage("No recovery token provided.")
      return
    }

    fetch(`/api/recover-checkout?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setData(d.data)
          setState("valid")
        } else if (d.error?.toLowerCase().includes("expired")) {
          setState("expired")
          setErrorMessage(d.error)
        } else if (d.error?.toLowerCase().includes("used")) {
          setState("used")
          setErrorMessage(d.error)
        } else {
          setState("invalid")
          setErrorMessage(d.error ?? "Invalid recovery link")
        }
      })
      .catch(() => {
        setState("invalid")
        setErrorMessage("Something went wrong. Please try again.")
      })
  }, [token])

  if (state === "loading") {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="animate-pulse space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted" />
          <div className="mx-auto h-4 w-48 rounded bg-muted" />
          <div className="mx-auto h-3 w-32 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (state === "invalid" || state === "expired" || state === "used") {
    const icons = {
      invalid: <AlertCircle className="h-12 w-12 text-destructive" />,
      expired: <Clock className="h-12 w-12 text-amber-500" />,
      used: <XCircle className="h-12 w-12 text-muted-foreground" />,
    }
    const titles = {
      invalid: "Invalid Recovery Link",
      expired: "This Link Has Expired",
      used: "This Link Has Been Used",
    }
    const descriptions = {
      invalid: "The recovery link you used is not valid. Please contact the store for assistance.",
      expired: "Recovery links expire after 7 days. Please request a new one from the store.",
      used: "This recovery link was already used to place an order. Please contact the store if you need help.",
    }

    return (
      <div className="container mx-auto px-4 py-20 max-w-lg">
        <Card className="rounded-2xl border-destructive/20 shadow-sm">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex items-center justify-center">
              {icons[state]}
            </div>
            <h1 className="text-xl font-bold tracking-tight">{titles[state]}</h1>
            <p className="text-sm text-muted-foreground">{descriptions[state]}</p>
            {errorMessage && (
              <p className="text-xs text-muted-foreground/60">{errorMessage}</p>
            )}
            <div className="pt-2">
              <Link href="/" className="inline-flex h-9 items-center justify-center rounded-xl border border-input bg-background px-5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                Return to Store
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const zoneName = data.deliveryZone
    ? DELIVERY_ZONE_NAMES[data.deliveryZone as keyof typeof DELIVERY_ZONE_NAMES] || data.deliveryZone
    : null

  function handleContinue() {
    router.push(`/checkout?recoveryToken=${encodeURIComponent(token!)}`)
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-2xl">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <ShoppingBag className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">We Found Your Saved Checkout</h1>
        <p className="mt-2 text-muted-foreground">
          Your checkout information has been restored. Verify your details and continue where you left off.
        </p>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm mb-6">
        <CardContent className="p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">{data?.name || "Customer"}</p>
              <p className="text-xs text-muted-foreground">{data?.email || "No email"}{data?.phone ? ` · ${data.phone}` : ""}</p>
            </div>
          </div>

          {data?.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm">{data.address}</p>
                {zoneName && <p className="text-xs text-muted-foreground">{zoneName}</p>}
              </div>
            </div>
          )}

          <Separator />

          {(data?.productId || (data?.subtotal ?? 0) > 0) && (
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Order Summary</p>
                {(data?.subtotal ?? 0) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Subtotal: ৳{data.subtotal.toLocaleString()}
                    {data.discount > 0 && ` · Discount: -৳${data.discount.toLocaleString()}`}
                  </p>
                )}
                {data.total > 0 && (
                  <p className="text-base font-bold">Total: ৳{data.total.toLocaleString()}</p>
                )}
              </div>
            </div>
          )}

          {data?.couponCode && (
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm">Coupon: <span className="font-medium">{data.couponCode}</span></p>
            </div>
          )}

          {data?.quantity && (
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm">
                {data.productId ? "Product selected" : "Items in cart"}
                {data.quantity ? ` · Qty: ${data.quantity}` : ""}
                {data.size ? ` · Size: ${data.size}` : ""}
                {data.color ? ` · Color: ${data.color}` : ""}
              </p>
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Saved {data?.createdAt ? new Date(data.createdAt).toLocaleString() : ""}</span>
            <span className="ml-auto">
              Link expires {data?.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          size="lg"
          className="rounded-xl h-12 px-8 text-base gap-2"
          onClick={handleContinue}
        >
          Continue Checkout <ArrowRight className="h-4 w-4" />
        </Button>
        <Link
          href="/checkout"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-input bg-background px-8 text-base font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Start Fresh
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Phone verification will be required before placing the order.
      </p>
    </div>
  )
}
