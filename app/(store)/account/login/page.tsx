"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Phone, Search } from "lucide-react"

export default function AccountLoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phone.length < 11) {
      toast.error("Please enter a valid phone number")
      return
    }
    setLoading(true)
    localStorage.setItem("doshok_customer_phone", phone)
    toast.success("Signed in successfully")
    router.push("/account")
  }

  return (
    <div className="max-w-sm mx-auto py-20">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your phone number to view your orders.
        </p>
      </div>

      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  className="h-12 rounded-xl pl-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center mt-6">
        <p className="text-xs text-muted-foreground">
          Currently using phone-only login. OTP login coming soon.
        </p>
      </div>
    </div>
  )
}
