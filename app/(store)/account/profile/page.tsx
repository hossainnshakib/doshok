"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCustomerPhone } from "@/lib/customer"
import { User } from "lucide-react"

export default function AccountProfilePage() {
  const [phone, setPhone] = useState("")

  useEffect(() => {
    const p = getCustomerPhone()
    if (p) setPhone(p)
  }, [])

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-medium">Settings</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile</h1>
      </div>
      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-4 w-4" /> Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="bg-muted/30 rounded-xl p-4">
            <span className="text-muted-foreground text-xs">Phone Number</span>
            <p className="font-medium mt-0.5">{phone || "Not set"}</p>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Profile management and OTP login will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
