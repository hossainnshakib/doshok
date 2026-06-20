"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { AdminBackLink, AdminPageHeader } from "@/components/admin/admin-ui"

export default function NewCouponPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [discount, setDiscount] = useState("")
  const [type, setType] = useState("flat")
  const [scope, setScope] = useState("product")
  const [minOrder, setMinOrder] = useState("0")
  const [maxUses, setMaxUses] = useState("")
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        discount: Number(discount),
        type,
        scope,
        minOrder: Number(minOrder),
        maxUses: maxUses ? Number(maxUses) : undefined,
        maxUsesPerCustomer: maxUsesPerCustomer ? Number(maxUsesPerCustomer) : undefined,
        expiresAt: expiresAt || undefined,
        active,
      }),
    })
    const d = await res.json()
    if (d.success) {
      toast.success("Coupon created")
      router.push("/admin/coupons")
    } else {
      toast.error(d.error ?? "Failed")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <AdminPageHeader eyebrow="Commerce" title="New Coupon" description="Create a campaign-ready coupon for offers, launches, and limited-time promotions." />
      <AdminBackLink href="/admin/coupons" label="Back to Coupons" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="rounded-xl border-slate-200/60 shadow-sm">
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Coupon code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. SAVE20" className="font-mono uppercase" required />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="discount">Discount value</Label>
                <Input id="discount" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 20" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Discount type</Label>
                <Select value={type} onValueChange={(v) => v && setType(v)}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat (৳)</SelectItem>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scope">Scope</Label>
                <Select value={scope} onValueChange={(v) => v && setScope(v)}>
                  <SelectTrigger id="scope"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product Coupon</SelectItem>
                    <SelectItem value="delivery">Delivery Coupon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="minOrder">Minimum order (৳)</Label>
                <Input id="minOrder" type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxUses">Maximum uses <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
                <Input id="maxUses" type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="e.g. 100" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxUsesPerCustomer">Maximum uses per customer <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
              <Input id="maxUsesPerCustomer" type="number" value={maxUsesPerCustomer} onChange={(e) => setMaxUsesPerCustomer(e.target.value)} placeholder="e.g. 1" />
              <p className="text-[10px] text-slate-400">Leave blank for unlimited per-customer use.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiresAt">Expiry date <span className="text-slate-400 font-normal text-[10px]">(optional)</span></Label>
              <Input id="expiresAt" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>

            <div className="flex items-center gap-3">
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="active" className="text-xs font-medium text-slate-700">Active</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="h-9 rounded-lg px-5 text-xs font-semibold">
            {loading ? "Creating..." : "Create Coupon"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-9 rounded-lg px-4 text-xs font-semibold">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}