import { Suspense } from "react"
import type { Metadata } from "next"
import { CheckoutForm } from "@/components/store/checkout-form"

export const metadata: Metadata = {
  title: "Checkout – Doshok",
  description: "Secure checkout for your Doshok order. Cash on delivery and OTP verification available nationwide.",
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading checkout...</div>}>
      <CheckoutForm />
    </Suspense>
  )
}
