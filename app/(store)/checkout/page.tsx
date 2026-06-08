import { Suspense } from "react"
import { CheckoutForm } from "@/components/store/checkout-form"

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading checkout...</div>}>
      <CheckoutForm />
    </Suspense>
  )
}
