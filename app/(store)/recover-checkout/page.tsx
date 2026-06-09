import { Suspense } from "react"
import { RecoveryCheckoutClient } from "@/components/store/recovery-checkout-client"

export default function RecoverCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        Loading recovery link...
      </div>
    }>
      <RecoveryCheckoutClient />
    </Suspense>
  )
}
